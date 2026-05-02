"use client"

/**
 * useDataSync — runs once after login to push localStorage data to the DB.
 *
 * Strategy:
 *   1. On mount, check if (user && !synced-flag-for-this-user-id).
 *   2. If yes, gather localStorage data and POST to /api/migrate.
 *   3. On success, set the synced flag so we never spam the endpoint.
 *   4. Show a toast with how many items were imported.
 *
 * The hook does NOT replace the existing localStorage hooks — those continue
 * to be the source of truth for the UI in this phase. The DB acts as a
 * durable mirror so data survives device changes. A future phase will flip
 * the source-of-truth direction (DB primary, localStorage cache).
 */

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"

const SYNC_FLAG_PREFIX = "formwise_synced_"
const HISTORY_KEY = "formwise-question-history"
const PROCESSES_KEY = "formwise-user-processes"

export function useDataSync() {
  const { user, backend, isLoading } = useAuth()
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (backend !== "supabase") return // local-only mode → nothing to sync

    const flagKey = `${SYNC_FLAG_PREFIX}${user.id}`
    if (typeof window === "undefined") return
    if (localStorage.getItem(flagKey)) return
    if (hasRunRef.current) return
    hasRunRef.current = true

    void runMigration(flagKey)
  }, [user, backend, isLoading])
}

async function runMigration(flagKey: string) {
  const history = readJSON(HISTORY_KEY)
  const processes = readJSON(PROCESSES_KEY)

  if (history.length === 0 && processes.length === 0) {
    // Nothing to migrate — still set the flag so we don't keep checking.
    localStorage.setItem(flagKey, new Date().toISOString())
    return
  }

  try {
    const res = await fetch("/api/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, processes }),
    })

    if (!res.ok && res.status !== 207) {
      console.warn("Data sync failed:", await res.text())
      return
    }

    const data = await res.json()
    localStorage.setItem(flagKey, new Date().toISOString())

    const totalImported =
      (data.historyInserted ?? 0) + (data.processesInserted ?? 0)

    if (totalImported > 0) {
      toast.success(
        `Imported ${totalImported} item${totalImported === 1 ? "" : "s"} from this device`,
        {
          description: `${data.historyInserted ?? 0} questions, ${data.processesInserted ?? 0} processes`,
        },
      )
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
      console.warn("Partial migration:", data.errors)
    }
  } catch (err) {
    console.warn("Data sync request failed:", err)
    // Don't set the flag — next mount will retry.
  }
}

function readJSON(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
