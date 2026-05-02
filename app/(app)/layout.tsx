"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { LanguagePicker } from "@/components/language-picker"
import {
  MessageSquare,
  LayoutDashboard,
  FolderOpen,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemePicker } from "@/components/ui/theme-picker"
import { FormWiseClippy } from "@/components/ui/formwise-clippy"
import { useCommandPalette } from "@/components/app/command-palette"
import { useI18n } from "@/lib/i18n-context"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, logout } = useAuth()
  const { translate: tr } = useI18n()
  const { setOpen: openCommandPalette } = useCommandPalette()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const saved = localStorage.getItem("formwise-sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    let lastG = 0
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }

      if (e.key.toLowerCase() === "g") {
        lastG = Date.now()
        return
      }

      if (Date.now() - lastG < 700) {
        const key = e.key.toLowerCase()
        const map: Record<string, string> = { d: "/dashboard", a: "/ask", b: "/browse", h: "/history" }
        if (map[key]) {
          e.preventDefault()
          router.push(map[key])
          lastG = 0
        }
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{tr("common.loading")}</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: "/dashboard", label: tr("nav.dashboard"), icon: LayoutDashboard, hint: "G D" },
    { href: "/ask", label: tr("nav.ask"), icon: MessageSquare, hint: "G A" },
    { href: "/browse", label: tr("nav.browse"), icon: FolderOpen, hint: "G B" },
    { href: "/history", label: tr("nav.history"), icon: History, hint: "G H" },
  ]

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("formwise-sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 border-r border-sidebar-border bg-sidebar flex-col transition-[width,transform] duration-300",
          "h-dvh overflow-hidden lg:fixed lg:flex lg:translate-x-0",
          collapsed ? "lg:w-[76px] w-64" : "w-64",
          sidebarOpen ? "flex translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-sidebar-border transition-transform group-hover:scale-105">
              <Image src="/wisp-logo.svg" alt={tr("appShell.logoAlt")} width={31} height={36} priority />
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-sidebar" />
            </div>
            <span
              className={cn(
                "text-xl font-semibold tracking-tight transition-opacity",
                collapsed && "lg:hidden",
              )}
            >
              FormWise
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label={tr("appShell.closeMenu")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className={cn("px-3 pt-3", collapsed && "lg:px-2")}>
          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground",
              collapsed && "lg:justify-center lg:px-2",
            )}
            aria-label={tr("appShell.openCommandPalette")}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className={cn("flex-1 text-left", collapsed && "lg:hidden")}>
              {tr("appShell.searchPlaceholder")}
            </span>
            <kbd
              className={cn(
                "hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex",
                collapsed && "lg:hidden",
              )}
            >
              [Ctrl]+[K]
            </kbd>
          </button>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto p-3 pt-4", collapsed && "lg:px-2")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  collapsed && "lg:justify-center lg:px-2",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn("flex-1", collapsed && "lg:hidden")}>{item.label}</span>
                <kbd
                  className={cn(
                    "hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:inline-block",
                    collapsed && "lg:hidden",
                  )}
                >
                  {item.hint}
                </kbd>
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "hidden w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground lg:flex",
              collapsed && "lg:justify-center lg:px-2",
            )}
            aria-label={collapsed ? tr("appShell.expand") : tr("appShell.collapse")}
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
            <span className={cn(collapsed && "lg:hidden")}>{tr("appShell.collapse")}</span>
          </button>

          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2",
              collapsed && "lg:justify-center lg:px-1",
            )}
          >
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-semibold ring-2 ring-background">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={cn("flex-1 min-w-0", collapsed && "lg:hidden")}>
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className={cn("flex gap-2", collapsed && "lg:flex-col")}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn("flex-1 justify-start gap-2", collapsed && "lg:justify-center lg:px-0")}
              title={tr("appShell.settings")}
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className={cn(collapsed && "lg:hidden")}>{tr("appShell.settings")}</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title={tr("appShell.logout")}
              aria-label={tr("appShell.logout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className={cn("flex min-h-screen flex-col min-w-0 transition-[margin] duration-300", collapsed ? "lg:ml-[76px]" : "lg:ml-64")}>
        <header
          className={cn(
            "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 backdrop-blur-lg px-4 sm:px-6 transition-shadow duration-300",
            scrolled && "shadow-sm shadow-black/[0.03]",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label={tr("appShell.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <button
            type="button"
            onClick={() => openCommandPalette(true)}
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary"
          >
            <Search className="h-4 w-4" />
            <span>{tr("appShell.searchFull")}</span>
            <kbd className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              [Ctrl]+[K]
            </kbd>
          </button>

          <div className="flex-1" />

          <ThemePicker />
          <LanguagePicker />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <FormWiseClippy initialDelay={2500} />
    </div>
  )
}
