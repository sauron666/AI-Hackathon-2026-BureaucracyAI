"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { LanguagePicker } from "@/components/language-picker"
import { ThemePicker } from "@/components/ui/theme-picker"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n-context"

export function Header() {
  const { user, isLoading } = useAuth()
  const { translate: tr } = useI18n()

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
            <Image src="/wisp-logo.svg" alt={tr("appShell.logoAlt")} width={31} height={36} priority />
          </div>
          <span className="text-xl font-semibold tracking-tight">FormWise</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemePicker />
          <LanguagePicker />
          
          {!isLoading && (
            <>
              {user ? (
                <Button asChild size="sm">
                  <Link href="/dashboard">{tr("header.dashboard")}</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">{tr("header.login")}</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">{tr("header.getStarted")}</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
