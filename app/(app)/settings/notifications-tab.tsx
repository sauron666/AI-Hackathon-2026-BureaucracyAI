"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const STORAGE_KEY = "formwise_notification_prefs"

interface NotificationPrefs {
  emailReminders: boolean
  emailDeadlines: boolean
  inAppToasts: boolean
  governmentSourceUpdates: boolean
  weeklyDigest: boolean
  productAnnouncements: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailReminders: true,
  emailDeadlines: true,
  inAppToasts: true,
  governmentSourceUpdates: false,
  weeklyDigest: false,
  productAnnouncements: true,
}

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) })
      } catch {
        /* ignore */
      }
    }
  }, [])

  const update = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const items: Array<{
    key: keyof NotificationPrefs
    title: string
    description: string
    badge?: string
  }> = [
    {
      key: "inAppToasts",
      title: "In-app toasts",
      description: "Status updates and confirmations as you use FormWise.",
    },
    {
      key: "emailReminders",
      title: "Step reminders",
      description: "Email reminders before procedure steps come due.",
      badge: "Phase 3",
    },
    {
      key: "emailDeadlines",
      title: "Deadline alerts",
      description: "Email warnings 7 / 3 / 1 day before legal deadlines.",
      badge: "Phase 3",
    },
    {
      key: "governmentSourceUpdates",
      title: "Government source updates",
      description:
        "Notify when an official page changes for a procedure you've tracked.",
      badge: "Phase 3",
    },
    {
      key: "weeklyDigest",
      title: "Weekly digest",
      description: "Summary of your active procedures every Monday.",
      badge: "Phase 3",
    },
    {
      key: "productAnnouncements",
      title: "Product announcements",
      description: "New features, model upgrades, and important notices.",
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>
            Control how and when FormWise reaches out. Email-based notifications activate
            with the Resend integration in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`notif-${item.key}`} className="font-medium cursor-pointer">
                    {item.title}
                  </Label>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={`notif-${item.key}`}
                checked={prefs[item.key]}
                onCheckedChange={(v) => update(item.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
