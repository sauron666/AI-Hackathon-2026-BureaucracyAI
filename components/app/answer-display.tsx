"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  FileText, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  File,
  ListOrdered,
  AlertTriangle,
  Scale,
  UserCheck,
  DollarSign,
  Timer,
  Building2,
  ShieldAlert,
  Link2,
  FileCheck,
  Languages,
  Globe,
  ShieldCheck
} from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

// Enhanced type to include all new fields
interface BureaucracyResponse {
  procedureName: string
  difficulty: "easy" | "moderate" | "complex"
  totalEstimatedTime: string
  summary: string
  detailedSummary?: string
  steps: Array<{
    number: number
    title: string
    description: string
    estimatedTime?: string
    tips?: string
    officialSource?: string
    formReference?: string
    potentialIssues?: string[]
  }>
  requiredDocuments: Array<{
    name: string
    description: string
    required: boolean
    whereToGet?: string
    validityPeriod?: string
    requirements?: string[]
    cost?: string
    translationRequired?: boolean
    legalBasis?: string
  }>
  officeInfo: {
    name: string
    address?: string
    website?: string
    phone?: string
    email?: string
    hours?: string
    appointmentRequired?: boolean
    languages?: string[]
    jurisdiction?: string
  }
  costs?: {
    governmentFees?: string
    translationCosts?: string
    notarizationCosts?: string
    otherCosts?: Array<{item: string, cost: string}>
    paymentMethods?: string[]
    totalEstimate?: string
  }
  additionalNotes?: string
  confidenceScore?: number
  confidenceReasons?: string[]
  needsMoreContext?: boolean
  missingContext?: string[]
  followUpQuestions?: string[]
  relatedProcedures?: Array<{
    name: string
    description?: string
    order?: "before" | "after" | "alternative"
  }>
  // Legal foundation
  legalFoundation?: {
    lawName: string
    article?: string
    year?: string
    url?: string
    lastVerified?: string
  }
  // Eligibility
  eligibility?: {
    eligibleGroups: string[]
    prerequisites?: string[]
    exceptions?: string[]
    exclusions?: string[]
  }
  // Timeline details
  timeline?: {
    minimumTime?: string
    maximumTime?: string
    factorsAffectingTimeline?: string[]
    expeditedOptions?: boolean
    expeditedTime?: string
    expeditedCost?: string
    afterApproval?: string
  }
  // Warnings
  warnings?: {
    commonRejections?: Array<{reason: string, howToAvoid: string}>
    scams?: string[]
    whatNotToDo?: string[]
  }
  // Scope
  scope?: {
    covers: string[]
    doesNotCover?: string[]
  }
  // Metadata
  _rawContent?: string
  _generatedAt?: string
  _country?: string
  _language?: string
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
    transition: { duration: 0.5 },
  },
}

interface AnswerDisplayProps {
  response: BureaucracyResponse
}

export function AnswerDisplay({ response }: AnswerDisplayProps) {
  const { translate: tr, language } = useI18n()
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [checkedDocs, setCheckedDocs] = useState<string[]>([])
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const stepsProgress = response.steps.length > 0 
    ? (completedSteps.length / response.steps.length) * 100 
    : 0
  const docsProgress = response.requiredDocuments.length > 0 
    ? (checkedDocs.length / response.requiredDocuments.length) * 100 
    : 0

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps(prev =>
      prev.includes(stepNumber)
        ? prev.filter(n => n !== stepNumber)
        : [...prev, stepNumber]
    )
  }

  const toggleDoc = (docName: string) => {
    setCheckedDocs(prev =>
      prev.includes(docName)
        ? prev.filter(n => n !== docName)
        : [...prev, docName]
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "moderate": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "complex": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default: return "bg-secondary text-secondary-foreground"
    }
  }

  // Check if we have structured data or need to show raw content
  const hasStructuredSteps = response.steps.length > 0 && response.steps[0]?.number > 0
  const hasRawContent = Boolean(response._rawContent)
  const confidenceScore = typeof response.confidenceScore === "number"
    ? Math.round(Math.max(0, Math.min(1, response.confidenceScore)) * 100)
    : null
  const confidenceCopy = {
    title: language === "bg" ? "Увереност на AI" : language === "de" ? "KI-Vertrauen" : tr("confidence.title"),
    body: language === "bg"
      ? "Тази оценка комбинира самопроверката на модела с качеството на източниците, структурната пълнота и сигналите за липсващ контекст."
      : language === "de"
        ? "Diese Bewertung kombiniert die Selbstprüfung des Modells mit Quellenqualität, struktureller Vollständigkeit und Signalen für fehlenden Kontext."
        : tr("confidence.body"),
    needsContext: language === "bg"
      ? "Отговорът е полезен, но моделът показва, че е нужен още контекст, преди да разчиташ изцяло на него."
      : language === "de"
        ? "Die Antwort ist nützlich, aber das Modell zeigt, dass vor einer vollen Verlässlichkeit mehr Kontext nötig ist."
        : tr("confidence.needsContext"),
    high: language === "bg" ? "Висока увереност" : language === "de" ? "Hohe Sicherheit" : tr("confidence.high"),
    good: language === "bg" ? "Добра увереност" : language === "de" ? "Gute Sicherheit" : tr("confidence.good"),
    verify: language === "bg" ? "Провери детайлите" : language === "de" ? "Details prüfen" : tr("confidence.verify"),
    low: language === "bg" ? "Ниска увереност" : language === "de" ? "Niedrige Sicherheit" : tr("confidence.low"),
    unrated: language === "bg" ? "Без оценка" : language === "de" ? "Unbewertet" : tr("confidence.unrated"),
  }
  const confidenceReasonMap: Record<string, string> = {
    "The primary AI procedure engine failed, so this uses limited government-source fallback content.":
      language === "bg"
        ? "Основният AI механизъм за процедурите се провали, затова е използван ограничен резервен отговор от правителствени източници."
        : language === "de"
          ? "Die primäre KI-Prozedur-Engine ist ausgefallen, daher wird ein begrenzter Fallback aus Regierungsquellen verwendet."
          : "The primary AI procedure engine failed, so this uses limited government-source fallback content.",
    "Exact steps, documents, and fees still need confirmation with the official authority.":
      language === "bg"
        ? "Точните стъпки, документи и такси все още трябва да се потвърдят от официалния орган."
        : language === "de"
          ? "Genaue Schritte, Unterlagen und Gebühren müssen weiterhin bei der zuständigen Behörde bestätigt werden."
          : "Exact steps, documents, and fees still need confirmation with the official authority.",
    "The model response could not be parsed as structured JSON.":
      language === "bg"
        ? "Отговорът на модела не можа да бъде обработен като структуриран JSON."
        : language === "de"
          ? "Die Modellantwort konnte nicht als strukturiertes JSON verarbeitet werden."
          : "The model response could not be parsed as structured JSON.",
    "Use this as a starting point and verify details with an official source.":
      language === "bg"
        ? "Използвай това като отправна точка и провери детайлите в официален източник."
        : language === "de"
          ? "Nutze dies als Ausgangspunkt und prüfe die Details bei einer offiziellen Quelle."
          : "Use this as a starting point and verify details with an official source.",
    "Official source or legal foundation is present.":
      language === "bg"
        ? "Налице е официален източник или правно основание."
        : language === "de"
          ? "Eine offizielle Quelle oder Rechtsgrundlage ist vorhanden."
          : "Official source or legal foundation is present.",
    "The response includes a structured step-by-step procedure.":
      language === "bg"
        ? "Отговорът включва структурирана процедура стъпка по стъпка."
        : language === "de"
          ? "Die Antwort enthält ein strukturiertes Schritt-für-Schritt-Verfahren."
          : "The response includes a structured step-by-step procedure.",
    "Required documents are listed.":
      language === "bg"
        ? "Изброени са необходимите документи."
        : language === "de"
          ? "Erforderliche Dokumente sind aufgeführt."
          : "Required documents are listed.",
    "Timeline or cost information is included.":
      language === "bg"
        ? "Включена е информация за срокове или разходи."
        : language === "de"
          ? "Angaben zu Dauer oder Kosten sind enthalten."
          : "Timeline or cost information is included.",
    "Fallback source was used, so details should be verified with the authority.":
      language === "bg"
        ? "Използван е резервен източник, затова детайлите трябва да се проверят при компетентния орган."
        : language === "de"
          ? "Es wurde eine Fallback-Quelle verwendet, daher sollten die Details bei der Behörde geprüft werden."
          : "Fallback source was used, so details should be verified with the authority.",
    "The response was recovered from unstructured text.":
      language === "bg"
        ? "Отговорът е възстановен от неструктуриран текст."
        : language === "de"
          ? "Die Antwort wurde aus unstrukturiertem Text rekonstruiert."
          : "The response was recovered from unstructured text.",
    "More user context is needed for a case-specific answer.":
      language === "bg"
        ? "Нужен е допълнителен потребителски контекст за отговор, съобразен с конкретния случай."
        : language === "de"
          ? "Für eine fallspezifische Antwort wird mehr Nutzerkontext benötigt."
          : "More user context is needed for a case-specific answer.",
    "Official source links were not fully identified.":
      language === "bg"
        ? "Връзките към официални източници не бяха напълно установени."
        : language === "de"
          ? "Links zu offiziellen Quellen konnten nicht vollständig ermittelt werden."
          : "Official source links were not fully identified.",
  }
  const confidenceLabel = confidenceScore === null
    ? confidenceCopy.unrated
    : confidenceScore >= 85
      ? confidenceCopy.high
      : confidenceScore >= 65
        ? confidenceCopy.good
        : confidenceScore >= 45
          ? confidenceCopy.verify
          : confidenceCopy.low
  const confidenceTone = confidenceScore === null
    ? "border-muted bg-muted/30"
    : confidenceScore >= 85
      ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20"
      : confidenceScore >= 65
        ? "border-blue-500/40 bg-blue-50 dark:bg-blue-950/20"
        : confidenceScore >= 45
          ? "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
          : "border-red-500/40 bg-red-50 dark:bg-red-950/20"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Confidence Card */}
      <motion.div variants={itemVariants}>
        <Card className={cn("overflow-hidden border", confidenceTone)}>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="font-semibold">{confidenceCopy.title}</p>
                  <Badge variant="outline">{confidenceLabel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {response.needsMoreContext
                    ? confidenceCopy.needsContext
                    : confidenceCopy.body}
                </p>
                {response.confidenceReasons && response.confidenceReasons.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {response.confidenceReasons.slice(0, 4).map((reason) => (
                      <Badge key={reason} variant="secondary" className="whitespace-normal text-left">
                        {confidenceReasonMap[reason] ?? reason}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-[150px] space-y-2 text-right">
                <div className="text-3xl font-bold">
                  {confidenceScore === null ? "--" : `${confidenceScore}%`}
                </div>
                <Progress value={confidenceScore ?? 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Card with Legal Foundation */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-primary overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className={getDifficultyColor(response.difficulty)}>
                {response.difficulty}
              </Badge>
              {response.totalEstimatedTime && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {response.totalEstimatedTime}
                </Badge>
              )}
              {response._generatedAt && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <FileCheck className="h-3 w-3" />
                  {tr("answerDisplay.verified")}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{response.procedureName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">{response.summary}</p>
            
            {response.detailedSummary && (
              <p className="text-sm leading-relaxed border-t pt-4">
                {response.detailedSummary}
              </p>
            )}
            
            {/* Legal Foundation Section */}
            {response.legalFoundation && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Scale className="h-4 w-4 text-primary" />
                  {tr("answerDisplay.legalFoundation")}
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-[100px]">{tr("answerDisplay.law")}</span>
                    <span className="font-medium">{response.legalFoundation.lawName}</span>
                  </div>
                  {response.legalFoundation.article && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">{tr("answerDisplay.article")}</span>
                      <span>{response.legalFoundation.article}</span>
                    </div>
                  )}
                  {response.legalFoundation.year && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">{tr("answerDisplay.year")}</span>
                      <span>{response.legalFoundation.year}</span>
                    </div>
                  )}
                  {response.legalFoundation.lastVerified && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">{tr("answerDisplay.verifiedLabel")}</span>
                      <span>{response.legalFoundation.lastVerified}</span>
                    </div>
                  )}
                  {response.legalFoundation.url && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">{tr("answerDisplay.source")}</span>
                      <a 
                        href={response.legalFoundation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {tr("answerDisplay.officialSource")} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Scope Section - What this covers and doesn't cover */}
      {response.scope && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                {tr("answerDisplay.scopeTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {tr("answerDisplay.scopeCovers")}
                  </h4>
                  <ul className="text-sm space-y-1">
                    {response.scope.covers.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {response.scope.doesNotCover && response.scope.doesNotCover.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {tr("answerDisplay.scopeDoesNotCover")}
                    </h4>
                    <ul className="text-sm space-y-1">
                      {response.scope.doesNotCover.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Eligibility Section */}
      {response.eligibility && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                {tr("answerDisplay.eligibility")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">{tr("answerDisplay.whoCanApply")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.eligibility.eligibleGroups.map((group, i) => (
                      <Badge key={i} variant="secondary">{group}</Badge>
                    ))}
                  </div>
                </div>
                
                {response.eligibility.prerequisites && response.eligibility.prerequisites.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{tr("answerDisplay.prerequisites")}</h4>
                    <ul className="text-sm space-y-1">
                      {response.eligibility.prerequisites.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {response.eligibility.exceptions && response.eligibility.exceptions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-amber-700 dark:text-amber-400">{tr("answerDisplay.exceptions")}</h4>
                    <ul className="text-sm space-y-1">
                      {response.eligibility.exceptions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">!</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {response.eligibility.exclusions && response.eligibility.exclusions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-400">{tr("answerDisplay.whoShouldNotApply")}</h4>
                    <ul className="text-sm space-y-1">
                      {response.eligibility.exclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timeline Section */}
      {response.timeline && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                {tr("answerDisplay.timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">{tr("answerDisplay.minimumTime")}</p>
                      <p className="text-lg font-semibold">{response.timeline.minimumTime || response.totalEstimatedTime || tr("answerDisplay.varies")}</p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  {response.timeline.maximumTime && response.timeline.minimumTime && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("answerDisplay.maximumTime")}</p>
                        <p className="text-lg font-semibold">{response.timeline.maximumTime}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {response.timeline.expeditedOptions && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Timer className="h-4 w-4" />
                        <span className="font-medium">{tr("answerDisplay.expeditedAvailable")}</span>
                      </div>
                      <div className="mt-2 text-sm space-y-1">
                        <p>{tr("answerDisplay.time")}: {response.timeline.expeditedTime || tr("answerDisplay.contactOffice")}</p>
                        {response.timeline.expeditedCost && (
                          <p>{tr("answerDisplay.additionalCost")}: {response.timeline.expeditedCost}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {response.timeline.factorsAffectingTimeline && response.timeline.factorsAffectingTimeline.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">{tr("answerDisplay.timelineFactors")}</p>
                      <ul className="text-sm space-y-1">
                        {response.timeline.factorsAffectingTimeline.map((factor, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {factor}
                          </li>
))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {response.timeline.afterApproval && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm">
                    <span className="font-medium">{tr("answerDisplay.afterApproval")}</span> {response.timeline.afterApproval}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Costs Section */}
      {response.costs && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {tr("answerDisplay.costBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {response.costs.governmentFees && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">{tr("answerDisplay.governmentFees")}</p>
                      <p className="text-lg font-semibold">{response.costs.governmentFees}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  {response.costs.translationCosts && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">{tr("answerDisplay.translationCosts")}</p>
                      <p className="font-medium">{response.costs.translationCosts}</p>
                    </div>
                  )}
                  
                  {response.costs.notarizationCosts && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">{tr("answerDisplay.notarizationCosts")}</p>
                      <p className="font-medium">{response.costs.notarizationCosts}</p>
                    </div>
                  )}
                </div>
                
                {response.costs.otherCosts && response.costs.otherCosts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">{tr("answerDisplay.otherCosts")}</p>
                    <div className="grid gap-2">
                      {response.costs.otherCosts.map((cost, i) => (
                        <div key={i} className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>{cost.item}</span>
                          <span className="font-medium">{cost.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {response.costs.totalEstimate && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{tr("answerDisplay.totalEstimatedCost")}</span>
                      <span className="text-xl font-bold">{response.costs.totalEstimate}</span>
                    </div>
                  </div>
                )}
                
                {response.costs.paymentMethods && response.costs.paymentMethods.length > 0 && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">{tr("answerDisplay.paymentMethods")}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {response.costs.paymentMethods.map((method, i) => (
                        <Badge key={i} variant="outline">{method}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Show structured steps or raw content */}
      {hasStructuredSteps ? (
        <>
          {/* Steps Timeline */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-primary" />
                    {tr("answerDisplay.stepsToComplete")}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {tr("answerDisplay.completedCount", { completed: String(completedSteps.length), total: String(response.steps.length) })}
                  </span>
                </div>
                <Progress value={stepsProgress} className="h-2 mt-2" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {response.steps.map((step) => {
                      const isCompleted = completedSteps.includes(step.number)
                      const isExpanded = expandedStep === step.number

                      return (
                        <div key={step.number} className="relative pl-12">
                          {/* Step number circle */}
                          <motion.button
                            onClick={() => toggleStep(step.number)}
                            whileTap={{ scale: 0.95 }}
                            className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                              isCompleted 
                                ? "border-primary bg-primary text-primary-foreground" 
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <span className="text-sm font-medium">{step.number}</span>
                            )}
                          </motion.button>

                          <div 
                            className={`rounded-lg border p-4 transition-all ${
                              isCompleted ? "bg-primary/5 border-primary/20" : "bg-card"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                  {step.title}
                                </h4>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                  {step.estimatedTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {step.estimatedTime}
                                    </span>
                                  )}
                                  {step.formReference && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {step.formReference}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                            
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-border space-y-3"
                              >
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                
                                {step.officialSource && (
                                  <a 
                                    href={step.officialSource}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <Link2 className="h-4 w-4" />
                                    Official Source
                                  </a>
                                )}
                                
                                {step.tips && (
                                  <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm">
                                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span>{step.tips}</span>
                                  </div>
                                )}
                                
                                {step.potentialIssues && step.potentialIssues.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{tr("answerDisplay.potentialIssues")}</p>
                                    <ul className="text-sm space-y-1">
                                      {step.potentialIssues.map((issue, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                          <span className="text-red-500">!</span>
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Document Checklist */}
          {response.requiredDocuments.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <File className="h-5 w-5 text-primary" />
                      {tr("answerDisplay.requiredDocuments")}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {tr("answerDisplay.readyCount", { ready: String(checkedDocs.length), total: String(response.requiredDocuments.length) })}
                    </span>
                  </div>
                  <Progress value={docsProgress} className="h-2 mt-2" />
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible className="w-full">
                    {response.requiredDocuments.map((doc, idx) => {
                      const isChecked = checkedDocs.includes(doc.name)

                      return (
                        <AccordionItem key={idx} value={`doc-${idx}`}>
                          <div className="flex items-center w-full">
                            {/* Checkbox outside of AccordionTrigger to avoid nested buttons */}
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isChecked}
                              onClick={() => toggleDoc(doc.name)}
                              className="flex-shrink-0 mr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  toggleDoc(doc.name)
                                }
                              }}
                            >
                              <div className={cn(
                                "h-5 w-5 rounded border-2 transition-all flex items-center justify-center",
                                isChecked 
                                  ? "bg-primary border-primary text-primary-foreground" 
                                  : "border-input bg-background hover:border-primary/50"
                              )}>
                                {isChecked && (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                            <AccordionTrigger 
                              className={`hover:no-underline flex-1 ${isChecked ? 'opacity-60' : ''}`}
                            >
                              <div className="text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                                    {doc.name}
                                  </span>
                                  <Badge variant={doc.required ? "default" : "secondary"} className="text-xs">
                                    {doc.required ? tr("answerDisplay.required") : tr("answerDisplay.optional")}
                                  </Badge>
                                  {doc.translationRequired && (
                                    <Badge variant="outline" className="text-xs">
                                      <Languages className="h-3 w-3 mr-1" />
                                      {tr("answerDisplay.translationRequired")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent>
                            <div className="pl-10 space-y-3 text-sm">
                              <p className="text-muted-foreground">{doc.description}</p>
                              
                              {doc.whereToGet && (
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground">{tr("answerDisplay.whereToGet")}</span>
                                  <span>{doc.whereToGet}</span>
                                </div>
                              )}
                              
                              {doc.validityPeriod && (
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground">{tr("answerDisplay.validFor")}</span>
                                  <span>{doc.validityPeriod}</span>
                                </div>
                              )}
                              
                              {doc.cost && (
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground">{tr("answerDisplay.cost")}</span>
                                  <span className="font-medium">{doc.cost}</span>
                                </div>
                              )}
                              
                              {doc.legalBasis && (
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground">{tr("answerDisplay.legalBasis")}</span>
                                  <span>{doc.legalBasis}</span>
                                </div>
                              )}
                              
                              {doc.requirements && doc.requirements.length > 0 && (
                                <div>
                                  <p className="text-muted-foreground mb-1">{tr("answerDisplay.requirements")}</p>
                                  <ul className="space-y-1">
                                    {doc.requirements.map((req, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        {req}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      ) : (
        /* Fallback: Show raw content in a tabbed view */
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {tr("answerDisplay.detailedInstructions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="steps" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="steps" className="flex-1">
                    <ListOrdered className="h-4 w-4 mr-2" />
                    {tr("answerDisplay.steps")}
                  </TabsTrigger>
                  <TabsTrigger value="full" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    {tr("answerDisplay.fullResponse")}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="steps" className="mt-4">
                  {response._rawContent ? (
                    <div className="space-y-3">
                      {response._rawContent.split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        
                        // Check if it's a numbered item or header
                        const isNumbered = /^\d+[\).]/.test(trimmed);
                        const isHeader = /^#+\s/.test(trimmed);
                        const isListItem = /^[-*•]\s/.test(trimmed);
                        
                        return (
                          <div 
                            key={i} 
                            className={`py-2 ${isHeader ? 'font-semibold text-lg mt-4 first:mt-0' : ''} ${isNumbered ? 'pl-4 border-l-2 border-primary/30' : ''} ${isListItem ? 'pl-4' : ''}`}
                          >
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{tr("answerDisplay.noDetailedInstructions")}</p>
                  )}
                </TabsContent>
                
                <TabsContent value="full" className="mt-4">
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm font-mono">
                    {response._rawContent ||response.summary}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Office Info Card */}
      {response.officeInfo && response.officeInfo.name && (
        <motion.div variants={itemVariants}>
          <Card className="bg-secondary/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {tr("answerDisplay.whereToGo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">{response.officeInfo.name}</h4>
                
                {response.officeInfo.address && (
                  <p className="text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-1" />
                    {response.officeInfo.address}
                  </p>
                )}
                
                {response.officeInfo.hours && (
                  <p className="text-muted-foreground flex items-start gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0 mt-1" />
                    {response.officeInfo.hours}
                  </p>
                )}
                
                {response.officeInfo.phone && (
                  <p className="text-muted-foreground flex items-start gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0 mt-1" />
                    {response.officeInfo.phone}
                  </p>
                )}
                
                {response.officeInfo.email && (
                  <p className="text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground flex-shrink-0">@</span>
                    {response.officeInfo.email}
                  </p>
                )}
                
                {response.officeInfo.appointmentRequired && (
                  <p className="text-amber-600 flex items-start gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0 mt-1" />
                    <strong>{tr("answerDisplay.appointmentRequired")}</strong>
                  </p>
                )}
                
                {response.officeInfo.languages && response.officeInfo.languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Languages className="h-4 w-4 flex-shrink-0 mt-1 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {response.officeInfo.languages.map((lang, i) => (
                        <Badge key={i} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  {response.officeInfo.website && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={response.officeInfo.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {tr("answerDisplay.visitWebsite")}
                      </a>
                    </Button>
                  )}
                  {response.officeInfo.address && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(response.officeInfo.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4" />
                        {tr("answerDisplay.viewOnMap")}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Warnings Section */}
      {response.warnings && (
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
                {tr("answerDisplay.importantWarnings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {response.warnings.commonRejections && response.warnings.commonRejections.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{tr("answerDisplay.commonRejections")}</h4>
                  <div className="space-y-2">
                    {response.warnings.commonRejections.map((item, i) => (
                      <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          {item.reason}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tr("answerDisplay.howToAvoid")} {item.howToAvoid}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {response.warnings.scams && response.warnings.scams.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-400">
                    {tr("answerDisplay.scamsToAvoid")}
                  </h4>
                  <ul className="space-y-1">
                    {response.warnings.scams.map((scam, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {scam}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {response.warnings.whatNotToDo && response.warnings.whatNotToDo.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{tr("answerDisplay.whatNotToDo")}</h4>
                  <ul className="space-y-1">
                    {response.warnings.whatNotToDo.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Additional Notes */}
      {response.additionalNotes && (
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">{tr("answerDisplay.additionalNotes")}</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{response.additionalNotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Related Procedures */}
      {response.relatedProcedures && response.relatedProcedures.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                {tr("answerDisplay.relatedProcedures")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {response.relatedProcedures.map((proc, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Badge variant="outline" className="flex-shrink-0">
                      {proc.order === 'before' ? tr("answerDisplay.doFirst") : proc.order === 'after' ? tr("answerDisplay.doNext") : tr("answerDisplay.alternative")}
                    </Badge>
                    <div>
                      <p className="font-medium">{proc.name}</p>
                      {proc.description && (
                        <p className="text-sm text-muted-foreground">{proc.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
