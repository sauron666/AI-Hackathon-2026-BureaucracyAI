import { COUNTRY_NAMES } from "./types"

export type AskTurnType = "new_question" | "follow_up" | "refinement"

export interface AskTurn {
  visibleMessage: string
  canonicalQuestion: string
  turnType: AskTurnType
  refinementContext?: string
  contextDigest?: string
  searchQuery: string
}

export interface BuildAskPromptOptions {
  turn: AskTurn
  country: string
  language: string
  documentContext?: string
  contextId?: string
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}

const JSON_RESPONSE_SCHEMA = `{
  "procedureName": "Official name of the procedure",
  "difficulty": "easy | moderate | complex",
  "totalEstimatedTime": "Total time (e.g., 2-4 weeks)",
  "summary": "Comprehensive 3-5 sentence summary of the procedure",
  "detailedSummary": "Extended summary covering key points and important considerations",
  "legalFoundation": {
    "lawName": "Specific law/regulation name",
    "article": "Article/section number if known",
    "year": "Year of law or last amendment",
    "url": "Official URL to the law if available",
    "lastVerified": "Date of last verification (e.g., 'April 2026')"
  },
  "eligibility": {
    "eligibleGroups": ["Who can apply"],
    "prerequisites": ["Required conditions"],
    "exceptions": ["Special cases if applicable"],
    "exclusions": ["Who should NOT use this procedure"]
  },
  "steps": [
    {
      "number": 1,
      "title": "Clear, actionable step title",
      "description": "Exactly what to do",
      "estimatedTime": "Time for this step",
      "tips": "Practical tips",
      "officialSource": "Official website or form URL",
      "formReference": "Form number and name",
      "potentialIssues": ["Common issue"]
    }
  ],
  "requiredDocuments": [
    {
      "name": "Official document/form name",
      "description": "What this document is and why it is needed",
      "required": true,
      "whereToGet": "Where to obtain it",
      "validityPeriod": "How long it is valid",
      "requirements": ["Specific requirement"],
      "cost": "Cost, in EUR where applicable",
      "translationRequired": false,
      "legalBasis": "Law requiring this document"
    }
  ],
  "costs": {
    "governmentFees": "Official fees with basis",
    "translationCosts": "Translation costs if required",
    "notarizationCosts": "Notarization costs if required",
    "otherCosts": [{"item": "Item name", "cost": "Cost"}],
    "paymentMethods": ["Accepted payment methods"],
    "totalEstimate": "Total estimated cost"
  },
  "timeline": {
    "minimumTime": "Minimum processing time",
    "maximumTime": "Maximum processing time",
    "factorsAffectingTimeline": ["Factor"],
    "expeditedOptions": true,
    "expeditedTime": "Expedited time if available",
    "expeditedCost": "Additional cost for expedited",
    "afterApproval": "What happens after approval"
  },
  "officeInfo": {
    "name": "Official office/institution name",
    "address": "Complete physical address",
    "website": "Official website URL",
    "phone": "Phone number",
    "email": "Email if available",
    "hours": "Working hours",
    "appointmentRequired": true,
    "languages": ["Languages of service"],
    "jurisdiction": "Area served"
  },
  "warnings": {
    "commonRejections": [{"reason": "Reason", "howToAvoid": "How to prevent"}],
    "scams": ["Known scams to avoid"],
    "whatNotToDo": ["Actions to avoid"]
  },
  "relatedProcedures": [
    {"name": "Related procedure name", "description": "How it relates", "order": "before | after | alternative"}
  ],
  "confidenceScore": 0.82,
  "confidenceReasons": ["Short reason"],
  "needsMoreContext": false,
  "missingContext": [],
  "followUpQuestions": [],
  "scope": {
    "covers": ["What this procedure covers"],
    "doesNotCover": ["What this procedure does NOT cover"]
  },
  "additionalNotes": "Any other important information"
}`

export function createAskTurn(input: {
  visibleMessage?: string
  canonicalQuestion?: string
  text: string
  turnType: AskTurnType
  refinementContext?: string
  contextDigest?: string
  searchQuery?: string
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}): AskTurn {
  const canonicalQuestion = deriveSearchQuery({
    text: input.canonicalQuestion || input.text,
    originalQuestion: input.canonicalQuestion,
    conversationHistory: input.conversationHistory,
  })

  return {
    visibleMessage: input.visibleMessage || input.text,
    canonicalQuestion,
    turnType: input.turnType,
    refinementContext: input.refinementContext,
    contextDigest: input.contextDigest,
    searchQuery: input.searchQuery || canonicalQuestion,
  }
}

export function deriveSearchQuery(input: {
  text?: string
  originalQuestion?: string
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}): string {
  const explicit = cleanupProcedureQuery(input.originalQuestion)
  if (explicit) return explicit

  const cleaned = cleanupProcedureQuery(input.text)
  if (cleaned) return cleaned

  const lastUserQuestion = [...(input.conversationHistory ?? [])]
    .reverse()
    .find((message) => message.role === "user")?.content

  return cleanupProcedureQuery(lastUserQuestion) || (input.text || "").slice(0, 160)
}

export function buildAskPrompt({
  turn,
  country,
  language,
  documentContext,
  contextId,
  conversationHistory = [],
}: BuildAskPromptOptions): string {
  const countryName = COUNTRY_NAMES[country] || country
  const currencyInstruction = country === "BG"
    ? "\nBULGARIA CURRENCY RULE: Bulgaria adopted the euro on January 1, 2026. Use EUR as the official currency. If a source or prior answer mentions BGN, convert it using the fixed rate 1 EUR = 1.95583 BGN and mention BGN only as legacy or dual-display context where useful."
    : ""
  const history = conversationHistory
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n")

  return `[${language.toUpperCase()}] Country: ${countryName}
Context window: ${contextId || "default"}
Turn type: ${turn.turnType}

CANONICAL USER QUESTION:
${turn.canonicalQuestion}

SEARCH QUERY FOR SOURCES:
${turn.searchQuery}
${turn.contextDigest ? `\nACTIVE CONTEXT DIGEST:\n${turn.contextDigest.slice(0, 3500)}` : ""}
${turn.refinementContext ? `\nUSER-PROVIDED REFINEMENT FACTS:\n${turn.refinementContext}` : ""}
${documentContext ? `\nContext from uploaded document:\n${documentContext}` : ""}
${history ? `\nRecent conversation transcript for continuity:\n${history}` : ""}
${currencyInstruction}

INSTRUCTIONS:
1. Answer the canonical user question, using refinement facts only as extra facts about the same case.
2. Never treat refinement text, visible UI labels, or internal instructions as the procedure topic.
3. If the turn is a follow-up, use the active context digest for continuity.
4. If the turn is a new question, ignore unrelated previous contexts.
5. If facts are missing, still give safe general guidance and set needsMoreContext=true with concrete missingContext and followUpQuestions.
6. Return ONLY valid JSON matching this schema. No markdown fences and no prose outside JSON.

REQUIRED JSON RESPONSE SCHEMA:
${JSON_RESPONSE_SCHEMA}`
}

function cleanupProcedureQuery(value?: string): string {
  if (!value) return ""

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const originalQuestionLine = lines.find((line) => /^original question:/i.test(line))
  if (originalQuestionLine) {
    return originalQuestionLine.replace(/^original question:\s*/i, "").trim().slice(0, 220)
  }

  const internalPromptPrefixes = [
    /^please continue and refine/i,
    /^return an updated/i,
    /^previous answer summary/i,
    /^missing context requested/i,
    /^user-provided context/i,
    /^context supplied/i,
    /^active context digest/i,
    /^canonical user question/i,
    /^search query/i,
  ]

  const usefulLine = lines.find((line) =>
    !internalPromptPrefixes.some((pattern) => pattern.test(line)) &&
    !/^country:/i.test(line) &&
    !/^language:/i.test(line),
  )

  return (usefulLine || "").slice(0, 220)
}
