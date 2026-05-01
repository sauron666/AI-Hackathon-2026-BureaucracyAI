"use client"

import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageSquare, FileText, CheckCircle2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useQuestionHistory } from "@/hooks/use-question-history"
import { formatDistanceToNow } from "date-fns"
import { useI18n } from "@/lib/i18n-context"

const activityConfig = {
  question: {
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary/20",
  },
  document: {
    icon: FileText,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    hoverColor: "group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50",
  },
  completed: {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    hoverColor: "group-hover:bg-green-200 dark:group-hover:bg-green-900/50",
  },
}

export function RecentActivity() {
  const { translate: tr, language } = useI18n()
  const { getRecentItems, isLoaded } = useQuestionHistory()
  const recentItems = getRecentItems(3)
  const copy = {
    title: language === "bg" ? "Скорошна активност" : language === "de" ? "Neueste Aktivität" : "Recent Activity",
    empty: language === "bg" ? "Няма скорошна активност" : language === "de" ? "Keine aktuelle Aktivität" : "No recent activity",
    emptyBody: language === "bg" ? "Задай въпрос, за да видиш активността си тук" : language === "de" ? "Stelle eine Frage, um hier deine Aktivität zu sehen" : "Ask a question to see your activity here",
  }

  if (!isLoaded) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{copy.title}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="group gap-1">
          <Link href="/history">
            {tr("common.viewAll")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        {recentItems.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">{copy.empty}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.emptyBody}
            </p>
            <Button asChild className="mt-4 gap-2">
              <Link href="/ask">
                <Sparkles className="h-4 w-4" />
                {tr("common.getStarted")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute top-2 bottom-2 left-5 w-0.5 bg-gradient-to-b from-border via-border to-transparent" />

            <div className="space-y-4">
              {recentItems.map((activity, index) => {
                const config = activityConfig[activity.type]
                const Icon = config.icon
                const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ x: 4 }}
                    className="group relative flex cursor-pointer gap-4 pl-12"
                  >
                    <motion.div
                      className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${config.color} ${config.hoverColor}`}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>

                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="break-words font-medium transition-colors group-hover:text-primary">
                          {activity.title}
                        </p>

                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>

                      {activity.preview && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {activity.preview}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {timeAgo}
                        </p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground">
                          {activity.country}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
