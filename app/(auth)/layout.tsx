"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "motion/react"
import { LanguagePicker } from "@/components/language-picker"
import { useI18n } from "@/lib/i18n-context"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { translate: tr } = useI18n()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border/40 bg-background/80 backdrop-blur-lg"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
              <Image src="/wisp-logo.svg" alt={tr("appShell.logoAlt")} width={31} height={36} priority />
            </div>
            <span className="text-xl font-semibold tracking-tight">FormWise</span>
          </Link>
          <LanguagePicker />
        </div>
      </motion.header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        />
      </div>
    </div>
  )
}
