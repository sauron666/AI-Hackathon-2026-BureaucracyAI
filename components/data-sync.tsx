"use client"

import { useDataSync } from "@/lib/sync/use-data-sync"

/**
 * Headless component that triggers the one-time localStorage → DB migration
 * after login. Mount once at the Providers level.
 */
export function DataSync() {
  useDataSync()
  return null
}
