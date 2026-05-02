"use client"

/**
 * Lightweight PostHog telemetry client.
 *
 * Why we don't use the official posthog-js package:
 *   - Adds ~120KB to first paint.
 *   - Sends a lot by default (autocapture clicks, page leaves, etc) which
 *     would need careful configuration to avoid PII.
 *
 * What this module does:
 *   - Sends explicit events to /capture endpoint via fetch (no SDK).
 *   - Honors the user's telemetry opt-out from Settings → Privacy.
 *   - Automatically strips event.properties through PII redaction.
 *   - No autocapture. Only events you explicitly trigger.
 *
 * To use:
 *   1. Set NEXT_PUBLIC_POSTHOG_KEY + (optional) NEXT_PUBLIC_POSTHOG_HOST.
 *   2. Call track("event_name", { foo: "bar" }) anywhere in client code.
 */

const TELEMETRY_KEY = "formwise_telemetry"

function isOptedOut(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(TELEMETRY_KEY) === "false"
}

function redactValue(v: unknown): unknown {
  if (typeof v === "string") {
    return v
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]")
      .replace(/\+\d[\d\s\-().]{6,16}\d/g, "[phone]")
  }
  return v
}

function redactProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (/^(email|password|token|secret|api[_-]?key)/i.test(k)) {
      out[k] = "[redacted]"
    } else {
      out[k] = redactValue(v)
    }
  }
  return out
}

function getDistinctId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem("formwise_telemetry_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("formwise_telemetry_id", id)
  }
  return id
}

/** Send a capture event. Returns immediately (fire-and-forget). */
export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  if (isOptedOut()) return

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"

  const body = {
    api_key: apiKey,
    event,
    distinct_id: getDistinctId(),
    properties: {
      ...redactProps(properties),
      $current_url: window.location.href,
      $pathname: window.location.pathname,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    },
    timestamp: new Date().toISOString(),
  }

  // Use sendBeacon when available so the request survives page navigation.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${host}/capture/`,
        new Blob([JSON.stringify(body)], { type: "application/json" }),
      )
      return
    }
  } catch {
    // fall through to fetch
  }

  fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Silently ignore — telemetry must never break user flows.
  })
}

/** Convenience: track a question submission (no question text, just metadata). */
export function trackQuestionSubmitted(country: string, language: string): void {
  track("question_submitted", { country, language })
}

/** Convenience: track an upgrade click. */
export function trackUpgradeClicked(targetPlan: string): void {
  track("upgrade_clicked", { target_plan: targetPlan })
}
