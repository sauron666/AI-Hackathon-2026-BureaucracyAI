"use client"

/**
 * Trial context.
 *
 * Phase 2 wires this to the server (`/api/trial`) which counts uses by
 * hashed IP. The localStorage cache remains as a UX hint so the UI knows
 * the trial state without a roundtrip on every render.
 *
 * When Supabase is not configured, /api/trial responds with canUse=true
 * unconditionally — the localStorage check then becomes the only gate,
 * matching the previous behavior. This keeps the demo working even
 * without a backend.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/lib/auth/context"

interface TrialContextType {
  usedTrial: boolean
  canUseFreeTrial: boolean
  remaining: number
  maxUses: number
  authenticated: boolean
  markTrialUsed: () => Promise<void>
  refresh: () => Promise<void>
  resetTrial: () => void
}

const TrialContext = createContext<TrialContextType | undefined>(undefined)

const TRIAL_STORAGE_KEY = "formwise_trial_used"

export function TrialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [usedCount, setUsedCount] = useState(0)
  const [remaining, setRemaining] = useState(1)
  const [maxUses, setMaxUses] = useState(1)
  const [authenticated, setAuthenticated] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/trial", { method: "GET" })
      if (res.ok) {
        const data = await res.json()
        setUsedCount(data.usedCount ?? 0)
        setRemaining(data.remaining ?? 1)
        setMaxUses(data.max ?? 1)
        setAuthenticated(Boolean(data.authenticated))
      }
    } catch {
      // Network or server error — fall back to localStorage hint
      const stored = localStorage.getItem(TRIAL_STORAGE_KEY)
      const c = stored ? parseInt(stored, 10) : 0
      setUsedCount(c)
      setRemaining(Math.max(0, 1 - c))
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, user])

  const markTrialUsed = useCallback(async () => {
    if (user) return // logged-in users bypass trial

    try {
      const res = await fetch("/api/trial", { method: "POST" })
      if (res.ok || res.status === 429) {
        const data = await res.json()
        setUsedCount(data.usedCount ?? usedCount + 1)
        setRemaining(data.remaining ?? Math.max(0, remaining - 1))
        setMaxUses(data.max ?? maxUses)
      }
    } catch {
      // ignore network errors; localStorage will pick up the slack
    }

    // Always update the localStorage hint so the UI updates instantly.
    const c = (Number(localStorage.getItem(TRIAL_STORAGE_KEY)) || 0) + 1
    localStorage.setItem(TRIAL_STORAGE_KEY, String(c))
  }, [user, usedCount, remaining, maxUses])

  const resetTrial = useCallback(() => {
    localStorage.removeItem(TRIAL_STORAGE_KEY)
    setUsedCount(0)
    setRemaining(maxUses)
  }, [maxUses])

  // Client-side gate: trust whichever signal says "used"
  const localUsed = isLoaded
    ? Number(typeof window !== "undefined" ? localStorage.getItem(TRIAL_STORAGE_KEY) : 0) >=
      maxUses
    : false
  const usedTrial = !authenticated && (localUsed || remaining <= 0)
  const canUseFreeTrial = !usedTrial || Boolean(user)

  if (!isLoaded) return null

  return (
    <TrialContext.Provider
      value={{
        usedTrial,
        canUseFreeTrial,
        remaining,
        maxUses,
        authenticated,
        markTrialUsed,
        refresh,
        resetTrial,
      }}
    >
      {children}
    </TrialContext.Provider>
  )
}

export function useTrial() {
  const context = useContext(TrialContext)
  if (context === undefined) {
    throw new Error("useTrial must be used within a TrialProvider")
  }
  return context
}
