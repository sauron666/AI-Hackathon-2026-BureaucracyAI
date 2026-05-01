"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Search, MessageSquare, FileText, Calendar, Trash2, Sparkles, Edit3, ClipboardList, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import { useQuestionHistory, type QuestionHistoryItem } from "@/hooks/use-question-history"
import { useUserProcesses } from "@/hooks/use-user-data"

export default function HistoryPage() {
  const router = useRouter()
  const { translate: tr, language } = useI18n()
  const { history, isLoaded, deleteQuestion, clearHistory, searchHistory } = useQuestionHistory()
  const { removeProcessesBySourceQuestionId, resetProcesses } = useUserProcesses()
  const historyCopy = {
    clearAll: language === "bg" ? "Изчисти всичко" : language === "de" ? "Alles löschen" : tr("history.clearAll"),
    noHistory: language === "bg" ? "Все още няма история" : language === "de" ? "Noch kein Verlauf" : tr("history.noHistory"),
    startAsking: language === "bg" ? "Задавай въпроси, за да изградиш историята си" : language === "de" ? "Stelle Fragen, um deinen Verlauf aufzubauen" : tr("history.startAsking"),
    askFirst: language === "bg" ? "Задай първия си въпрос" : language === "de" ? "Stelle deine erste Frage" : tr("history.askFirst"),
    detailTitle: language === "bg" ? "Детайли от историята" : language === "de" ? "Verlaufsdetails" : tr("history.detailTitle"),
    prompt: language === "bg" ? "Запитване" : language === "de" ? "Anfrage" : tr("history.prompt"),
    response: language === "bg" ? "Отговор" : language === "de" ? "Antwort" : tr("history.response"),
    confidence: language === "bg" ? "Увереност" : language === "de" ? "Sicherheit" : tr("history.confidence"),
    steps: language === "bg" ? "Основни стъпки" : language === "de" ? "Wichtige Schritte" : tr("history.steps"),
    step: language === "bg" ? "Стъпка" : language === "de" ? "Schritt" : tr("history.step"),
    documents: language === "bg" ? "Документи" : language === "de" ? "Dokumente" : tr("history.documents"),
    rawResponse: language === "bg" ? "Суров отговор" : language === "de" ? "Rohantwort" : tr("history.rawResponse"),
    noResponseSaved: language === "bg" ? "За този елемент не е запазен пълен отговор." : language === "de" ? "Für diesen Eintrag wurde keine vollständige Antwort gespeichert." : tr("history.noResponseSaved"),
    continueInAsk: language === "bg" ? "Продължи в Ask" : language === "de" ? "In Ask fortsetzen" : tr("history.continueInAsk"),
    delete: language === "bg" ? "Изтрий" : language === "de" ? "Löschen" : tr("history.delete"),
  }
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedItem, setSelectedItem] = useState<QuestionHistoryItem | null>(null)

  const handleItemClick = (item: QuestionHistoryItem) => {
    setSelectedItem(item)
  }

  const handleContinue = (item: QuestionHistoryItem) => {
    router.push(`/ask?historyId=${item.id}`)
  }

  const handleDeleteQuestion = (id: string) => {
    removeProcessesBySourceQuestionId(id)
    deleteQuestion(id)
  }

  const handleClearHistory = () => {
    resetProcesses()
    clearHistory()
  }

  const filteredItems = searchHistory(searchQuery).filter((item) => {
    const matchesTab = activeTab === "all" || item.type === activeTab
    return matchesTab
  })

  const selectedResponse = selectedItem?.response
  const confidenceScore = typeof selectedResponse?.confidenceScore === "number"
    ? Math.round(Math.max(0, Math.min(1, selectedResponse.confidenceScore as number)) * 100)
    : null
  const steps = Array.isArray(selectedResponse?.steps) ? selectedResponse.steps.slice(0, 5) : []
  const documents = Array.isArray(selectedResponse?.requiredDocuments) ? selectedResponse.requiredDocuments.slice(0, 6) : []

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">{tr("history.title")}</h1>
          <p className="text-muted-foreground">
            {tr("history.subtitle")}
          </p>
        </motion.div>

        <Card className="p-12">
          <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
            <div className="w-full max-w-md space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tr("history.title")}</h1>
            <p className="text-muted-foreground">
              {tr("history.subtitle")}
            </p>
          </div>

          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to clear all history?")) {
                  handleClearHistory()
                }
              }}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {historyCopy.clearAll}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {history.filter((h) => h.type === "question").length} {tr("common.questions").toLowerCase()}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {history.filter((h) => h.type === "document").length} {tr("common.documents").toLowerCase()}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tr("history.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {tr("common.all")} ({history.length})
            </TabsTrigger>
            <TabsTrigger value="question">
              {tr("common.questions")} ({history.filter((h) => h.type === "question").length})
            </TabsTrigger>
            <TabsTrigger value="document">
              {tr("common.documents")} ({history.filter((h) => h.type === "document").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredItems.length === 0 ? (
              <Card className="p-12">
                <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                  <Search className="mb-4 h-10 w-10 text-muted-foreground" />
                  <h3 className="font-medium">
                    {searchQuery ? tr("common.noResults") : historyCopy.noHistory}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery
                      ? tr("history.noResultsBody")
                      : historyCopy.startAsking}
                  </p>
                  {!searchQuery && (
                    <Button asChild className="mt-4 gap-2">
                      <Link href="/ask">
                        <Sparkles className="h-4 w-4" />
                        {historyCopy.askFirst}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="group cursor-pointer transition-colors hover:border-primary/30"
                      onClick={() => handleItemClick(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            item.type === "question"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {item.type === "question" ? (
                              <MessageSquare className="h-5 w-5" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium">{item.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {item.country}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  item.status === "completed"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}
                              >
                                {item.status === "completed" ? tr("common.completed") : tr("common.inProgress")}
                              </Badge>
                            </div>

                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {item.preview}
                            </p>

                            <div className="mt-2 flex items-center gap-4">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {item.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleItemClick(item)
                              }}
                              title={historyCopy.continueInAsk}
                            >
                              <Edit3 className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (confirm("Delete this item?")) {
                                  handleDeleteQuestion(item.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-h-[88vh] w-[min(96vw,960px)] max-w-[960px] overflow-y-auto px-4 sm:px-6">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {selectedItem.type === "question" ? <MessageSquare className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  {historyCopy.detailTitle}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{selectedItem.date}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <Badge variant="outline" className="text-xs">{selectedItem.country}</Badge>
                  <span className="text-muted-foreground/50">·</span>
                  <Badge variant="outline" className="text-xs capitalize">{selectedItem.type}</Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 overflow-x-hidden">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium">{historyCopy.prompt}</p>
                  <p className="break-words whitespace-pre-wrap text-sm">{selectedItem.fullQuestion}</p>
                </div>

                {selectedResponse ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {typeof selectedResponse.procedureName === "string" && (
                        <Badge variant="secondary">{selectedResponse.procedureName}</Badge>
                      )}
                      {confidenceScore !== null && (
                        <Badge variant="outline" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {historyCopy.confidence}: {confidenceScore}%
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">{historyCopy.response}</p>
                      <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">
                        {typeof selectedResponse.summary === "string"
                          ? selectedResponse.summary
                          : typeof selectedResponse._rawContent === "string"
                            ? selectedResponse._rawContent
                            : selectedItem.preview}
                      </p>
                    </div>

                    {steps.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium">{historyCopy.steps}</p>
                        <div className="space-y-2">
                          {steps.map((step, index) => (
                            <div key={`${String(step?.title ?? "step")}-${index}`} className="rounded-lg border p-3 text-sm">
                              <p className="break-words font-medium">{String(step?.title ?? `${historyCopy.step} ${index + 1}`)}</p>
                              {step?.description && (
                                <p className="mt-1 break-words text-muted-foreground">{String(step.description)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {documents.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium">{historyCopy.documents}</p>
                        <div className="flex flex-wrap gap-2">
                          {documents.map((doc, index) => (
                            <Badge key={`${String(doc?.name ?? "doc")}-${index}`} variant="outline">
                              {String(doc?.name ?? `${tr("common.documents")} ${index + 1}`)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {typeof selectedResponse._rawContent === "string" && !selectedResponse.summary && (
                      <>
                        <Separator />
                        <div>
                          <p className="mb-2 text-sm font-medium">{historyCopy.rawResponse}</p>
                          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs break-words whitespace-pre-wrap">
                            {selectedResponse._rawContent}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{historyCopy.noResponseSaved}</p>
                )}
              </div>

              <DialogFooter className="flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
                <Button
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => {
                    handleDeleteQuestion(selectedItem.id)
                    setSelectedItem(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {historyCopy.delete}
                </Button>

                <Button className="w-full gap-2 sm:w-auto" onClick={() => handleContinue(selectedItem)}>
                  <ClipboardList className="h-4 w-4" />
                  {historyCopy.continueInAsk}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center pt-4"
      >
        <Button asChild variant="outline" className="gap-2">
          <Link href="/ask">
            <MessageSquare className="h-4 w-4" />
            {tr("history.askNew")}
          </Link>
        </Button>
      </motion.div>
    </div>
  )
}
