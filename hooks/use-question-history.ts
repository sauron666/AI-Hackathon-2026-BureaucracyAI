"use client"

/**
 * Question History Hook
 * Stores single-question history plus full local chat threads in localStorage.
 */

import { useCallback, useEffect, useState } from "react"
import {
  answerToDiffText,
  answerToContextDigest,
  inferProcedureTheme,
  makeContextTitle,
  makeId,
  type AnswerDiff,
  type ChatContextWindow,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat-context"
import { normalizeCountryCode } from "@/lib/country-data"

export interface QuestionHistoryItem {
  id: string
  type: "question" | "document"
  title: string
  preview: string
  fullQuestion: string
  response?: Record<string, unknown>
  country: string
  language: string
  date: string
  timestamp: number
  status: "completed" | "in-progress"
  documentAnalysis?: boolean
  threadId?: string
  contextId?: string
}

export interface QuestionStats {
  totalQuestions: number
  totalDocuments: number
  completedQuestions: number
  countriesUsed: Record<string, number>
}

export interface AddQuestionOptions {
  temporary?: boolean
  id?: string
  threadId?: string
  contextId?: string
}

export interface SaveChatTurnOptions {
  temporary?: boolean
  threadId?: string | null
  contextId?: string | null
  questionId?: string
  question: string
  displayQuestion?: string
  assistantContent?: string
  response?: ChatMessage["response"]
  country: string
  language: string
  sessionId?: string
  themeKey?: string
  contextTitle?: string
  canonicalQuestion?: string
  contextDigest?: string
  searchQuery?: string
  diffSummary?: AnswerDiff
}

const STORAGE_KEY = "formwise-question-history"
const THREAD_STORAGE_KEY = "formwise-chat-threads"
const MAX_ITEMS = 100
const MAX_THREADS = 40

export function useQuestionHistory() {
  const [history, setHistory] = useState<QuestionHistoryItem[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const validHistory = loadHistory()
    const loadedThreads = loadThreads()
    const nextThreads = loadedThreads.length > 0 ? loadedThreads : migrateHistoryToThreads(validHistory)

    setHistory(validHistory)
    setThreads(nextThreads)

    if (loadedThreads.length === 0 && nextThreads.length > 0) {
      saveThreads(nextThreads)
    }

    setIsLoaded(true)
  }, [])

  const addQuestion = useCallback((
    question: string,
    response: Record<string, unknown> | null,
    country: string,
    language: string,
    documentAnalysis: boolean = false,
    options: AddQuestionOptions = {},
  ): string => {
    const id = options.id ?? makeId("q")

    if (options.temporary) {
      return `temp-${id}`
    }

    const title = question.length > 60 ? `${question.slice(0, 57)}...` : question
    const newItem: QuestionHistoryItem = {
      id,
      type: documentAnalysis ? "document" : "question",
      title,
      preview: question,
      fullQuestion: question,
      response: response || undefined,
      country: normalizeCountryCode(country),
      language,
      date: formatHistoryDate(Date.now()),
      timestamp: Date.now(),
      status: "completed",
      documentAnalysis,
      threadId: options.threadId,
      contextId: options.contextId,
    }

    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((item) => item.id !== id)].slice(0, MAX_ITEMS)
      saveHistory(updated)
      return updated
    })

    return id
  }, [])

  const saveChatTurn = useCallback((options: SaveChatTurnOptions) => {
    const threadId = options.threadId || makeId("thread")
    const contextId = options.contextId || makeId("ctx")
    const questionId = options.questionId || makeId("q")
    const now = Date.now()
    const normalizedCountry = normalizeCountryCode(options.country)
    const canonicalQuestion = options.canonicalQuestion || options.question
    const themeKey = options.themeKey || inferProcedureTheme(canonicalQuestion, options.response)
    const contextTitle = options.contextTitle || makeContextTitle(canonicalQuestion, options.response)
    const answerText = answerToDiffText(options.response)
    const contextDigest = options.contextDigest || answerToContextDigest(options.response)

    if (options.temporary) {
      return { threadId: `temp-${threadId}`, contextId: `temp-${contextId}` }
    }

    setThreads((prev) => {
      const existingThread = prev.find((thread) => thread.id === threadId)
      const baseThread: ChatThread = existingThread ?? {
        id: threadId,
        title: contextTitle,
        createdAt: now,
        updatedAt: now,
        activeContextId: contextId,
        contexts: [],
      }

      const existingContext = baseThread.contexts.find((context) => context.id === contextId)
      const baseContext: ChatContextWindow = existingContext ?? {
        id: contextId,
        title: contextTitle,
        themeKey,
        country: normalizedCountry,
        language: options.language,
        createdAt: now,
        updatedAt: now,
        messages: [],
      }

      const userMessage: ChatMessage = {
        id: questionId,
        role: "user",
        content: options.displayQuestion || options.question,
        timestamp: now,
        country: normalizedCountry,
      }
      const assistantMessage: ChatMessage | null = options.assistantContent || options.response
        ? {
            id: makeId("a"),
            role: "assistant",
            content: options.assistantContent || options.response?.summary || options.response?._rawContent || "Response received",
            timestamp: now + 1,
            country: normalizedCountry,
            response: options.response,
            diffSummary: options.diffSummary,
          }
        : null

      const nextMessages = [
        ...baseContext.messages.filter((message) => message.id !== userMessage.id),
        userMessage,
        ...(assistantMessage ? [assistantMessage] : []),
      ]

      const nextContext: ChatContextWindow = {
        ...baseContext,
        title: existingContext?.title || contextTitle,
        themeKey,
        country: normalizedCountry,
        language: options.language,
        updatedAt: now,
        messages: nextMessages,
        lastResponse: options.response || baseContext.lastResponse,
        lastGoodResponse: options.response || baseContext.lastGoodResponse,
        lastAnswerText: answerText || baseContext.lastAnswerText,
        canonicalQuestion,
        contextDigest: contextDigest || baseContext.contextDigest,
        searchQuery: options.searchQuery || canonicalQuestion,
        sessionId: options.sessionId || baseContext.sessionId,
      }

      const nextThread: ChatThread = {
        ...baseThread,
        title: baseThread.title || contextTitle,
        updatedAt: now,
        activeContextId: contextId,
        contexts: [
          nextContext,
          ...baseThread.contexts.filter((context) => context.id !== contextId),
        ].sort((a, b) => b.updatedAt - a.updatedAt),
      }

      const updated = [
        nextThread,
        ...prev.filter((thread) => thread.id !== threadId),
      ].slice(0, MAX_THREADS)

      saveThreads(updated)
      return updated
    })

    return { threadId, contextId }
  }, [])

  const updateQuestion = useCallback((id: string, updates: Partial<QuestionHistoryItem>) => {
    setHistory((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      saveHistory(updated)
      return updated
    })
  }, [])

  const deleteQuestion = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      saveHistory(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setThreads([])
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(THREAD_STORAGE_KEY)
  }, [])

  const searchHistory = useCallback((query: string): QuestionHistoryItem[] => {
    if (!query.trim()) return history
    const lowerQuery = query.toLowerCase()
    return history.filter((item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.preview.toLowerCase().includes(lowerQuery) ||
      item.fullQuestion.toLowerCase().includes(lowerQuery),
    )
  }, [history])

  const getStats = useCallback((): QuestionStats => {
    const stats: QuestionStats = {
      totalQuestions: 0,
      totalDocuments: 0,
      completedQuestions: history.filter((item) => item.status === "completed").length,
      countriesUsed: {},
    }

    history.forEach((item) => {
      if (item.type === "document") {
        stats.totalDocuments += 1
      } else {
        stats.totalQuestions += 1
      }

      if (item.country) {
        stats.countriesUsed[item.country] = (stats.countriesUsed[item.country] || 0) + 1
      }
    })

    return stats
  }, [history])

  const getRecentItems = useCallback((limit: number = 5): QuestionHistoryItem[] => {
    return history.slice(0, limit)
  }, [history])

  const getQuestionById = useCallback((id: string): QuestionHistoryItem | undefined => {
    return history.find((item) => item.id === id)
  }, [history])

  const getThreadById = useCallback((id: string): ChatThread | undefined => {
    return threads.find((thread) => thread.id === id)
  }, [threads])

  return {
    history,
    threads,
    isLoaded,
    addQuestion,
    saveChatTurn,
    updateQuestion,
    deleteQuestion,
    clearHistory,
    searchHistory,
    getStats,
    getRecentItems,
    getQuestionById,
    getThreadById,
  }
}

export interface ValidationResult {
  isValid: boolean
  missingInfo: string[]
  suggestions: string[]
}

const MIN_QUESTION_LENGTH = 10
const COMMON_PROCEDURE_KEYWORDS = [
  "visa", "permit", "license", "registration", "certificate",
  "passport", "citizenship", "residency", "residence", "work", "tax",
  "driver", "health", "insurance", "benefits", "application", "company",
  "document", "contract", "letter", "address", "family",
]

export function validateQuestion(question: string, country: string): ValidationResult {
  const trimmed = question.trim()
  const lower = trimmed.toLowerCase()
  const missingInfo: string[] = []
  const suggestions: string[] = []

  if (trimmed.length < MIN_QUESTION_LENGTH) {
    missingInfo.push("Question is too short. Please provide more details.")
    suggestions.push("Add more context about your situation")
  }

  const hasProcedureKeyword = COMMON_PROCEDURE_KEYWORDS.some((keyword) => lower.includes(keyword))
  if (!hasProcedureKeyword) {
    suggestions.push("Include the type of procedure (e.g., visa, permit, certificate)")
  }

  if (!country || country === "") {
    missingInfo.push("No country selected. Please select a country.")
    suggestions.push("Select the country where you need this procedure")
  }

  const vagueWords = ["something", "stuff", "things", "help", "info", "information"]
  const hasOnlyVagueIntent = vagueWords.some((word) => lower.includes(word)) && !hasProcedureKeyword
  if (hasOnlyVagueIntent) {
    missingInfo.push("Question contains vague terms. Please be more specific.")
    suggestions.push("Replace vague words with specific details")
  }

  return {
    isValid: missingInfo.length === 0 && trimmed.length >= MIN_QUESTION_LENGTH,
    missingInfo,
    suggestions,
  }
}

function loadHistory(): QuestionHistoryItem[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.id && item.timestamp)
          .map((item) => ({ ...item, country: normalizeCountryCode(item.country) }))
          .sort((a, b) => b.timestamp - a.timestamp)
      : []
  } catch {
    return []
  }
}

function loadThreads(): ChatThread[] {
  const stored = localStorage.getItem(THREAD_STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed.filter((thread) => thread && thread.id && Array.isArray(thread.contexts))
      : []
  } catch {
    return []
  }
}

function migrateHistoryToThreads(items: QuestionHistoryItem[]): ChatThread[] {
  return items.slice(0, MAX_THREADS).map((item) => {
    const contextId = item.contextId || `ctx-${item.id}`
    const threadId = item.threadId || `thread-${item.id}`
    const response = item.response as ChatMessage["response"] | undefined
    const answerText = answerToDiffText(response)
    const messages: ChatMessage[] = [
      {
        id: item.id,
        role: "user",
        content: item.fullQuestion,
        timestamp: item.timestamp,
        country: item.country,
        response,
      },
    ]

    if (response) {
      messages.push({
        id: `a-${item.id}`,
        role: "assistant",
        content: response.summary || response._rawContent || "Response received",
        timestamp: item.timestamp + 1,
        country: item.country,
        response,
      })
    }

    const context: ChatContextWindow = {
      id: contextId,
      title: makeContextTitle(item.fullQuestion, response),
      themeKey: inferProcedureTheme(item.fullQuestion, response),
      country: normalizeCountryCode(item.country),
      language: item.language,
      createdAt: item.timestamp,
      updatedAt: item.timestamp,
      messages,
      lastResponse: response,
      lastGoodResponse: response,
      lastAnswerText: answerText,
      canonicalQuestion: item.fullQuestion,
      contextDigest: answerToContextDigest(response),
      searchQuery: item.fullQuestion,
      sessionId: response?._sessionId,
    }

    return {
      id: threadId,
      title: context.title,
      createdAt: item.timestamp,
      updatedAt: item.timestamp,
      activeContextId: contextId,
      contexts: [context],
    }
  })
}

function saveHistory(items: QuestionHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function saveThreads(items: ChatThread[]) {
  localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(items))
}

function formatHistoryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
