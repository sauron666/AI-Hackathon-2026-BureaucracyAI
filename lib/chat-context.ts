import type { BureaucracyResponse } from "@/lib/ai/schemas"
import type { AskTurnType } from "@/lib/ask-turn"
import { normalizeCountryCode } from "@/lib/country-data"

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
  country?: string
  response?: BureaucracyResponse
  temporary?: boolean
  diffSummary?: AnswerDiff
}

export interface ChatContextWindow {
  id: string
  title: string
  themeKey: string
  country: string
  language: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  lastResponse?: BureaucracyResponse
  lastGoodResponse?: BureaucracyResponse
  lastAnswerText?: string
  canonicalQuestion?: string
  contextDigest?: string
  searchQuery?: string
  sessionId?: string
}

export interface ChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  activeContextId: string
  contexts: ChatContextWindow[]
}

export interface AnswerDiff {
  added: string[]
  changed: string[]
  unchanged: boolean
}

export interface ContextRouteDecision {
  contextId: string | null
  shouldCreate: boolean
  reason: "first-context" | "same-context" | "matched-existing" | "country-shift" | "theme-shift"
  themeKey: string
}

export interface AskTurnClassificationInput {
  contexts: ChatContextWindow[]
  activeContextId: string | null
  canonicalQuestion: string
  visibleMessage: string
  country: string
  turnType: AskTurnType
}

const PROCEDURE_THEMES: Array<{ key: string; words: string[] }> = [
  { key: "residence-permit", words: ["residence", "residency", "blue card", "long-term", "stay permit"] },
  { key: "visa", words: ["visa", "mvv", "entry"] },
  { key: "work-permit", words: ["work permit", "employment", "worker", "job", "freelancer"] },
  { key: "company", words: ["company", "business", "register a company", "incorporation"] },
  { key: "tax", words: ["tax", "vat", "income", "nhr"] },
  { key: "address-registration", words: ["address", "registration", "anmeldung"] },
  { key: "passport-id", words: ["passport", "id card", "identity"] },
  { key: "citizenship", words: ["citizenship", "naturalization", "nationality"] },
  { key: "family", words: ["family", "partner", "spouse", "reunification", "mother", "child"] },
  { key: "driving-license", words: ["driver", "driving", "license"] },
  { key: "vehicle", words: ["vehicle", "car", "import car"] },
  { key: "health-insurance", words: ["health", "insurance"] },
  { key: "education", words: ["school", "university", "degree", "recognition"] },
  { key: "banking", words: ["bank", "account"] },
  { key: "document-analysis", words: ["document", "letter", "contract", "lease"] },
]

const SHORT_FOLLOW_UP_PATTERNS = [
  /^(what|how|where|when|why|can|could|should|does|do|is|are)\b/i,
  /^(and|also|then|next|ok|okay)\b/i,
]

const AMBIGUOUS_FOLLOW_UP_THEMES = new Set([
  "document-analysis",
])

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function inferProcedureTheme(text: string, response?: Partial<BureaucracyResponse>): string {
  const haystack = `${text} ${response?.procedureName ?? ""} ${response?.summary ?? ""}`.toLowerCase()
  const match = PROCEDURE_THEMES.find((theme) => theme.words.some((word) => haystack.includes(word)))
  if (match) return match.key

  const words = haystack
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 3)

  return words.length ? `general-${words.join("-")}` : "general"
}

export function makeContextTitle(question: string, response?: Partial<BureaucracyResponse>): string {
  const title = response?.procedureName || question
  return title.length > 56 ? `${title.slice(0, 53)}...` : title
}

export function chooseContextForPrompt(
  contexts: ChatContextWindow[],
  activeContextId: string | null,
  question: string,
  country: string,
): ContextRouteDecision {
  const normalizedCountry = normalizeCountryCode(country)
  const themeKey = inferProcedureTheme(question)
  const looksLikeShortFollowUp = question.trim().split(/\s+/).length <= 10
    && SHORT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(question.trim()))

  if (contexts.length === 0) {
    return { contextId: null, shouldCreate: true, reason: "first-context", themeKey }
  }

  const matchingContext = contexts.find(
    (context) => normalizeCountryCode(context.country) === normalizedCountry && context.themeKey === themeKey,
  )
  if (matchingContext) {
    return {
      contextId: matchingContext.id,
      shouldCreate: false,
      reason: matchingContext.id === activeContextId ? "same-context" : "matched-existing",
      themeKey,
    }
  }

  const activeContext = contexts.find((context) => context.id === activeContextId)
  if (!activeContext) {
    return { contextId: contexts[0]?.id ?? null, shouldCreate: false, reason: "same-context", themeKey }
  }

  if (normalizeCountryCode(activeContext.country) !== normalizedCountry) {
    return { contextId: null, shouldCreate: true, reason: "country-shift", themeKey }
  }

  if (
    activeContext.themeKey !== themeKey &&
    (!looksLikeShortFollowUp || (!themeKey.startsWith("general-") && !AMBIGUOUS_FOLLOW_UP_THEMES.has(themeKey)))
  ) {
    return { contextId: null, shouldCreate: true, reason: "theme-shift", themeKey }
  }

  return { contextId: activeContext.id, shouldCreate: false, reason: "same-context", themeKey }
}

export function classifyAskTurn({
  contexts,
  activeContextId,
  canonicalQuestion,
  visibleMessage,
  country,
  turnType,
}: AskTurnClassificationInput): ContextRouteDecision {
  const normalizedCountry = normalizeCountryCode(country)
  const themeKey = inferProcedureTheme(canonicalQuestion)

  if (turnType === "refinement" && activeContextId) {
    return { contextId: activeContextId, shouldCreate: false, reason: "same-context", themeKey }
  }

  const matchingContext = contexts.find(
    (context) =>
      normalizeCountryCode(context.country) === normalizedCountry &&
      (context.themeKey === themeKey || context.searchQuery === canonicalQuestion),
  )
  if (matchingContext) {
    return {
      contextId: matchingContext.id,
      shouldCreate: false,
      reason: matchingContext.id === activeContextId ? "same-context" : "matched-existing",
      themeKey,
    }
  }

  return chooseContextForPrompt(contexts, activeContextId, visibleMessage || canonicalQuestion, normalizedCountry)
}

export function answerToDiffText(response?: Partial<BureaucracyResponse> | null): string {
  if (!response) return ""

  const lines: string[] = []
  if (response.procedureName) lines.push(`Procedure: ${response.procedureName}`)
  if (response.summary) lines.push(`Summary: ${response.summary}`)
  if (response.totalEstimatedTime) lines.push(`Time: ${response.totalEstimatedTime}`)
  if (response.costs?.governmentFees) lines.push(`Fees: ${response.costs.governmentFees}`)
  if (response.costs?.totalEstimate) lines.push(`Total cost: ${response.costs.totalEstimate}`)
  if (response.officeInfo?.name) lines.push(`Office: ${response.officeInfo.name}`)
  response.steps?.forEach((step) => lines.push(`Step ${step.number}: ${step.title} - ${step.description}`))
  response.requiredDocuments?.forEach((doc) => lines.push(`Document: ${doc.name} - ${doc.description}`))
  response.warnings?.commonRejections?.forEach((item) => lines.push(`Warning: ${item.reason} - ${item.howToAvoid}`))
  response.warnings?.whatNotToDo?.forEach((item) => lines.push(`Avoid: ${item}`))
  if (response.additionalNotes) lines.push(`Notes: ${response.additionalNotes}`)
  if (response._rawContent && lines.length === 0) lines.push(response._rawContent)

  return lines.join("\n")
}

export function answerToContextDigest(response?: Partial<BureaucracyResponse> | null): string {
  if (!response) return ""

  return [
    response.procedureName ? `Procedure: ${response.procedureName}` : "",
    response.summary ? `Summary: ${response.summary}` : "",
    response.totalEstimatedTime ? `Timeline: ${response.totalEstimatedTime}` : "",
    response.costs?.governmentFees ? `Fees: ${response.costs.governmentFees}` : "",
    response.officeInfo?.name ? `Office: ${response.officeInfo.name}` : "",
    response.needsMoreContext && response.missingContext?.length
      ? `Missing context: ${response.missingContext.join(", ")}`
      : "",
    response.followUpQuestions?.length ? `Clarifying questions: ${response.followUpQuestions.join(" | ")}` : "",
  ].filter(Boolean).join("\n")
}

export function buildAnswerDiff(previousText: string, nextText: string): AnswerDiff {
  const previousLines = normalizeLines(previousText)
  const nextLines = normalizeLines(nextText)
  const previousSet = new Set(previousLines)
  const added = nextLines.filter((line) => !previousSet.has(line)).slice(0, 8)

  const changed: string[] = []
  const previousByLabel = new Map(previousLines.map((line) => [line.split(":")[0], line]))
  for (const line of nextLines) {
    const label = line.split(":")[0]
    const previous = previousByLabel.get(label)
    if (previous && previous !== line && !added.includes(line)) {
      changed.push(line)
    }
    if (changed.length >= 6) break
  }

  return {
    added,
    changed,
    unchanged: added.length === 0 && changed.length === 0,
  }
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}
