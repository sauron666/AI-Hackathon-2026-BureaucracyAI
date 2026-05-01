"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"
import { ArrowRight, Sparkles, FileText, CheckCircle } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" as const },
  },
}

const floatingVariants = {
  float: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
}

interface HeroProps {
  onTryDemo: () => void
}

export function Hero({ onTryDemo }: HeroProps) {
  const { translate: tr } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  // Smooth mouse following for background elements
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left - rect.width / 2) / 20)
    mouseY.set((e.clientY - rect.top - rect.height / 2) / 20)
  }

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Animated background orbs with parallax */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          style={{ x: smoothX, y: smoothY }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-primary/15 to-accent/10 blur-3xl"
        />
        <motion.div
          style={{ x: useTransform(smoothX, v => -v), y: useTransform(smoothY, v => -v) }}
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/3 right-1/4 h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-accent/15 to-primary/5 blur-3xl"
        />
      </div>

      <motion.div 
        style={{ y, opacity, scale }}
        className="relative z-10"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <motion.span 
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-5 py-2 text-sm text-foreground cursor-default"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              {tr("landing.hero.badge")}
            </motion.span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            variants={itemVariants}
            className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl text-balance"
          >
            {tr("landing.hero.titlePrefix")}{" "}
            <span className="relative">
              <span className="text-primary">{tr("landing.hero.titleHighlight")}</span>
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                className="absolute -bottom-2 left-0 w-full h-3 text-accent/40"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.path
                  d="M2 8C50 4 100 2 150 6C200 10 250 4 298 8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </motion.svg>
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            variants={itemVariants}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl text-pretty leading-relaxed"
          >
            {tr("landing.hero.subtitle")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button 
              size="lg" 
              onClick={onTryDemo}
              className="group gap-2 text-base h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              {tr("landing.hero.tryFree")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-base h-12 px-8 hover:bg-secondary/80 transition-all duration-300"
              asChild
            >
              <a href="#features">{tr("landing.hero.seeHow")}</a>
            </Button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p 
            variants={itemVariants}
            className="mt-8 text-sm text-muted-foreground"
          >
            {tr("landing.hero.trust")}
          </motion.p>

          {/* Floating mini cards */}
          <div className="hidden lg:block">
            <motion.div
              variants={floatingVariants}
              animate="float"
              className="absolute -left-16 top-1/3 p-4 rounded-xl bg-card border border-border/50 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{tr("landing.hero.docLabel")}</p>
                  <p className="text-sm font-medium">{tr("landing.hero.docValue")}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={floatingVariants}
              animate="float"
              transition={{ delay: 1 }}
              className="absolute -right-12 top-1/2 p-4 rounded-xl bg-card border border-border/50 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{tr("landing.hero.stepLabel")}</p>
                  <p className="text-sm font-medium">{tr("landing.hero.stepValue")}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
