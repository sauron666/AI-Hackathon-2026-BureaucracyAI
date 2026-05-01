"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useAuth } from "@/lib/auth/context"
import { COUNTRIES, CountryCodeBadge } from "@/lib/countries"
import { useI18n } from "@/lib/i18n-context"
import { useTheme } from "@/lib/theme/context"
import { categories } from "@/components/app/browse-categories"
import {
  ArrowRight,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from "lucide-react"

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  }
  return ctx
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { logout } = useAuth()
  const { translate: tr } = useI18n()
  const { mode, setMode, setPreset } = useTheme()
  const [open, setOpen] = useState(false)

  const quickAsks = [
    tr("commandPalette.quickAskResidence"),
    tr("commandPalette.quickAskCompany"),
    tr("commandPalette.quickAskPassport"),
    tr("commandPalette.quickAskLicense"),
  ]

  const toggle = useCallback(() => setOpen((o) => !o), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle])

  const run = (fn: () => void) => {
    setOpen(false)
    requestAnimationFrame(fn)
  }

  const goToAsk = (question?: string) => {
    if (question) {
      router.push(`/ask?q=${encodeURIComponent(question)}`)
    } else {
      router.push("/ask")
    }
  }

  const goToCategory = (categoryId: string) => {
    router.push(`/browse?category=${encodeURIComponent(categoryId)}`)
  }

  const setCountry = (code: string) => {
    try {
      localStorage.setItem("formwise-country", code)
      window.dispatchEvent(new CustomEvent("formwise:country-changed", { detail: code }))
    } catch {}
  }

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={tr("commandPalette.title")}
        description={tr("commandPalette.description")}
        className="max-w-xl"
      >
        <CommandInput placeholder={tr("commandPalette.placeholder")} />
        <CommandList>
          <CommandEmpty>{tr("common.noResults")}</CommandEmpty>

          <CommandGroup heading={tr("commandPalette.navigation")}>
            <CommandItem onSelect={() => run(() => router.push("/dashboard"))}>
              <LayoutDashboard />
              {tr("nav.dashboard")}
              <CommandShortcut>G D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/ask"))}>
              <MessageSquare />
              {tr("askPage.title")}
              <CommandShortcut>G A</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/browse"))}>
              <FolderOpen />
              {tr("browse.title")}
              <CommandShortcut>G B</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/history"))}>
              <History />
              {tr("nav.history")}
              <CommandShortcut>G H</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tr("commandPalette.quickAsk")}>
            {quickAsks.map((q) => (
              <CommandItem key={q} value={`ask ${q}`} onSelect={() => run(() => goToAsk(q))}>
                <Sparkles className="text-primary" />
                <span className="truncate">{q}</span>
                <ArrowRight className="ml-auto opacity-60" />
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tr("commandPalette.procedureCategories")}>
            {categories.map((c) => (
              <CommandItem
                key={c.id}
                value={`category ${c.name} ${c.description}`}
                onSelect={() => run(() => goToCategory(c.id))}
              >
                <c.icon />
                {c.name}
                <span className="ml-auto text-xs text-muted-foreground">
                  {tr("commandPalette.procedureCount", { count: String(c.procedureCount) })}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tr("commandPalette.switchCountry")}>
            {COUNTRIES.map((c) => (
              <CommandItem
                key={c.code}
                value={`country ${c.name} ${c.code}`}
                onSelect={() => run(() => setCountry(c.code))}
              >
                <CountryCodeBadge code={c.code} />
                {c.name}
                <span className="ml-auto text-xs text-muted-foreground">{c.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tr("commandPalette.appearance")}>
            <CommandItem
              onSelect={() => run(() => setMode(mode === "dark" ? "light" : "dark"))}
            >
              {mode === "dark" ? <Sun /> : <Moon />}
              {mode === "dark" ? tr("commandPalette.switchToLight") : tr("commandPalette.switchToDark")}
            </CommandItem>
            <CommandItem onSelect={() => run(() => setPreset("warm"))}>
              <Palette className="text-primary" />
              {tr("theme.warm")}
            </CommandItem>
            <CommandItem onSelect={() => run(() => setPreset("fresh"))}>
              <Palette className="text-accent" />
              {tr("theme.fresh")}
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={tr("commandPalette.account")}>
            <CommandItem
              onSelect={() => run(() => { logout(); router.push("/") })}
              className="text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
            >
              <LogOut />
              {tr("appShell.logout")}
            </CommandItem>
          </CommandGroup>
        </CommandList>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{tr("commandPalette.footer")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{tr("commandPalette.navigate")}</span>
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border text-[10px]">
              ↑↓
            </kbd>
            <span className="hidden sm:inline">{tr("commandPalette.open")}</span>
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border text-[10px]">
              ↵
            </kbd>
            <span className="hidden sm:inline">{tr("common.close")}</span>
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border text-[10px]">
              Esc
            </kbd>
          </div>
        </div>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  )
}
