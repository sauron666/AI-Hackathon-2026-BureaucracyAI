"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  RotateCcw,
  Zap,
  AlertTriangle,
} from "lucide-react"

type AIProviderId =
  | "sirma"
  | "anthropic"
  | "openai"
  | "google"
  | "cohere"
  | "ollama"

interface ProviderInfo {
  id: AIProviderId
  displayName: string
  defaultModel: string
  availableModels: Array<{ id: string; label: string; notes?: string }>
  configured: boolean
  health: {
    status: "ok" | "unconfigured" | "unreachable"
    configured: boolean
    reachable: boolean
    reason?: string
  }
}

interface Preferences {
  provider?: AIProviderId
  model?: string
  temperature?: number
  maxTokens?: number
  systemPromptOverride?: string
  fallbackChain?: AIProviderId[]
}

export function AIModelsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<AIProviderId | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string; latencyMs?: number }>
  >({})

  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [envDefault, setEnvDefault] = useState<AIProviderId>("sirma")

  const [prefs, setPrefs] = useState<Preferences>({})
  const [originalPrefs, setOriginalPrefs] = useState<Preferences>({})

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/providers").then((r) => r.json()),
      fetch("/api/settings/preferences").then((r) => r.json()),
    ])
      .then(([providersData, prefsData]) => {
        setProviders(providersData.providers as ProviderInfo[])
        setEnvDefault(providersData.envDefault as AIProviderId)
        setPrefs(prefsData.preferences || {})
        setOriginalPrefs(prefsData.preferences || {})
      })
      .catch((err) => {
        console.error(err)
        toast.error("Failed to load provider info")
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedProvider = useMemo(() => {
    const id = prefs.provider || envDefault
    return providers.find((p) => p.id === id)
  }, [prefs.provider, envDefault, providers])

  const isDirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(originalPrefs),
    [prefs, originalPrefs],
  )

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      if (value === undefined || value === null || value === "") {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: value }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Save failed")
      }
      const data = await res.json()
      setOriginalPrefs(data.preferences || {})
      toast.success("Preferences saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/preferences", { method: "DELETE" })
      setPrefs({})
      setOriginalPrefs({})
      toast.success("Reverted to environment defaults")
    } catch (err) {
      toast.error("Reset failed")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (providerId: AIProviderId, model?: string) => {
    setTesting(providerId)
    try {
      const res = await fetch("/api/settings/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, model }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResults((prev) => ({
          ...prev,
          [providerId]: {
            ok: true,
            message: `Replied "${(data.preview || "").slice(0, 32)}" via ${data.model}`,
            latencyMs: data.latencyMs,
          },
        }))
        toast.success(`${providerId} OK (${data.latencyMs}ms)`)
      } else {
        setTestResults((prev) => ({
          ...prev,
          [providerId]: { ok: false, message: data.error || "Failed" },
        }))
        toast.error(`${providerId} failed: ${data.error || "Unknown"}`)
      }
    } catch (err) {
      toast.error("Test request failed")
    } finally {
      setTesting(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Provider selection */}
      <Card>
        <CardHeader>
          <CardTitle>Default AI Provider</CardTitle>
          <CardDescription>
            Choose which provider answers your questions. The environment default is{" "}
            <Badge variant="secondary" className="ml-1">{envDefault}</Badge>. Selection here
            overrides it for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={prefs.provider || envDefault}
              onValueChange={(v) => updatePref("provider", v as AIProviderId)}
            >
              <SelectTrigger className="w-full sm:w-[420px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      {p.configured ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{p.displayName}</span>
                      {!p.configured && (
                        <span className="text-xs text-muted-foreground">(not configured)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && (
            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={prefs.model || selectedProvider.defaultModel}
                onValueChange={(v) => updatePref("model", v)}
              >
                <SelectTrigger className="w-full sm:w-[420px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col items-start">
                        <span>{m.label}</span>
                        {m.notes && (
                          <span className="text-xs text-muted-foreground">{m.notes}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedProvider && !selectedProvider.configured && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-medium">Provider not configured</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Set the relevant environment variable in <code>.env.local</code>:{" "}
                    <code className="font-mono text-foreground">
                      {selectedProvider.id === "sirma"
                        ? "SIRMA_API_KEY + SIRMA_AGENT_ID"
                        : selectedProvider.id === "anthropic"
                          ? "ANTHROPIC_API_KEY"
                          : selectedProvider.id === "openai"
                            ? "OPENAI_API_KEY"
                            : selectedProvider.id === "google"
                              ? "GOOGLE_API_KEY"
                              : selectedProvider.id === "cohere"
                                ? "COHERE_API_KEY"
                                : "OLLAMA_ENABLED=true"}
                    </code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sampling parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Generation parameters</CardTitle>
          <CardDescription>
            Fine-tune sampling. Defaults to provider-controlled values when blank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {prefs.temperature ?? "default"}
              </span>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={[prefs.temperature ?? 0.7]}
              onValueChange={([v]) => updatePref("temperature", v)}
            />
            <p className="text-xs text-muted-foreground">
              Lower = deterministic. Higher = creative. Recommended: 0.2–0.7 for legal accuracy.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max tokens</Label>
            <Input
              type="number"
              min={1}
              max={32000}
              value={prefs.maxTokens ?? ""}
              placeholder="Provider default (usually 4096)"
              onChange={(e) =>
                updatePref(
                  "maxTokens",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="w-full sm:w-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label>System prompt override</Label>
            <Textarea
              value={prefs.systemPromptOverride ?? ""}
              placeholder="Leave empty to use the built-in FormWise system prompt."
              onChange={(e) =>
                updatePref("systemPromptOverride", e.target.value || undefined)
              }
              className="min-h-[120px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Advanced: replace the default bureaucracy expert prompt. Leave empty to keep
              the built-in one.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fallback chain */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback chain</CardTitle>
          <CardDescription>
            If the primary provider fails, the router walks this list in order. Configured
            providers appear first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => {
              const inChain = (prefs.fallbackChain || []).includes(p.id)
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={inChain ? "default" : "outline"}
                  size="sm"
                  disabled={!p.configured}
                  onClick={() => {
                    const current = prefs.fallbackChain || []
                    const next = inChain
                      ? current.filter((id) => id !== p.id)
                      : [...current, p.id]
                    updatePref("fallbackChain", next.length ? next : undefined)
                  }}
                >
                  {p.displayName}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Provider health table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider status</CardTitle>
          <CardDescription>
            Live configuration check. Click "Test" to verify the connection with a tiny
            ping prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {providers.map((p) => {
            const result = testResults[p.id]
            return (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.configured ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{p.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.configured
                        ? `Default: ${p.defaultModel}`
                        : p.health.reason || "Not configured"}
                    </p>
                    {result && (
                      <p
                        className={
                          "text-xs mt-1 " +
                          (result.ok ? "text-emerald-700" : "text-destructive")
                        }
                      >
                        {result.ok ? "✓ " : "✗ "}
                        {result.message}
                        {result.latencyMs !== undefined && ` (${result.latencyMs}ms)`}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 shrink-0"
                  disabled={!p.configured || testing !== null}
                  onClick={() => handleTest(p.id)}
                >
                  {testing === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Test
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Separator />

      {/* Save / reset bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
        <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save preferences
        </Button>
      </div>
    </div>
  )
}
