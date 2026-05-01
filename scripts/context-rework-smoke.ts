import assert from "node:assert/strict"
import { buildAskPrompt, createAskTurn, deriveSearchQuery } from "@/lib/ask-turn"
import { POST } from "@/app/api/ask/route"
import {
  classifyAskTurn,
  makeId,
  type ChatContextWindow,
} from "@/lib/chat-context"

function makeContext(input: Partial<ChatContextWindow> & Pick<ChatContextWindow, "title" | "themeKey" | "country" | "canonicalQuestion" | "searchQuery">): ChatContextWindow {
  return {
    id: input.id || makeId("ctx"),
    title: input.title,
    themeKey: input.themeKey,
    country: input.country,
    language: input.language || "en",
    createdAt: input.createdAt || Date.now(),
    updatedAt: input.updatedAt || Date.now(),
    messages: input.messages || [],
    canonicalQuestion: input.canonicalQuestion,
    contextDigest: input.contextDigest,
    searchQuery: input.searchQuery,
    lastGoodResponse: input.lastGoodResponse,
    sessionId: input.sessionId,
  }
}

const visaContext = makeContext({
  id: "ctx-visa",
  title: "Work visa in Bulgaria",
  themeKey: "visa",
  country: "BG",
  canonicalQuestion: "How to apply for a work visa?",
  searchQuery: "How to apply for a work visa?",
  contextDigest: "Procedure: Bulgarian work visa\nSummary: Employer sponsorship is relevant.",
})

const companyContext = makeContext({
  id: "ctx-company",
  title: "Company registration in Bulgaria",
  themeKey: "company",
  country: "BG",
  canonicalQuestion: "How do I register a company in Bulgaria?",
  searchQuery: "How do I register a company in Bulgaria?",
})

let route = classifyAskTurn({
  contexts: [],
  activeContextId: null,
  canonicalQuestion: "How to apply for a work visa?",
  visibleMessage: "How to apply for a work visa?",
  country: "BG",
  turnType: "new_question",
})
assert.equal(route.shouldCreate, true)
assert.equal(route.reason, "first-context")

route = classifyAskTurn({
  contexts: [visaContext],
  activeContextId: "ctx-visa",
  canonicalQuestion: "What documents do I need?",
  visibleMessage: "What documents do I need?",
  country: "BG",
  turnType: "follow_up",
})
assert.equal(route.contextId, "ctx-visa")
assert.equal(route.shouldCreate, false)

route = classifyAskTurn({
  contexts: [visaContext],
  activeContextId: "ctx-visa",
  canonicalQuestion: "How to apply for a work visa?",
  visibleMessage: "Context supplied\nI am Turkish and my employer is sponsoring me.",
  country: "BG",
  turnType: "refinement",
})
assert.equal(route.contextId, "ctx-visa")
assert.equal(route.shouldCreate, false)

route = classifyAskTurn({
  contexts: [visaContext],
  activeContextId: "ctx-visa",
  canonicalQuestion: "How do I register a company in Bulgaria?",
  visibleMessage: "How do I register a company in Bulgaria?",
  country: "BG",
  turnType: "follow_up",
})
assert.equal(route.shouldCreate, true)
assert.equal(route.reason, "theme-shift")

route = classifyAskTurn({
  contexts: [companyContext, visaContext],
  activeContextId: "ctx-company",
  canonicalQuestion: "Can my employer sponsor this visa?",
  visibleMessage: "Can my employer sponsor this visa?",
  country: "BG",
  turnType: "follow_up",
})
assert.equal(route.contextId, "ctx-visa")
assert.equal(route.reason, "matched-existing")

const refinementTurn = createAskTurn({
  text: "How to apply for a work visa?",
  visibleMessage: "Context supplied\nI am Turkish and my employer is sponsoring me.",
  canonicalQuestion: "How to apply for a work visa?",
  turnType: "refinement",
  refinementContext: "I am Turkish and my employer is sponsoring me.",
  contextDigest: visaContext.contextDigest,
})

assert.equal(refinementTurn.searchQuery, "How to apply for a work visa?")
assert.equal(
  deriveSearchQuery({ text: "Please continue and refine the previous procedure", originalQuestion: "How to apply for a work visa?" }),
  "How to apply for a work visa?",
)

const prompt = buildAskPrompt({
  turn: refinementTurn,
  country: "BG",
  language: "en",
  contextId: "ctx-visa",
})

assert.match(prompt, /CANONICAL USER QUESTION:\nHow to apply for a work visa\?/)
assert.match(prompt, /SEARCH QUERY FOR SOURCES:\nHow to apply for a work visa\?/)
assert.doesNotMatch(prompt, /Information about: Please continue/i)
assert.match(prompt, /Bulgaria adopted the euro on January 1, 2026/)

async function verifyApiDebugPrompt() {
  const apiResponse = await POST(new Request("http://local.test/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: refinementTurn.canonicalQuestion,
      country: "BG",
      language: "en",
      debugPrompt: true,
      turn: refinementTurn,
    }),
  }))
  const apiDebug = await apiResponse.json()
  assert.equal(apiResponse.status, 200)
  assert.equal(apiDebug.turn.searchQuery, "How to apply for a work visa?")
  assert.doesNotMatch(apiDebug.prompt, /Information about: Please continue/i)
  assert.match(apiDebug.prompt, /USER-PROVIDED REFINEMENT FACTS/)
}

verifyApiDebugPrompt()
  .then(() => {
    console.log("Context rework smoke tests passed.")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
