"use client"

/**
 * User-specific localStorage data management
 * Provides per-user dynamic data storage for priorities, processes, and activities
 */

import { useState, useEffect, useCallback } from "react"

// Types
export interface Priority {
  id: string
  title: string
  process: string
  due: string
  daysLeft: number
  urgency: "critical" | "high" | "soon"
  href: string
}

export interface ProcessStep {
  id: string
  name: string
  status: "completed" | "current" | "upcoming"
  description?: string
  date?: string
}

export interface ProcessDocument {
  id: string
  name: string
  status: "submitted" | "pending" | "missing"
}

export interface Process {
  id: string
  name: string
  type: "residency" | "business" | "tax" | "education" | "driving" | "healthcare"
  status: "in-progress" | "waiting" | "completed"
  progress: number
  nextStep: string
  dueDate?: string
  location?: string
  steps: ProcessStep[]
  documents: ProcessDocument[]
  estimatedCompletion?: string
  notes?: string
  createdAt?: number
  updatedAt?: number
  sourceQuestionId?: string
  origin?: "manual" | "auto"
}

export interface Activity {
  id: string
  type: "question" | "document" | "completed"
  title: string
  timestamp: string
  preview?: string
  link?: string
}

interface TrackableResponse {
  procedureName?: string
  totalEstimatedTime?: string
  summary?: string
  steps?: Array<{ number?: number; title?: string; description?: string; estimatedTime?: string }>
  requiredDocuments?: Array<{ name?: string; required?: boolean; description?: string }>
  officeInfo?: { name?: string; address?: string }
  timeline?: { maximumTime?: string; afterApproval?: string }
}

// Default data for new users
export const DEFAULT_PRIORITIES: Priority[] = [
  {
    id: "p1",
    title: "Submit biometric data",
    process: "Residence Permit Application",
    due: "Dec 15",
    daysLeft: 2,
    urgency: "critical",
    href: "/ask?q=Where%20do%20I%20submit%20biometric%20data%20for%20my%20residence%20permit%3F",
  },
  {
    id: "p2",
    title: "Provide office lease agreement",
    process: "Business Registration",
    due: "Dec 20",
    daysLeft: 7,
    urgency: "high",
    href: "/ask?q=What%20is%20required%20for%20an%20office%20lease%20agreement%20when%20registering%20a%20business%3F",
  },
  {
    id: "p3",
    title: "Collect Tax ID certificate",
    process: "Tax ID Application",
    due: "Dec 10",
    daysLeft: 4,
    urgency: "high",
    href: "/ask?q=How%20do%20I%20collect%20my%20Tax%20ID%20certificate%3F",
  },
  {
    id: "p4",
    title: "Upload health insurance proof",
    process: "Residence Permit Application",
    due: "Dec 28",
    daysLeft: 14,
    urgency: "soon",
    href: "/ask?q=What%20health%20insurance%20documents%20do%20I%20need%20for%20a%20residence%20permit%3F",
  },
]

export const DEFAULT_PROCESSES: Process[] = [
  {
    id: "1",
    name: "Residence Permit Application",
    type: "residency",
    status: "in-progress",
    progress: 65,
    nextStep: "Submit biometric data",
    dueDate: "Dec 15, 2024",
    location: "Migration Office",
    estimatedCompletion: "Jan 10, 2025",
    notes: "Appointment confirmed for biometric data submission.",
    steps: [
      { id: "s1", name: "Initial Application", status: "completed", description: "Submit online application form", date: "Nov 1, 2024" },
      { id: "s2", name: "Document Submission", status: "completed", description: "Upload required documents", date: "Nov 8, 2024" },
      { id: "s3", name: "Fee Payment", status: "completed", description: "Pay application fee", date: "Nov 10, 2024" },
      { id: "s4", name: "Biometric Data", status: "current", description: "Visit office for fingerprints and photo", date: "Dec 15, 2024" },
      { id: "s5", name: "Final Review", status: "upcoming", description: "Wait for application review" },
      { id: "s6", name: "Permit Issuance", status: "upcoming", description: "Collect residence permit card" },
    ],
    documents: [
      { id: "d1", name: "Passport Copy", status: "submitted" },
      { id: "d2", name: "Proof of Address", status: "submitted" },
      { id: "d3", name: "Employment Contract", status: "submitted" },
      { id: "d4", name: "Health Insurance", status: "pending" },
      { id: "d5", name: "Bank Statement", status: "submitted" },
    ],
  },
  {
    id: "2",
    name: "Business Registration",
    type: "business",
    status: "waiting",
    progress: 40,
    nextStep: "Waiting for document approval",
    dueDate: "Dec 20, 2024",
    estimatedCompletion: "Jan 5, 2025",
    notes: "Documents under review by the registry office.",
    steps: [
      { id: "s1", name: "Name Reservation", status: "completed", description: "Reserve company name", date: "Nov 15, 2024" },
      { id: "s2", name: "Document Preparation", status: "completed", description: "Prepare founding documents", date: "Nov 20, 2024" },
      { id: "s3", name: "Document Submission", status: "current", description: "Submit to registry office" },
      { id: "s4", name: "Registry Approval", status: "upcoming", description: "Wait for official approval" },
      { id: "s5", name: "Tax Registration", status: "upcoming", description: "Register with tax authority" },
    ],
    documents: [
      { id: "d1", name: "Articles of Association", status: "submitted" },
      { id: "d2", name: "Founder ID Copies", status: "submitted" },
      { id: "d3", name: "Office Lease Agreement", status: "missing" },
      { id: "d4", name: "Bank Account Proof", status: "pending" },
    ],
  },
  {
    id: "3",
    name: "Tax ID Application",
    type: "tax",
    status: "in-progress",
    progress: 85,
    nextStep: "Collect final document",
    location: "Tax Office",
    estimatedCompletion: "Dec 10, 2024",
    steps: [
      { id: "s1", name: "Application Form", status: "completed", description: "Fill out tax registration form", date: "Nov 25, 2024" },
      { id: "s2", name: "Identity Verification", status: "completed", description: "Verify identity at office", date: "Nov 28, 2024" },
      { id: "s3", name: "Processing", status: "completed", description: "Application processing", date: "Dec 1, 2024" },
      { id: "s4", name: "Document Collection", status: "current", description: "Collect Tax ID certificate" },
    ],
    documents: [
      { id: "d1", name: "ID Document", status: "submitted" },
      { id: "d2", name: "Proof of Address", status: "submitted" },
      { id: "d3", name: "Application Form", status: "submitted" },
    ],
  },
]

export const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "question",
    title: "Asked about residence permit renewal",
    timestamp: "2 hours ago",
    preview: "How do I renew my residence permit before it expires?",
    link: "/history/1",
  },
  {
    id: "2",
    type: "document",
    title: "Uploaded passport scan",
    timestamp: "Yesterday",
    link: "/documents/2",
  },
  {
    id: "3",
    type: "completed",
    title: "Completed address registration",
    timestamp: "3 days ago",
  },
  {
    id: "4",
    type: "question",
    title: "Asked about work permit requirements",
    timestamp: "1 week ago",
    preview: "What documents do I need to apply for a work permit?",
    link: "/history/4",
  },
]

// Storage keys
const STORAGE_KEYS = {
  PRIORITIES: "formwise-user-priorities",
  PROCESSES: "formwise-user-processes",
  ACTIVITIES: "formwise-user-activities",
  INITIALIZED: "formwise-user-initialized",
} as const

/**
 * Hook to manage user-specific priorities
 */
export function useUserPriorities() {
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRIORITIES)
    if (stored) {
      try {
        setPriorities(JSON.parse(stored))
      } catch {
        setPriorities([])
      }
    }
    setIsLoaded(true)
  }, [])

  const updatePriorities = useCallback((newPriorities: Priority[]) => {
    setPriorities(newPriorities)
    localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify(newPriorities))
  }, [])

  const addPriority = useCallback((priority: Priority) => {
    setPriorities(prev => {
      const updated = [priority, ...prev]
      localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removePriority = useCallback((id: string) => {
    setPriorities(prev => {
      const updated = prev.filter(p => p.id !== id)
      localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const resetPriorities = useCallback(() => {
    setPriorities([])
    localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify([]))
  }, [])

  return { priorities, setPriorities: updatePriorities, addPriority, removePriority, resetPriorities, isLoaded }
}

/**
 * Hook to manage user-specific processes
 */
export function useUserProcesses() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROCESSES)
    if (stored) {
      try {
        setProcesses(JSON.parse(stored))
      } catch {
        setProcesses([])
      }
    }
    setIsLoaded(true)
  }, [])

  const updateProcesses = useCallback((newProcesses: Process[]) => {
    setProcesses(newProcesses)
    localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(newProcesses))
  }, [])

  const addProcess = useCallback((process: Process) => {
    setProcesses(prev => {
      const normalized = {
        ...process,
        createdAt: process.createdAt ?? Date.now(),
        updatedAt: process.updatedAt ?? Date.now(),
      }
      const updated = [normalized, ...prev]
      localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateProcess = useCallback((id: string, updates: Partial<Process>) => {
    setProcesses(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
      localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeProcess = useCallback((id: string) => {
    setProcesses(prev => {
      const updated = prev.filter(p => p.id !== id)
      localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeProcessesBySourceQuestionId = useCallback((sourceQuestionId: string) => {
    setProcesses(prev => {
      const updated = prev.filter(p => p.sourceQuestionId !== sourceQuestionId)
      localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeProcessesBySourceQuestionIds = useCallback((sourceQuestionIds: string[]) => {
    const idsToRemove = new Set(sourceQuestionIds)
    setProcesses(prev => {
      const updated = prev.filter(p => !p.sourceQuestionId || !idsToRemove.has(p.sourceQuestionId))
      localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const resetProcesses = useCallback(() => {
    setProcesses([])
    localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify([]))
  }, [])

  const trackResponseAsProcess = useCallback((question: string, response: TrackableResponse, country: string, sourceQuestionId?: string) => {
    const trackedProcess = createProcessFromResponse(question, response, country, sourceQuestionId)
    addProcess(trackedProcess)
    return trackedProcess
  }, [addProcess])

  return {
    processes,
    setProcesses: updateProcesses,
    addProcess,
    updateProcess,
    removeProcess,
    removeProcessesBySourceQuestionId,
    removeProcessesBySourceQuestionIds,
    resetProcesses,
    trackResponseAsProcess,
    isLoaded,
  }
}

/**
 * Hook to manage user-specific activities
 */
export function useUserActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES)
    if (stored) {
      try {
        setActivities(JSON.parse(stored))
      } catch {
        setActivities([])
      }
    }
    setIsLoaded(true)
  }, [])

  const updateActivities = useCallback((newActivities: Activity[]) => {
    setActivities(newActivities)
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(newActivities))
  }, [])

  const addActivity = useCallback((activity: Activity) => {
    setActivities(prev => {
      const updated = [activity, ...prev.slice(0, 19)] // Keep only 20 most recent
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const resetActivities = useCallback(() => {
    setActivities([])
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]))
  }, [])

  return { activities, setActivities: updateActivities, addActivity, resetActivities, isLoaded }
}

/**
 * Initialize user data in localStorage (call once on first visit)
 */
export function initializeUserData() {
  if (typeof window === "undefined") return

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED)
  if (!initialized) {
    localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true")
  }
}

export function createProcessFromResponse(
  question: string,
  response: TrackableResponse,
  country: string,
  sourceQuestionId?: string,
): Process {
  const name = response.procedureName || question.slice(0, 80) || "Tracked procedure"
  const lower = `${name} ${question}`.toLowerCase()
  const type: Process["type"] =
    lower.includes("business") || lower.includes("company") ? "business" :
    lower.includes("tax") ? "tax" :
    lower.includes("study") || lower.includes("education") ? "education" :
    lower.includes("driver") || lower.includes("license") ? "driving" :
    lower.includes("health") || lower.includes("insurance") ? "healthcare" :
    "residency"

  const steps = (response.steps?.length ? response.steps : [{ title: "Review guidance", description: response.summary || question }])
    .slice(0, 8)
    .map((step, index): ProcessStep => ({
      id: `s-${index + 1}`,
      name: step.title || `Step ${index + 1}`,
      description: step.description || step.estimatedTime,
      status: index === 0 ? "current" : "upcoming",
    }))

  const documents = (response.requiredDocuments ?? [])
    .slice(0, 12)
    .map((doc, index): ProcessDocument => ({
      id: `d-${index + 1}`,
      name: doc.name || `Document ${index + 1}`,
      status: doc.required === false ? "pending" : "missing",
    }))

  return {
    id: `process-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    status: "in-progress",
    progress: 0,
    nextStep: steps[0]?.name || "Review guidance",
    location: response.officeInfo?.name || country,
    steps,
    documents,
    estimatedCompletion: response.timeline?.maximumTime || response.totalEstimatedTime,
    notes: response.summary || `Tracked from question: ${question}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceQuestionId,
    origin: "manual",
  }
}

export function createProcessingProcess(
  question: string,
  country: string,
  sourceQuestionId: string,
  labels?: {
    waitingForAnswer?: string
    questionSubmitted?: string
    questionSubmittedBody?: string
    answerGeneration?: string
    answerGenerationBody?: string
    autoCreatedNotes?: string
  },
): Process {
  const now = Date.now()

  return {
    id: `process-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: question.length > 70 ? `${question.slice(0, 67)}...` : question,
    type: "residency",
    status: "in-progress",
    progress: 10,
    nextStep: labels?.waitingForAnswer ?? "Waiting for FormWise answer",
    location: country,
    steps: [
      {
        id: "s-1",
        name: labels?.questionSubmitted ?? "Question submitted",
        status: "completed",
        description: labels?.questionSubmittedBody ?? "FormWise received the request and started processing it.",
      },
      {
        id: "s-2",
        name: labels?.answerGeneration ?? "Answer generation",
        status: "current",
        description: labels?.answerGenerationBody ?? "Searching sources and preparing the response.",
      },
    ],
    documents: [],
    notes: labels?.autoCreatedNotes ?? `Auto-created from question: ${question}`,
    createdAt: now,
    updatedAt: now,
    sourceQuestionId,
    origin: "auto",
  }
}

/**
 * Clear all user data (for testing/reset)
 */
export function clearUserData() {
  if (typeof window === "undefined") return

  localStorage.removeItem(STORAGE_KEYS.PRIORITIES)
  localStorage.removeItem(STORAGE_KEYS.PROCESSES)
  localStorage.removeItem(STORAGE_KEYS.ACTIVITIES)
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED)
}
