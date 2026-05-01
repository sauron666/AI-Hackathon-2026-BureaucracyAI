"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { motion, useInView, useSpring, useTransform } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, CheckCircle2, Clock, TrendingUp, MessageSquare } from "lucide-react"
import { useQuestionHistory } from "@/hooks/use-question-history"
import { useI18n } from "@/lib/i18n-context"

interface Stat {
  label: string
  value: number
  icon: React.ElementType
  description: string
  color: string
  bgColor: string
  suffix?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const spring = useSpring(0, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (latest) => Math.round(latest))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (inView) {
      spring.set(value)
    }
  }, [inView, spring, value])

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest)
    })
    return () => unsubscribe()
  }, [display])

  return (
    <span ref={ref}>
      {displayValue}{suffix}
    </span>
  )
}

export function StatsOverview() {
  const { translate: tr, language } = useI18n()
  const { history, isLoaded, getStats } = useQuestionHistory()
  const copy = {
    statsDocuments: language === "bg" ? "Анализирани документи" : language === "de" ? "Analysierte Dokumente" : "Documents Analyzed",
    statsDocumentsBody: language === "bg" ? "Общо анализи на документи" : language === "de" ? "Gesamte Dokumentanalysen" : "Total document analyses",
    statsQuestions: language === "bg" ? "Зададени въпроси" : language === "de" ? "Gestellte Fragen" : "Questions Asked",
    statsQuestionsBody: language === "bg" ? "Общо въпроси" : language === "de" ? "Gesamtzahl der Fragen" : "Total questions",
    statsCompletedBody: language === "bg" ? "Успешно отговорени" : language === "de" ? "Erfolgreich beantwortet" : "Successfully answered",
    statsTimeSaved: language === "bg" ? "Спестено време" : language === "de" ? "Gesparte Zeit" : "Time Saved",
    statsTimeSavedBody: language === "bg" ? "Оценени часове" : language === "de" ? "Geschätzte Stunden" : "Hours estimated",
  }
  
  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!isLoaded) {
      return {
        totalDocuments: 0,
        totalQuestions: 0,
        completedQuestions: 0,
        countriesUsed: {}
      }
    }
    return getStats()
  }, [history, isLoaded, getStats])

  // Estimate time saved (roughly 30 min per question compared to research)
  const timeSaved = stats.totalQuestions * 0.5

  const statItems: Stat[] = [
    {
      label: copy.statsDocuments,
      value: stats.totalDocuments,
      icon: FileText,
      description: copy.statsDocumentsBody,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: copy.statsQuestions,
      value: stats.totalQuestions,
      icon: MessageSquare,
      description: copy.statsQuestionsBody,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: tr("common.completed"),
      value: stats.completedQuestions,
      icon: CheckCircle2,
      description: copy.statsCompletedBody,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: copy.statsTimeSaved,
      value: Math.round(timeSaved * 10) / 10,
      icon: TrendingUp,
      description: copy.statsTimeSavedBody,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      suffix: "h",
    },
  ]

  if (!isLoaded) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
            </div>
          </Card>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {statItems.map((stat, index) => (
        <motion.div key={stat.label} variants={itemVariants} className="h-full">
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="h-full"
          >
            <Card className="group relative h-full cursor-default overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">
                      <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>

                  <motion.div 
                    className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center ${stat.color}`}
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <stat.icon className="h-6 w-6" />
                  </motion.div>
                </div>

              </CardContent>
              
              {/* Hover gradient overlay */}
              <motion.div 
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                style={{
                  background: `radial-gradient(circle at 80% 20%, var(--${stat.color.replace('text-', '')}) 0%, transparent 50%)`,
                  opacity: 0.05,
                }}
              />
              
              {/* Bottom accent line */}
              <motion.div 
                className={`absolute bottom-0 left-0 h-1 ${stat.bgColor}`}
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6, ease: "easeOut" }}
              />
            </Card>

          </motion.div>
        </motion.div>

      ))}
    </motion.div>
  )
}
