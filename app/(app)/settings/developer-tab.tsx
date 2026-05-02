"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff, Loader2, Database, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const DEV_FORCE_FAIL_KEY = "formwise_dev_force_fail_provider"
const DEV_DEBUG_PROMPT_KEY = "formwise_dev_debug_prompt"

interface EnvEntry {
  key: string
  set: boolean
  value?: string
  masked?: string
  length?: number
  sensitive: boolean
}

interface DiagnosticCheck {
  id: string
  label: string
  ok: boolean
  detail?: string
}

export function DeveloperTab() {
  const [env, setEnv] = useState<EnvEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({})
  const [forceFailProvider, setForceFailProvider] = useState<string>("")
  const [diagnostic, setDiagnostic] = useState<{
    ok: boolean
    configured: boolean
    checks: DiagnosticCheck[]
    hint?: string
  } | null>(null)
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [debugPrompt, setDebugPrompt] = useState(false)

  useEffect(() => {
    fetch("/api/settings/env")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => setEnv(data.entries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    setForceFailProvider(localStorage.getItem(DEV_FORCE_FAIL_KEY) || "")
    setDebugPrompt(localStorage.getItem(DEV_DEBUG_PROMPT_KEY) === "true")
  }, [])

  const runDiagnostic = async () => {
    setDiagnosticLoading(true)
    try {
      const res = await fetch("/api/settings/supabase-diagnostic")
      const data = await res.json()
      setDiagnostic(data)
      if (data.ok) {
        toast.success("Supabase setup looks good")
      } else {
        toast.warning("Some Supabase checks failed — see results below")
      }
    } catch (err) {
      toast.error("Diagnostic failed")
    } finally {
      setDiagnosticLoading(false)
    }
  }

  const handleForceFail = (value: string) => {
    setForceFailProvider(value)
    if (value) localStorage.setItem(DEV_FORCE_FAIL_KEY, value)
    else localStorage.removeItem(DEV_FORCE_FAIL_KEY)
    toast.info(
      value
        ? `Routes that send "x-force-fail-provider: ${value}" header now simulate failure for that provider.`
        : "Force-fail disabled.",
    )
  }

  const handleDebugPrompt = (value: boolean) => {
    setDebugPrompt(value)
    localStorage.setItem(DEV_DEBUG_PROMPT_KEY, String(value))
    toast.info(
      value
        ? "Ask requests will now include `debugPrompt: true` and return the assembled prompt without calling the LLM."
        : "Debug prompt disabled.",
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Developer mode
          </CardTitle>
          <CardDescription>
            Visible because <code>NODE_ENV=development</code> or{" "}
            <code>NEXT_PUBLIC_DEV_SETTINGS=true</code>. Hide this tab in production by
            unsetting both flags. In production, the <code>/api/settings/env</code>{" "}
            endpoint also returns 403.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Supabase diagnostic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase setup diagnostic
          </CardTitle>
          <CardDescription>
            One-click verification of your Supabase project: env vars, table
            existence, RPC registration, and trigger health.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={runDiagnostic}
            disabled={diagnosticLoading}
            className="gap-2"
          >
            {diagnosticLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run diagnostic
          </Button>

          {diagnostic && (
            <div className="space-y-2">
              {diagnostic.checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-3 rounded-md border bg-card px-3 py-2 text-xs"
                >
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{check.label}</p>
                    {check.detail && (
                      <p className="text-muted-foreground font-mono text-[11px] mt-0.5 break-all">
                        {check.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {diagnostic.hint && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  💡 {diagnostic.hint}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            Server-rendered snapshot. Sensitive values are masked unless explicitly revealed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {error}
            </div>
          )}
          {env && (
            <div className="space-y-1 font-mono text-xs">
              {env.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.set ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-semibold">{entry.key}</span>
                    {entry.sensitive && (
                      <Badge variant="outline" className="text-[9px] uppercase">
                        sensitive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.set ? (
                      entry.sensitive ? (
                        <>
                          <span className="text-muted-foreground truncate max-w-[180px] sm:max-w-[280px]">
                            {revealKey[entry.key] ? entry.masked : "•••••••••"}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            (len {entry.length})
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              setRevealKey((prev) => ({
                                ...prev,
                                [entry.key]: !prev[entry.key],
                              }))
                            }
                          >
                            {revealKey[entry.key] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-[320px]">
                          {entry.value}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">unset</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Force-fail */}
      <Card>
        <CardHeader>
          <CardTitle>Force-fail provider</CardTitle>
          <CardDescription>
            Tells the router to simulate a failure for the chosen provider, so you can
            verify the fallback chain works. Stored in localStorage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["", "sirma", "anthropic", "openai", "google", "cohere", "ollama"] as const).map(
              (p) => (
                <Button
                  key={p || "off"}
                  variant={forceFailProvider === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleForceFail(p)}
                >
                  {p || "off"}
                </Button>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Note: actual force-fail behavior is wired up only on routes that read this
            header. Use this to test the router fallback chain without revoking real
            API keys.
          </p>
        </CardContent>
      </Card>

      {/* Debug prompt toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Debug prompt mode</CardTitle>
          <CardDescription>
            When ON, /api/ask returns the assembled prompt instead of calling the LLM.
            Useful for verifying RAG context, system prompt, and turn classification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="debug-prompt">Send debugPrompt:true on Ask requests</Label>
            <Switch
              id="debug-prompt"
              checked={debugPrompt}
              onCheckedChange={handleDebugPrompt}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Phase reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap reminders</CardTitle>
          <CardDescription>What's still ahead.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <Badge variant="outline" className="mr-2">Phase 2</Badge>
              Real backend auth with Supabase, server-side sessions, DB-backed prefs.
            </li>
            <li>
              <Badge variant="outline" className="mr-2">Phase 3</Badge>
              Rate limit (Upstash), security headers, CSRF, PII redaction, audit log.
            </li>
            <li>
              <Badge variant="outline" className="mr-2">Phase 4</Badge>
              LemonSqueezy billing, plan-gated quotas, paywall middleware.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
