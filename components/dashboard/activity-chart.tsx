"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useQuestionHistory } from "@/hooks/use-question-history"
import { useI18n } from "@/lib/i18n-context"

export function ActivityChart() {
  const { history } = useQuestionHistory()
  const { translate: tr, language } = useI18n()
  const copy = {
    title: language === "bg" ? "Активност тази седмица" : language === "de" ? "Aktivität diese Woche" : "Activity this week",
    body: language === "bg" ? "Завършени отговори спрямо зададени въпроси" : language === "de" ? "Abgeschlossene Antworten im Vergleich zu gestellten Fragen" : "Completed answers vs questions asked",
  }

  const data = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language === "bg" ? "bg-BG" : language === "de" ? "de-DE" : "en-US", {
      weekday: "short",
    })

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))

      const dayStart = date.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      const dayItems = history.filter((item) => item.timestamp >= dayStart && item.timestamp < dayEnd)

      return {
        day: formatter.format(date),
        asked: dayItems.filter((item) => item.type === "question").length,
        completed: dayItems.filter((item) => item.status === "completed").length,
      }
    })
  }, [history, language])

  const totalCompleted = data.reduce((acc, d) => acc + d.completed, 0)
  const totalAsked = data.reduce((acc, d) => acc + d.asked, 0)

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent">
              <TrendingUp className="h-4 w-4" />
            </div>
            {copy.title}
          </CardTitle>
          <p className="ml-10 mt-1 text-xs text-muted-foreground">
            {copy.body}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            {totalCompleted} {tr("common.completed").toLowerCase()}
          </Badge>
          <Badge variant="outline" className="border-accent/20 bg-accent/5 text-accent">
            {totalAsked} {tr("common.questions").toLowerCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="h-[220px] w-full sm:h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="askedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--popover-foreground)",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="asked"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#askedGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#completedGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  )
}
