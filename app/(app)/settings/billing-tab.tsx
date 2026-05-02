"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Loader2, ExternalLink, CheckCircle2, Sparkles, Crown, Building2 } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n-context"

type PlanId = "free" | "pro" | "business"

interface QuotaSlot {
  used: number
  limit: number | "unlimited"
}

interface UsageResponse {
  plan: PlanId
  planName: string
  quota: {
    ask: QuotaSlot
    analyze: QuotaSlot
    journey: QuotaSlot
    compare: QuotaSlot
  }
  period: { start: string; end: string }
  subscription: {
    status: string
    current_period_end: string | null
    customer_portal_url: string | null
  } | null
}

interface PlanCard {
  id: PlanId
  price: string
  icon: typeof Sparkles
  highlightKeys: string[]
  recommended?: boolean
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    price: "€0",
    icon: Sparkles,
    highlightKeys: [
      "5 questions per month",
      "1 document analysis per month",
      "Country comparison + relocation plans",
      "Single device, local history",
    ],
  },
  {
    id: "pro",
    price: "€9",
    icon: Crown,
    highlightKeys: [
      "200 questions per month",
      "Unlimited document analyses",
      "PDF export of answers",
      "Email reminders for deadlines",
      "Cross-device sync via cloud",
    ],
    recommended: true,
  },
  {
    id: "business",
    price: "€29",
    icon: Building2,
    highlightKeys: [
      "1,000 questions per month per seat",
      "Everything in Pro",
      "API access",
      "Up to 5 team seats",
      "Priority email + chat support",
    ],
  },
]

// Localized highlights per language. EN is the source of truth.
const PLAN_HIGHLIGHTS_BG: Record<string, string> = {
  "5 questions per month": "5 въпроса на месец",
  "1 document analysis per month": "1 анализ на документ месечно",
  "Country comparison + relocation plans": "Сравнение между държави + планове за релокация",
  "Single device, local history": "Едно устройство, локална история",
  "200 questions per month": "200 въпроса на месец",
  "Unlimited document analyses": "Неограничени анализи на документи",
  "PDF export of answers": "PDF експорт на отговорите",
  "Email reminders for deadlines": "Email напомняния за крайни срокове",
  "Cross-device sync via cloud": "Синхронизация между устройства през облака",
  "1,000 questions per month per seat": "1000 въпроса на месец за всеки потребител",
  "Everything in Pro": "Всичко от Pro",
  "API access": "API достъп",
  "Up to 5 team seats": "До 5 потребителя в екипа",
  "Priority email + chat support": "Приоритетна email + chat поддръжка",
}

const PLAN_HIGHLIGHTS_DE: Record<string, string> = {
  "5 questions per month": "5 Fragen pro Monat",
  "1 document analysis per month": "1 Dokumentanalyse pro Monat",
  "Country comparison + relocation plans": "Ländervergleich + Umzugspläne",
  "Single device, local history": "Ein Gerät, lokale Historie",
  "200 questions per month": "200 Fragen pro Monat",
  "Unlimited document analyses": "Unbegrenzte Dokumentanalysen",
  "PDF export of answers": "PDF-Export von Antworten",
  "Email reminders for deadlines": "E-Mail-Erinnerungen für Fristen",
  "Cross-device sync via cloud": "Geräte-Sync über Cloud",
  "1,000 questions per month per seat": "1.000 Fragen pro Monat pro Sitz",
  "Everything in Pro": "Alles aus Pro",
  "API access": "API-Zugang",
  "Up to 5 team seats": "Bis zu 5 Team-Sitze",
  "Priority email + chat support": "Priorisierter E-Mail- und Chat-Support",
}

function localizeHighlight(key: string, language: string): string {
  if (language === "bg") return PLAN_HIGHLIGHTS_BG[key] ?? key
  if (language === "de") return PLAN_HIGHLIGHTS_DE[key] ?? key
  return key
}

export function BillingTab() {
  const { translate: tr, language } = useI18n()
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/billing/usage")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) return null
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json() as Promise<UsageResponse>
      })
      .then((d) => setData(d))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (plan: "pro" | "business") => {
    setActionLoading(`upgrade-${plan}`)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Checkout failed")
        return
      }
      window.location.href = result.url
    } catch (err) {
      toast.error("Failed to start checkout")
    } finally {
      setActionLoading(null)
    }
  }

  const handleManage = async () => {
    setActionLoading("manage")
    try {
      const res = await fetch("/api/billing/portal")
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "No portal available")
        return
      }
      window.location.href = result.url
    } catch (err) {
      toast.error("Failed to open portal")
    } finally {
      setActionLoading(null)
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

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Sign in to manage your subscription.
        </CardContent>
      </Card>
    )
  }

  const renderQuotaBar = (label: string, slot: QuotaSlot) => {
    const limit = slot.limit
    if (limit === "unlimited") {
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span className="text-muted-foreground">{slot.used} / {tr("settings.billing.unlimited")}</span>
          </div>
          <Progress value={0} className="h-2" />
        </div>
      )
    }
    const pct = limit > 0 ? Math.min(100, Math.round((slot.used / limit) * 100)) : 0
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground tabular-nums">
            {slot.used} / {limit}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current plan + usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {tr("settings.billing.currentPlan")}
                <Badge variant={data.plan === "free" ? "outline" : "default"}>
                  {data.planName}
                </Badge>
              </CardTitle>
              <CardDescription>
                {tr("settings.billing.period")}: {data.period.start} → {data.period.end}
                {data.subscription?.current_period_end && (
                  <> · {tr("settings.billing.renews")} {new Date(data.subscription.current_period_end).toLocaleDateString(language)}</>
                )}
              </CardDescription>
            </div>
            {data.subscription?.customer_portal_url && (
              <Button
                variant="outline"
                onClick={handleManage}
                disabled={actionLoading === "manage"}
                className="gap-2"
              >
                {actionLoading === "manage" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {tr("settings.billing.manage")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderQuotaBar(tr("settings.billing.questions"), data.quota.ask)}
          {renderQuotaBar(tr("settings.billing.documentAnalyses"), data.quota.analyze)}
          {renderQuotaBar(tr("settings.billing.relocationPlans"), data.quota.journey)}
          {renderQuotaBar(tr("settings.billing.countryComparisons"), data.quota.compare)}
        </CardContent>
      </Card>

      {/* Plan picker */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const isCurrent = plan.id === data.plan
          const Icon = plan.icon
          const planName =
            plan.id === "free"
              ? tr("settings.billing.free")
              : plan.id === "pro"
                ? "Pro"
                : "Business"
          const description =
            plan.id === "free"
              ? language === "bg"
                ? "Опитай FormWise без ангажимент."
                : language === "de"
                  ? "Probiere FormWise unverbindlich aus."
                  : "Try FormWise with no commitment."
              : plan.id === "pro"
                ? language === "bg"
                  ? "За сериозни релокации и активни потребители."
                  : language === "de"
                    ? "Für ernsthafte Umzüge und aktive Nutzer."
                    : "For serious relocations and frequent users."
                : language === "bg"
                  ? "За релокационни фирми, адвокатски кантори и HR екипи."
                  : language === "de"
                    ? "Für Umzugsfirmen, Anwaltskanzleien und HR-Teams."
                    : "For relocation firms, law offices, and HR teams."

          const upgradeKey =
            plan.id === "pro"
              ? "settings.billing.upgradeToPro"
              : "settings.billing.upgradeToBusiness"

          return (
            <Card
              key={plan.id}
              className={
                "relative " +
                (plan.recommended && !isCurrent ? "border-primary shadow-md" : "")
              }
            >
              {plan.recommended && !isCurrent && (
                <Badge className="absolute -top-2 right-4">{tr("settings.billing.recommended")}</Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {planName}
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{tr("settings.billing.perMonth")}</span>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.highlightKeys.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>{localizeHighlight(h, language)}</span>
                    </li>
                  ))}
                </ul>
                <Separator />
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    {tr("settings.billing.currentPlanLabel")}
                  </Button>
                ) : plan.id === "free" ? (
                  <Button variant="outline" disabled className="w-full">
                    {data.subscription?.customer_portal_url
                      ? tr("settings.billing.cancelViaPortal")
                      : tr("settings.billing.free")}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleUpgrade(plan.id as "pro" | "business")}
                    disabled={actionLoading === `upgrade-${plan.id}`}
                  >
                    {actionLoading === `upgrade-${plan.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {tr(upgradeKey)}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {tr("settings.billing.billingFooter")}
      </p>
    </div>
  )
}
