"use client"

import { useState, useRef } from "react"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { DemoPreview } from "@/components/landing/demo-preview"
import { FloatingElements } from "@/components/landing/floating-elements"
import { FormWiseClippy } from "@/components/ui/formwise-clippy"
import { AnswerDisplay } from "@/components/app/answer-display"
import { useTrial } from "@/lib/trial/context"
import { useAuth } from "@/lib/auth/context"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, X, Shield, Zap, Users } from "lucide-react"
import type { BureaucracyResponse } from "@/lib/ai/schemas"
import { useI18n } from "@/lib/i18n-context"
import { toast } from "sonner"

export default function LandingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canUseFreeTrial, markTrialUsed, usedTrial } = useTrial()
  const { translate: tr, language } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<BureaucracyResponse | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const demoRef = useRef<HTMLDivElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const trustBadges = [
    { icon: Shield, label: tr("landing.trustBadges.secure") },
    { icon: Zap, label: tr("landing.trustBadges.instant") },
    { icon: Users, label: tr("landing.trustBadges.users") },
  ]

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToResponse = () => {
    if (!responseRef.current) return

    const targetTop = window.scrollY + responseRef.current.getBoundingClientRect().top - 96
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    })
  }

  const handleDemoSubmit = async (question: string) => {
    if (!user && usedTrial) {
      setShowLoginPrompt(true)
      return
    }

    setIsLoading(true)
    setResponse(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToResponse()
      })
    })

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question, country: "BG", language }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to get answer")
      }

      const data = await res.json()
      const nextResponse = data.response ?? null

      if (!nextResponse) {
        throw new Error("The server did not return a procedure answer")
      }

      setResponse(nextResponse)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToResponse()
        })
      })
      
      if (!user) {
        markTrialUsed()
      }
    } catch (error) {
      console.error("Demo error:", error)
      toast.error(tr("askPage.failedAnswer"), {
        description: error instanceof Error ? error.message : tr("askPage.checkConnection"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseResponse = () => {
    setResponse(null)
  }

  return (
    <div ref={containerRef} className="min-h-screen relative">
      <Header />
      
      {/* Parallax Background */}
      <motion.div 
        style={{ y: backgroundY }}
        className="fixed inset-0 -z-20 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </motion.div>
      
      <main className="relative">
        {/* Hero with floating elements */}
        <div className="relative">
          <FloatingElements />
          <Hero onTryDemo={scrollToDemo} />
        </div>

        {/* Trust Badges */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-8 border-y border-border/50 bg-secondary/30"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              {trustBadges.map((badge, index) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <badge.icon className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">{badge.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        
        {/* Demo Section - Higher up now */}
        <div ref={demoRef}>
          <DemoPreview onSubmit={handleDemoSubmit} isLoading={isLoading} />
        </div>

        {/* Response Display */}
        <div ref={responseRef} className="relative scroll-mt-24" />
        <AnimatePresence>
          {(isLoading || response) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12 px-4 sm:px-6"
            >
              <div className="mx-auto max-w-4xl">
                {isLoading ? (
                  <Card className="p-12">
                    <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-8 w-8 text-primary" />
                      </motion.div>
                      <p className="text-muted-foreground">{tr("landing.loading")}</p>
                    </CardContent>
                  </Card>
                ) : response ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCloseResponse}
                        className="group"
                      >
                        <X className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                        {tr("common.close")}
                      </Button>
                    </div>
                    <AnswerDisplay response={response} />
                  </div>
                ) : null}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Features - After demo */}
        <Features />

        {/* Login Prompt Modal */}
        <AnimatePresence>
          {showLoginPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <Card className="max-w-md w-full p-6 shadow-2xl">
                  <CardContent className="pt-6 text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center"
                    >
                      <Shield className="h-8 w-8 text-accent" />
                    </motion.div>
                    <h3 className="text-xl font-semibold">{tr("landing.authPrompt.title")}</h3>
                    <p className="text-muted-foreground">
                      {tr("landing.authPrompt.body")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1 group"
                        onClick={() => setShowLoginPrompt(false)}
                      >
                        {tr("landing.authPrompt.later")}
                      </Button>
                      <Button 
                        className="flex-1 group"
                        onClick={() => router.push("/register")}
                      >
                        {tr("landing.authPrompt.create")}
                      </Button>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-sm"
                      onClick={() => router.push("/login")}
                    >
                      {tr("landing.authPrompt.existing")}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="border-t border-border py-12 mt-24 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {tr("landing.footer.product")}
              </p>
              <p className="text-sm text-muted-foreground">
                {tr("landing.footer.tagline")}
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* FormWise Clippy Helper */}
      <FormWiseClippy initialDelay={8000} />
    </div>
  )
}
