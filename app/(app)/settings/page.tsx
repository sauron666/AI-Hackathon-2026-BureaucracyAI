"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, User, Bell, Lock, Wrench, CreditCard } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { AIModelsTab } from "./ai-models-tab"
import { AccountTab } from "./account-tab"
import { NotificationsTab } from "./notifications-tab"
import { PrivacyTab } from "./privacy-tab"
import { DeveloperTab } from "./developer-tab"
import { BillingTab } from "./billing-tab"

export default function SettingsPage() {
  const { translate: tr } = useI18n()
  const [showDeveloperTab, setShowDeveloperTab] = useState(false)

  useEffect(() => {
    const enabled =
      process.env.NEXT_PUBLIC_DEV_SETTINGS === "true" ||
      process.env.NODE_ENV === "development"
    setShowDeveloperTab(enabled)
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-bold tracking-tight">{tr("settings.title")}</h1>
        <p className="text-muted-foreground">{tr("settings.subtitle")}</p>
      </motion.div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:flex lg:w-auto">
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            <span>{tr("settings.tabs.ai")}</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span>{tr("settings.tabs.billing")}</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            <span>{tr("settings.tabs.account")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span>{tr("settings.tabs.notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Lock className="h-4 w-4" />
            <span>{tr("settings.tabs.privacy")}</span>
          </TabsTrigger>
          {showDeveloperTab && (
            <TabsTrigger value="developer" className="gap-2 text-amber-700 dark:text-amber-300">
              <Wrench className="h-4 w-4" />
              <span>{tr("settings.tabs.developer")}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ai" className="pt-6">
          <AIModelsTab />
        </TabsContent>
        <TabsContent value="billing" className="pt-6">
          <BillingTab />
        </TabsContent>
        <TabsContent value="account" className="pt-6">
          <AccountTab />
        </TabsContent>
        <TabsContent value="notifications" className="pt-6">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="privacy" className="pt-6">
          <PrivacyTab />
        </TabsContent>
        {showDeveloperTab && (
          <TabsContent value="developer" className="pt-6">
            <DeveloperTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
