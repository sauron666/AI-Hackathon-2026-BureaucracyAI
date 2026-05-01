"use client"

import { motion, useScroll, useTransform, useSpring } from "motion/react"
import { useRef, useEffect, useState } from "react"
import { FileText, Stamp, CheckSquare, Pen, ClipboardList } from "lucide-react"

const floatingItems = [
  { Icon: FileText, delay: 0, x: "10%", y: "20%", rotate: -15, size: 32, parallaxSpeed: 0.3 },
  { Icon: Stamp, delay: 0.3, x: "85%", y: "25%", rotate: 12, size: 28, parallaxSpeed: 0.5 },
  { Icon: CheckSquare, delay: 0.6, x: "15%", y: "70%", rotate: 8, size: 24, parallaxSpeed: 0.4 },
  { Icon: Pen, delay: 0.9, x: "80%", y: "65%", rotate: -20, size: 26, parallaxSpeed: 0.6 },
  { Icon: ClipboardList, delay: 1.2, x: "50%", y: "85%", rotate: 5, size: 30, parallaxSpeed: 0.35 },
]

export function FloatingElements() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  // Smooth mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {floatingItems.map(({ Icon, delay, x, y, rotate, size, parallaxSpeed }, index) => (
        <FloatingItem 
          key={index}
          Icon={Icon}
          delay={delay}
          initialX={x}
          initialY={y}
          rotate={rotate}
          size={size}
          parallaxSpeed={parallaxSpeed}
          scrollProgress={scrollYProgress}
          mousePosition={mousePosition}
          index={index}
        />
      ))}
    </div>
  )
}

interface FloatingItemProps {
  Icon: typeof FileText
  delay: number
  initialX: string
  initialY: string
  rotate: number
  size: number
  parallaxSpeed: number
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"]
  mousePosition: { x: number; y: number }
  index: number
}

function FloatingItem({ 
  Icon, 
  delay, 
  initialX, 
  initialY, 
  rotate, 
  size, 
  parallaxSpeed,
  scrollProgress, 
  mousePosition,
  index 
}: FloatingItemProps) {
  // Scroll-based parallax
  const scrollY = useTransform(scrollProgress, [0, 1], [0, 150 * parallaxSpeed])
  const scrollOpacity = useTransform(scrollProgress, [0, 0.6], [0.7, 0])
  
  // Smooth spring-based mouse follow
  const mouseInfluenceX = useSpring(mousePosition.x * 15 * parallaxSpeed, {
    stiffness: 50,
    damping: 30,
    mass: 1,
  })
  const mouseInfluenceY = useSpring(mousePosition.y * 15 * parallaxSpeed, {
    stiffness: 50,
    damping: 30,
    mass: 1,
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, rotate: rotate - 30 }}
      animate={{ 
        opacity: 0.7, 
        scale: 1, 
        rotate,
      }}
      transition={{
        opacity: { delay, duration: 0.6, ease: "easeOut" },
        scale: { delay, duration: 0.6, type: "spring", stiffness: 200, damping: 20 },
        rotate: { delay, duration: 0.6, type: "spring", stiffness: 100, damping: 15 },
      }}
      style={{ 
        left: initialX, 
        top: initialY,
        y: scrollY,
        x: mouseInfluenceX,
        opacity: scrollOpacity,
        // GPU acceleration
        willChange: "transform, opacity",
        transform: "translateZ(0)",
      }}
      className="absolute"
    >
      <motion.div 
        animate={{
          y: [0, -12, 0],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          y: { 
            duration: 4 + index * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay,
          },
          rotate: {
            duration: 6 + index,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 1,
          }
        }}
        className="p-3 rounded-xl bg-card/90 border border-border/50 shadow-lg backdrop-blur-sm gpu-accelerated"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      >
        <Icon 
          size={size} 
          className="text-primary/70"
          strokeWidth={1.5}
        />
      </motion.div>
    </motion.div>
  )
}
