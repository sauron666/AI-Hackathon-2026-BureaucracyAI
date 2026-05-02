"use client"

/**
 * CsrfFetchInterceptor — wraps the global `fetch` so every same-origin
 * mutating request (POST/PUT/PATCH/DELETE) automatically gets the
 * `x-csrf-token` header copied from the `fw_csrf` cookie.
 *
 * Idempotent: re-mounting the component is safe; we only patch once.
 *
 * Why monkey-patch instead of changing every call site?
 * Two reasons:
 *   1. We have ~30+ fetch calls scattered across hooks and pages.
 *   2. Easier to upgrade later — drop the interceptor when migrating to
 *      a single API client (e.g. Supabase RPC or tRPC).
 */

import { useEffect } from "react"

declare global {
  interface Window {
    __fwCsrfPatched?: boolean
  }
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)fw_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function shouldAttachToken(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false

  // Same-origin only
  let urlString: string
  if (typeof input === "string") urlString = input
  else if (input instanceof URL) urlString = input.toString()
  else urlString = input.url

  try {
    // Relative URL → same-origin by definition
    if (urlString.startsWith("/")) return true
    const parsed = new URL(urlString, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}

export function CsrfFetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.__fwCsrfPatched) return
    window.__fwCsrfPatched = true

    const originalFetch = window.fetch.bind(window)

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldAttachToken(input, init)) {
        return originalFetch(input, init)
      }

      const token = readCsrfCookie()
      if (!token) return originalFetch(input, init)

      // Build new headers without mutating the caller's object.
      const headers = new Headers(init?.headers)
      // If the caller already supplied an x-csrf-token (e.g. test suite),
      // do not overwrite it.
      if (!headers.has("x-csrf-token")) {
        headers.set("x-csrf-token", token)
      }

      return originalFetch(input, { ...init, headers })
    }) as typeof fetch
  }, [])

  return null
}
