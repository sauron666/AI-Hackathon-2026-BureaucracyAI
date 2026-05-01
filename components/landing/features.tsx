"use client"

import { motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react"
import { useRef } from "react"
import { useI18n } from "@/lib/i18n-context"
import { FileSearch, ListChecks, Globe2, Clock, Shield, MessageSquareText } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: "easeOut" as const,
    },
  },
}

export function Features() {
  const { translate: tr } = useI18n()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const features = [
    {
      icon: FileSearch,
      title: tr("landing.features.items.analysisTitle"),
      description: tr("landing.features.items.analysisDescription"),
    },
    {
      icon: ListChecks,
      title: tr("landing.features.items.guidanceTitle"),
      description: tr("landing.features.items.guidanceDescription"),
    },
    {
      icon: Globe2,
      title: tr("landing.features.items.supportTitle"),
      description: tr("landing.features.items.supportDescription"),
    },
    {
      icon: Clock,
      title: tr("landing.features.items.timeTitle"),
      description: tr("landing.features.items.timeDescription"),
    },
    {
      icon: Shield,
      title: tr("landing.features.items.checklistTitle"),
      description: tr("landing.features.items.checklistDescription"),
    },
    {
      icon: MessageSquareText,
      title: tr("landing.features.items.askTitle"),
      description: tr("landing.features.items.askDescription"),
    },
  ]

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-balance">
            {tr("landing.features.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {tr("landing.features.subtitle")}
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  feature: { icon: typeof FileSearch; title: string; description: string }
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Mouse position for tilt effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Smooth spring animations for tilt
  const springConfig = { stiffness: 300, damping: 30, mass: 0.5 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig)
  
  // Shine effect position
  const shineX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig)
  const shineY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 1000,
      }}
      className="group relative rounded-2xl border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/50 overflow-hidden gpu-accelerated"
    >
      {/* Subtle shine effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(var(--primary), 0.08) 0%, transparent 50%)`,
        }}
      />
      
      {/* Icon with spring animation */}
      <motion.div 
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        style={{ transform: "translateZ(20px)" }}
      >
        <feature.icon className="h-6 w-6" />
      </motion.div>
      
      <h3 
        className="mb-2 text-lg font-semibold"
        style={{ transform: "translateZ(10px)" }}
      >
        {feature.title}
      </h3>
      <p 
        className="text-muted-foreground text-sm leading-relaxed"
        style={{ transform: "translateZ(5px)" }}
      >
        {feature.description}
      </p>
      
      {/* Bottom highlight line */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0"
        initial={{ width: "0%", left: "50%" }}
        whileHover={{ width: "100%", left: "0%" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </motion.div>
  )
}
