"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@/lib/auth/context"

interface TrialContextType {
  usedTrial: boolean
  canUseFreeTrial: boolean
  markTrialUsed: () => void
  resetTrial: () => void
}

const TrialContext = createContext<TrialContextType | undefined>(undefined)

const TRIAL_STORAGE_KEY = "formwise_trial_used"
const MAX_FREE_USES = 1

export function TrialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [usedTrial, setUsedTrial] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TRIAL_STORAGE_KEY)
    if (stored) {
      const usageCount = parseInt(stored, 10)
      setUsedTrial(usageCount >= MAX_FREE_USES)
    }
    setIsLoaded(true)
  }, [])

  const canUseFreeTrial = !usedTrial || !!user

  const markTrialUsed = useCallback(() => {
    if (user) return // Logged in users don't consume trial
    
    const stored = localStorage.getItem(TRIAL_STORAGE_KEY)
    const currentCount = stored ? parseInt(stored, 10) : 0
    const newCount = currentCount + 1
    
    localStorage.setItem(TRIAL_STORAGE_KEY, newCount.toString())
    setUsedTrial(newCount >= MAX_FREE_USES)
  }, [user])

  const resetTrial = useCallback(() => {
    localStorage.removeItem(TRIAL_STORAGE_KEY)
    setUsedTrial(false)
  }, [])

  if (!isLoaded) {
    return null
  }

  return (
    <TrialContext.Provider value={{ usedTrial, canUseFreeTrial, markTrialUsed, resetTrial }}>
      {children}
    </TrialContext.Provider>
  )
}

export function useTrial() {
  const context = useContext(TrialContext)
  if (context === undefined) {
    throw new Error("useTrial must be used within a TrialProvider")
  }
  return context
}
