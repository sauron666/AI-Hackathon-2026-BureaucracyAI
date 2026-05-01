"use client"

import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock3, Flame, Sparkles } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import { useQuestionHistory } from "@/hooks/use-question-history"

function isToday(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function TodayPriorities() {
  const { translate: tr, language } = useI18n()
  const { history, isLoaded } = useQuestionHistory()
  const copy = {
    viewTodayHistory: language === "bg" ? "Виж днешните чатове" : language === "de" ? "Heutige Chats ansehen" : "View today's chats",
    noChatsToday: language === "bg" ? "Днес няма запазени чатове" : language === "de" ? "Heute wurden keine Chats gespeichert" : "No chats saved today",
  }

  const todaysChats = history
    .filter((item) => isToday(item.timestamp))
    .slice(0, 3)

  if (!isLoaded) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary animate-pulse">
              <Flame className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">{tr("dashboard.todayPriorities")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Flame className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">{tr("dashboard.todayPriorities")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild className="group gap-1">
          <Link href="/history">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.viewTodayHistory}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {todaysChats.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">{copy.noChatsToday}</p>
            <Button asChild className="mt-4">
              <Link href="/ask">{tr("dashboard.getStartedWithAi")}</Link>
            </Button>
          </div>
        ) : (
          todaysChats.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={`/ask?historyId=${item.id}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Clock3 className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {item.type === "document" ? tr("common.documents") : tr("common.questions")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.country} · {new Intl.DateTimeFormat(language === "bg" ? "bg-BG" : language === "de" ? "de-DE" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.timestamp))}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
