"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react"
import { X, Lightbulb, Sparkles, HelpCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const tips = [
  { text: "Did you know? You can upload documents for instant analysis!", icon: Lightbulb },
  { text: "Pro tip: Check off completed steps to track your progress!", icon: Sparkles },
  { text: "Need help? Just ask me anything about bureaucratic processes.", icon: HelpCircle },
  { text: "Save time by browsing our categorized procedure guides!", icon: Lightbulb },
  { text: "Your documents are processed securely and never stored.", icon: Sparkles },
]

interface PapiraHelperProps {
  className?: string
  initialDelay?: number
}

export function PapiraHelper({ className, initialDelay = 5000 }: PapiraHelperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const eyeX = useTransform(mouseX, [-200, 200], [-3, 3])
  const eyeY = useTransform(mouseY, [-200, 200], [-2, 2])

  useEffect(() => {
    // Check if user has dismissed helper before
    const dismissed = localStorage.getItem("papira-helper-dismissed")
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, initialDelay)

    return () => clearTimeout(timer)
  }, [initialDelay])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect()
      mouseX.set(e.clientX - rect.width / 2)
      mouseY.set(e.clientY - rect.height / 2)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem("papira-helper-dismissed", "true")
    setIsDismissed(true)
  }, [])

  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tips.length)
  }, [])

  const TipIcon = tips[currentTip].icon

  if (isDismissed) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-end gap-3",
            className
          )}
        >
          {/* Speech Bubble */}
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="relative max-w-xs rounded-2xl border border-border bg-card p-4 shadow-lg"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card border border-border shadow-sm"
                  onClick={handleDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <TipIcon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="space-y-2">
                    <motion.p 
                      key={currentTip}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm leading-relaxed"
                    >
                      {tips[currentTip].text}
                    </motion.p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={nextTip}
                    >
                      Next tip
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Speech bubble tail */}
                <div className="absolute -right-2 bottom-4 h-4 w-4 rotate-45 border-r border-b border-border bg-card" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Papira Character */}
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative h-16 w-16 cursor-pointer"
          >
            {/* Body */}
            <motion.div 
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg"
              animate={{ 
                rotate: isExpanded ? [0, -5, 5, 0] : 0,
              }}
              transition={{ 
                duration: 0.5,
                repeat: isExpanded ? 0 : Infinity,
                repeatDelay: 3,
              }}
            >
              {/* Face */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Eyes */}
                <div className="flex gap-2 mb-1">
                  <motion.div 
                    style={{ x: eyeX, y: eyeY }}
                    className="h-2.5 w-2.5 rounded-full bg-primary-foreground"
                  />
                  <motion.div 
                    style={{ x: eyeX, y: eyeY }}
                    className="h-2.5 w-2.5 rounded-full bg-primary-foreground"
                  />
                </div>
                {/* Smile */}
                <motion.div 
                  animate={{ scaleY: isExpanded ? 1.2 : 1 }}
                  className="h-1.5 w-5 rounded-full bg-primary-foreground/80"
                  style={{ borderRadius: "0 0 9999px 9999px" }}
                />
              </div>

              {/* Document ears */}
              <div className="absolute -top-1 left-2 h-3 w-2 bg-primary-foreground/30 rounded-t" />
              <div className="absolute -top-1 right-2 h-3 w-2 bg-primary-foreground/30 rounded-t" />
            </motion.div>

            {/* Glow effect when expanded */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl -z-10"
              />
            )}

            {/* Notification dot */}
            {!isExpanded && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-accent-foreground">!</span>
              </motion.div>
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
