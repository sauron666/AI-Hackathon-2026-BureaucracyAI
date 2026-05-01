"use client"

import { Suspense, useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { BrowseCategories, categories, type Category } from "@/components/app/browse-categories"
import { ProcedureList } from "@/components/app/procedure-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useI18n } from "@/lib/i18n-context"

function BrowsePageInner() {
  const router = useRouter()
  const { translate: tr, language } = useI18n()
  const searchParams = useSearchParams()
  const initialCategoryId = searchParams.get("category")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    initialCategoryId ? categories.find((c) => c.id === initialCategoryId) ?? null : null
  )
  const [showAskPrompt, setShowAskPrompt] = useState(false)

  useEffect(() => {
    if (initialCategoryId) {
      const found = categories.find((c) => c.id === initialCategoryId)
      if (found) setSelectedCategory(found)
    }
  }, [initialCategoryId])

  const handleSelectProcedure = (procedure: { name: string }) => {
    const promptPrefix =
      language === "bg"
        ? "Как да завърша:"
        : language === "de"
          ? "Wie erledige ich:"
          : "How do I complete:"
    const query = encodeURIComponent(`${promptPrefix} ${procedure.name}`)
    router.push(`/ask?q=${query}`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tr("browse.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {tr("browse.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 w-fit">
          <Link href="/ask">
            <Sparkles className="h-4 w-4" />
            {tr("browse.askInstead")}
          </Link>
        </Button>
      </motion.div>

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
          <Card className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-accent/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
            <div className="space-y-1">
              <h3 className="font-semibold text-accent">{tr("browse.bannerTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {tr("browse.bannerBody")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {selectedCategory ? (
          <ProcedureList
            key="procedure-list"
            category={selectedCategory}
            onBack={() => setSelectedCategory(null)}
            onSelectProcedure={handleSelectProcedure}
          />
        ) : (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BrowseCategories onSelectCategory={setSelectedCategory} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask AI Floating Prompt */}
      <AnimatePresence>
        {!showAskPrompt && !selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6"
          >
            <Card className="shadow-lg border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <p className="text-sm">{tr("browse.prompt")}</p>
                <Button size="sm" asChild className="gap-1">
                  <Link href="/ask">
                    {tr("browse.askAi")}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => setShowAskPrompt(true)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BrowsePage() {
  const { translate: tr } = useI18n()
  return (
    <Suspense fallback={<div className="text-muted-foreground">{tr("browse.loading")}</div>}>
      <BrowsePageInner />
    </Suspense>
  )
}
