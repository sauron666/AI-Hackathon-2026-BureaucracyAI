"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useDragControls, type PanInfo } from "motion/react"
import { X, ChevronRight, HelpCircle, RotateCcw, Grip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"

const SESSION_HIDE_KEY = "formwise-clippy-hidden-session"
const POSITION_KEY = "formwise-clippy-position"

// Corner positions for Clippy to jump to
const corners = [
  { x: "right-6", y: "bottom-6" },
  { x: "right-6", y: "top-24" },
  { x: "left-6", y: "bottom-6" },
  { x: "left-6", y: "top-24" },
]

const CLIPPY_WIDTH = 60
const CLIPPY_HEIGHT = 72
const EDGE_PADDING = 12


interface FormWiseClippyProps {
  className?: string
  initialDelay?: number
}

type ClippyPosition = {
  x: number
  y: number
}

function clampPosition(position: ClippyPosition): ClippyPosition {
  if (typeof window === "undefined") return position

  const maxX = Math.max(EDGE_PADDING, window.innerWidth - CLIPPY_WIDTH - EDGE_PADDING)
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - CLIPPY_HEIGHT - EDGE_PADDING)

  return {
    x: Math.min(Math.max(position.x, EDGE_PADDING), maxX),
    y: Math.min(Math.max(position.y, EDGE_PADDING), maxY),
  }
}

function getCornerPosition(corner: (typeof corners)[number]): ClippyPosition {
  if (typeof window === "undefined") {
    return { x: EDGE_PADDING, y: EDGE_PADDING }
  }

  const x = corner.x.includes("right")
    ? window.innerWidth - CLIPPY_WIDTH - 24
    : 24
  const y = corner.y.includes("bottom")
    ? window.innerHeight - CLIPPY_HEIGHT - 24
    : 96

  return clampPosition({ x, y })
}

export function FormWiseClippy({ className, initialDelay = 5000 }: FormWiseClippyProps) {
  const pathname = usePathname()
  const { translate: tr } = useI18n()
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [isHiddenForSession, setIsHiddenForSession] = useState(false)
  const [cornerIndex, setCornerIndex] = useState(0)
  const [isJumping, setIsJumping] = useState(false)
  const [isBouncing, setIsBouncing] = useState(false)
  const [eyebrowRaise, setEyebrowRaise] = useState(false)
  const [savedPosition, setSavedPosition] = useState<ClippyPosition | null>(null)
  const [dragAnchorPosition, setDragAnchorPosition] = useState<ClippyPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragBubbleOnRightSide, setDragBubbleOnRightSide] = useState(false)
  const [hasUserPosition, setHasUserPosition] = useState(false)
  const jumpTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bounceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const dragStartPositionRef = useRef<ClippyPosition | null>(null)
  const dragControls = useDragControls()
  
  const routeKey = pathname?.startsWith("/ask")
    ? "ask"
    : pathname?.startsWith("/dashboard")
      ? "dashboard"
      : pathname?.startsWith("/history")
        ? "history"
        : "default"
  const tips = [
    tr(`clippy.tips.${routeKey}.one`),
    tr(`clippy.tips.${routeKey}.two`),
    tr(`clippy.tips.${routeKey}.three`),
  ].filter((tip) => tip && !tip.startsWith("clippy."))

  // Mouse tracking for eyes
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { stiffness: 100, damping: 20 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 100, damping: 20 })
  const eyeX = useTransform(smoothMouseX, [-500, 500], [-4, 4])
  const eyeY = useTransform(smoothMouseY, [-500, 500], [-3, 3])

  useEffect(() => {
    const hidden = sessionStorage.getItem(SESSION_HIDE_KEY)
    if (hidden) {
      setIsHiddenForSession(true)
      return
    }

    const storedPosition = localStorage.getItem(POSITION_KEY)
    if (storedPosition) {
      try {
        const parsed = JSON.parse(storedPosition) as ClippyPosition
        setSavedPosition(clampPosition(parsed))

        setHasUserPosition(true)
      } catch {
        localStorage.removeItem(POSITION_KEY)
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, initialDelay)

    return () => clearTimeout(timer)

  }, [initialDelay])


  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)

    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  // Random bouncing behavior
  useEffect(() => {
    if (!isVisible || isHiddenForSession) return

    bounceIntervalRef.current = setInterval(() => {
      if (!isExpanded && Math.random() > 0.6) {
        setIsBouncing(true)
        setTimeout(() => setIsBouncing(false), 600)
      }
    }, 4000)

    return () => {
      if (bounceIntervalRef.current) {
        clearInterval(bounceIntervalRef.current)
      }
    }
  }, [isVisible, isHiddenForSession, isExpanded])

  // Random corner jumping
  useEffect(() => {
    if (!isVisible || isHiddenForSession || isExpanded || hasUserPosition) return

    const scheduleJump = () => {
      const delay = 15000 + Math.random() * 20000 // 15-35 seconds
      jumpTimeoutRef.current = setTimeout(() => {
        setIsJumping(true)
        setTimeout(() => {
          setCornerIndex((prev) => (prev + 1) % corners.length)
          setIsJumping(false)
          // Wiggle eyebrows after landing
          setEyebrowRaise(true)
          setTimeout(() => setEyebrowRaise(false), 500)

        }, 400)

        scheduleJump()
      }, delay)

    }

    scheduleJump()

    return () => {
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current)
      }
    }
  }, [isVisible, isHiddenForSession, isExpanded, hasUserPosition])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    sessionStorage.setItem(SESSION_HIDE_KEY, "true")
    setIsHiddenForSession(true)

  }, [])

  const handleRestore = useCallback(() => {
    sessionStorage.removeItem(SESSION_HIDE_KEY)
    setIsHiddenForSession(false)

    setIsVisible(true)

    setIsExpanded(true)

  }, [])

  const handleDragStart = useCallback(() => {
    const basePosition = savedPosition ?? getCornerPosition(corners[cornerIndex])
    dragStartPositionRef.current = basePosition
    dragX.set(0)
    dragY.set(0)
    setDragAnchorPosition(basePosition)
    setDragBubbleOnRightSide(
      typeof window !== "undefined"
        ? basePosition.x + CLIPPY_WIDTH / 2 >= window.innerWidth / 2
        : false
    )
    setIsDragging(true)
  }, [cornerIndex, dragX, dragY, savedPosition])

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const basePosition = dragStartPositionRef.current ?? savedPosition ?? getCornerPosition(corners[cornerIndex])
    const nextPosition = clampPosition({
      x: basePosition.x + info.offset.x,
      y: basePosition.y + info.offset.y,
    })

    dragStartPositionRef.current = null
    dragX.set(0)
    dragY.set(0)
    setDragAnchorPosition(null)
    setIsDragging(false)
    setSavedPosition(nextPosition)
    setHasUserPosition(true)
    localStorage.setItem(POSITION_KEY, JSON.stringify(nextPosition))
  }, [cornerIndex, dragX, dragY, savedPosition])

  const handleResetPosition = useCallback(() => {
    localStorage.removeItem(POSITION_KEY)
    setSavedPosition(null)
    setDragAnchorPosition(null)
    setIsDragging(false)
    dragX.set(0)
    dragY.set(0)

    setHasUserPosition(false)

    setCornerIndex(0)

  }, [dragX, dragY])

  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % tips.length)
  }, [tips.length])

  const handleClippyClick = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      // Wiggle eyebrows when opening
      setEyebrowRaise(true)
      setTimeout(() => setEyebrowRaise(false), 400)
    }
  }

  if (isHiddenForSession) {
    return (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={handleRestore}
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
        aria-label={tr("clippy.restore")}
        title={tr("clippy.restore")}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    )
  }

  const currentCorner = corners[cornerIndex]
  const activePosition = dragAnchorPosition ?? savedPosition
  const isOnRightSide = isDragging
    ? dragBubbleOnRightSide
    : activePosition
    ? typeof window !== "undefined"
      ? activePosition.x + CLIPPY_WIDTH / 2 >= window.innerWidth / 2
      : false
    : currentCorner.x.includes("right")
  const positionClass = activePosition ? "" : `${currentCorner.x} ${currentCorner.y}`

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.5, y: 50 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
          }}
          className={cn(
            "fixed z-50 h-[72px] w-[60px]",
            positionClass,
            className
          )}
          style={{
            ...(activePosition ? { left: activePosition.x, top: activePosition.y } : {}),
            x: dragX,
            y: dragY,
          }}
        >
          {/* Speech Bubble */}
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: isOnRightSide ? -20 : 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: isOnRightSide ? -20 : 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "absolute bottom-2 max-w-xs rounded-2xl border border-border bg-card p-4 shadow-xl",
                  isOnRightSide ? "right-[calc(100%+0.75rem)]" : "left-[calc(100%+0.75rem)]",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card border border-border shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={handleDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>

                
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Grip className="h-3 w-3" />
                    {tr("clippy.dragHint")}
                  </div>

                  <motion.p 
                    key={currentTip}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm leading-relaxed"

                  >
                    {tips[currentTip % tips.length] || tr("clippy.tips.default.one")}
                  </motion.p>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={nextTip}
                  >
                    {tr("clippy.nextTip")}
                    <ChevronRight className="h-3 w-3" />
                  </Button>

                  {hasUserPosition && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={handleResetPosition}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {tr("clippy.resetPosition")}
                    </Button>

                  )}
                </div>


                {/* Speech bubble tail */}
                <div 
                  className={cn(
                    "absolute bottom-4 h-4 w-4 rotate-45 border-border bg-card",
                    isOnRightSide
                      ? "-right-2 border-r border-b" 
                      : "-left-2 border-l border-b"
                  )} 
                />
              </motion.div>

            )}
          </AnimatePresence>


          {/* Clippy Paper Clip Character */}
          <motion.button
            onClick={handleClippyClick}
            onPointerDown={(event) => {
              dragControls.start(event, { snapToCursor: false })
            }}
            animate={{
              y: !isDragging && isBouncing ? [0, -15, 0, -8, 0] : 0,
              rotate: !isDragging && isBouncing ? [0, -5, 5, -3, 0] : 0,
            }}
            transition={{
              y: { duration: 0.6, ease: "easeOut" },
              rotate: { duration: 0.6, ease: "easeOut" },
            }}
            whileHover={isDragging ? undefined : { scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="relative cursor-grab rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing"

            aria-label={tr("clippy.assistantLabel")}
          >
            {/* Paper Clip SVG */}
            <motion.svg
              width="60"
              height="72"
              viewBox="0 0 60 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
              animate={{
                rotate: isExpanded ? [0, -3, 3, 0] : 0,
              }}
              transition={{ duration: 0.4 }}
            >
              {/* Paper clip body - silver/gray metallic look */}
              <motion.path
                d="M30 4C18 4 8 14 8 26V50C8 58 14 66 24 66C34 66 40 58 40 50V26C40 20 36 14 30 14C24 14 20 20 20 26V46"
                stroke="url(#clipGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              
              {/* Inner clip curve */}
              <motion.path
                d="M30 10C21 10 14 18 14 28V48C14 54 18 60 26 60C34 60 38 54 38 48V28C38 22 34 18 30 18"
                stroke="url(#clipGradientInner)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="clipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a8a8a8" />
                  <stop offset="50%" stopColor="#d4d4d4" />
                  <stop offset="100%" stopColor="#8a8a8a" />
                </linearGradient>

                <linearGradient id="clipGradientInner" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c4c4c4" />
                  <stop offset="50%" stopColor="#e8e8e8" />
                  <stop offset="100%" stopColor="#a0a0a0" />
                </linearGradient>

              </defs>
            </motion.svg>


            {/* Face overlay on top of clip */}
            <div className="absolute top-[18px] left-1/2 -translate-x-1/2 flex flex-col items-center">
              {/* Eyebrows */}
              <motion.div 
                className="flex gap-3 mb-0.5"

                animate={{ y: eyebrowRaise ? -3 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <motion.div 
                  className="w-3 h-0.5 bg-gray-600 rounded-full"

                  style={{ rotate: -15 }}
                  animate={{ rotate: eyebrowRaise ? -25 : -15 }}
                />
                <motion.div 
                  className="w-3 h-0.5 bg-gray-600 rounded-full"

                  style={{ rotate: 15 }}
                  animate={{ rotate: eyebrowRaise ? 25 : 15 }}
                />
              </motion.div>
              
              {/* Eyes - googly style */}
              <div className="flex gap-2.5">
                <div className="relative w-5 h-5 rounded-full bg-white border-2 border-gray-300 overflow-hidden shadow-inner">
                  <motion.div 
                    className="absolute w-2.5 h-2.5 bg-gray-800 rounded-full"

                    style={{ 
                      x: eyeX, 
                      y: eyeY,
                      top: "50%",
                      left: "50%",
                      marginTop: "-5px",
                      marginLeft: "-5px",
                    }}
                  />
                </div>

                <div className="relative w-5 h-5 rounded-full bg-white border-2 border-gray-300 overflow-hidden shadow-inner">
                  <motion.div 
                    className="absolute w-2.5 h-2.5 bg-gray-800 rounded-full"

                    style={{ 
                      x: eyeX, 
                      y: eyeY,
                      top: "50%",
                      left: "50%",
                      marginTop: "-5px",
                      marginLeft: "-5px",
                    }}
                  />
                </div>

              </div>
            </div>


            {/* Notification dot */}
            <AnimatePresence>
              {!isExpanded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent flex items-center justify-center shadow-md"

                >
                  <motion.span 
                    className="text-[11px] font-bold text-accent-foreground"

                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    !
                  </motion.span>

                </motion.div>
              )}
            </AnimatePresence>


            {/* Hover glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-accent/20 blur-xl -z-10"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>

        </motion.div>
      )}
    </AnimatePresence>

  )
}
