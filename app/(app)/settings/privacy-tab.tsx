"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Trash2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

export function PrivacyTab() {
  const [confirmClear, setConfirmClear] = useState(false)

  const handleExport = () => {
    if (typeof window === "undefined") return
    const dump: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (!key.startsWith("formwise") && !key.startsWith("fw_")) continue
      const value = localStorage.getItem(key)
      try {
        dump[key] = value ? JSON.parse(value) : value
      } catch {
        dump[key] = value
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `formwise-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Data exported")
  }

  const handleClearHistory = () => {
    if (typeof window === "undefined") return
    const keysToClear = [
      "formwise_question_history",
      "formwise_threads",
      "formwise_processes",
      "formwise_recent_activity",
    ]
    for (const key of keysToClear) localStorage.removeItem(key)
    setConfirmClear(false)
    toast.success("History cleared on this device")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data export</CardTitle>
          <CardDescription>
            Download everything FormWise stores about you on this device. The export is
            a JSON file you can keep or import elsewhere later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export my data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation privacy</CardTitle>
          <CardDescription>
            Control whether FormWise saves your conversation history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="default-temporary" className="font-medium">
                Default to Temporary Chat
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, new conversations are not saved to history by default.
                You can still toggle per-conversation on the Ask page.
              </p>
            </div>
            <Switch
              id="default-temporary"
              defaultChecked={
                typeof window !== "undefined" &&
                localStorage.getItem("formwise-default-temporary") === "true"
              }
              onCheckedChange={(v) =>
                localStorage.setItem("formwise-default-temporary", String(v))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label htmlFor="redact-pii" className="font-medium">
                  Redact PII before sending to model
                </Label>
                <Badge variant="outline" className="text-[10px] uppercase">Phase 3</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-mask EGN, phone, IBAN, and email in your messages before they leave
                your browser. Reduces data exposure to the AI provider.
              </p>
            </div>
            <Switch id="redact-pii" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Telemetry</CardTitle>
          <CardDescription>
            Anonymous usage analytics to help us improve. No prompts or responses are
            sent — only event names and timing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="telemetry" className="font-medium">
                Allow product analytics
              </Label>
              <p className="text-sm text-muted-foreground">
                Sends anonymized events (e.g. "asked question", "saved process"). Never
                includes prompt text or personal info.
              </p>
            </div>
            <Switch
              id="telemetry"
              defaultChecked={
                typeof window !== "undefined" &&
                localStorage.getItem("formwise_telemetry") !== "false"
              }
              onCheckedChange={(v) =>
                localStorage.setItem("formwise_telemetry", String(v))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Clear conversation history</CardTitle>
          <CardDescription>
            Removes all saved questions, processes, and activity from this device.
            Cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!confirmClear ? (
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Clear all history
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="destructive"
                onClick={handleClearHistory}
                className="gap-2"
              >
                <ShieldAlert className="h-4 w-4" /> Yes, clear everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
