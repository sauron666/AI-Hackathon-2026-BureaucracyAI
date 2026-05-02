"use client"

import { useEffect } from "react"

/**
 * Registers the service worker once after first load.
 * Only in production — dev mode + HMR + service workers don't mix well.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // Wait for window load so we don't compete with critical resources.
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("SW registration failed:", err)
        })
    }

    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })

    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
