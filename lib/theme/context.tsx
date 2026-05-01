"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemePreset = "warm" | "fresh"
export type ThemeMode = "light" | "dark" | "system"

interface ThemeContextType {
  preset: ThemePreset
  mode: ThemeMode
  resolvedMode: "light" | "dark"
  setPreset: (preset: ThemePreset) => void
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_PRESETS = {
  warm: {
    name: "Warm & Friendly",
    light: {
      "--background": "oklch(0.985 0.008 55)",
      "--foreground": "oklch(0.22 0.03 45)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.22 0.03 45)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.22 0.03 45)",
      "--primary": "oklch(0.58 0.16 35)",
      "--primary-foreground": "oklch(0.98 0.005 55)",
      "--secondary": "oklch(0.96 0.015 55)",
      "--secondary-foreground": "oklch(0.32 0.03 45)",
      "--muted": "oklch(0.95 0.012 55)",
      "--muted-foreground": "oklch(0.48 0.02 45)",
      "--accent": "oklch(0.68 0.14 145)",
      "--accent-foreground": "oklch(0.18 0.04 145)",
      "--destructive": "oklch(0.55 0.2 25)",
      "--destructive-foreground": "oklch(0.98 0 0)",
      "--border": "oklch(0.91 0.012 55)",
      "--input": "oklch(0.91 0.012 55)",
      "--ring": "oklch(0.58 0.16 35)",
      "--sidebar": "oklch(0.975 0.008 55)",
      "--sidebar-foreground": "oklch(0.22 0.03 45)",
      "--sidebar-primary": "oklch(0.58 0.16 35)",
      "--sidebar-primary-foreground": "oklch(0.98 0.005 55)",
      "--sidebar-accent": "oklch(0.95 0.012 55)",
      "--sidebar-accent-foreground": "oklch(0.32 0.03 45)",
      "--sidebar-border": "oklch(0.91 0.012 55)",
      "--sidebar-ring": "oklch(0.58 0.16 35)",
    },
    dark: {
      "--background": "oklch(0.15 0.015 45)",
      "--foreground": "oklch(0.94 0.012 55)",
      "--card": "oklch(0.19 0.018 45)",
      "--card-foreground": "oklch(0.94 0.012 55)",
      "--popover": "oklch(0.19 0.018 45)",
      "--popover-foreground": "oklch(0.94 0.012 55)",
      "--primary": "oklch(0.72 0.15 35)",
      "--primary-foreground": "oklch(0.15 0.015 45)",
      "--secondary": "oklch(0.25 0.018 45)",
      "--secondary-foreground": "oklch(0.94 0.012 55)",
      "--muted": "oklch(0.25 0.018 45)",
      "--muted-foreground": "oklch(0.62 0.02 55)",
      "--accent": "oklch(0.72 0.12 145)",
      "--accent-foreground": "oklch(0.15 0.015 45)",
      "--destructive": "oklch(0.55 0.18 25)",
      "--destructive-foreground": "oklch(0.94 0.012 55)",
      "--border": "oklch(0.30 0.018 45)",
      "--input": "oklch(0.30 0.018 45)",
      "--ring": "oklch(0.72 0.15 35)",
      "--sidebar": "oklch(0.17 0.015 45)",
      "--sidebar-foreground": "oklch(0.94 0.012 55)",
      "--sidebar-primary": "oklch(0.72 0.15 35)",
      "--sidebar-primary-foreground": "oklch(0.15 0.015 45)",
      "--sidebar-accent": "oklch(0.25 0.018 45)",
      "--sidebar-accent-foreground": "oklch(0.94 0.012 55)",
      "--sidebar-border": "oklch(0.30 0.018 45)",
      "--sidebar-ring": "oklch(0.72 0.15 35)",
    },
  },
  fresh: {
    name: "Fresh & Modern",
    light: {
      "--background": "oklch(0.985 0.006 195)",
      "--foreground": "oklch(0.2 0.025 210)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.2 0.025 210)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.2 0.025 210)",
      "--primary": "oklch(0.55 0.15 185)",
      "--primary-foreground": "oklch(0.98 0.005 195)",
      "--secondary": "oklch(0.96 0.012 195)",
      "--secondary-foreground": "oklch(0.3 0.025 210)",
      "--muted": "oklch(0.95 0.01 195)",
      "--muted-foreground": "oklch(0.46 0.02 210)",
      "--accent": "oklch(0.65 0.13 155)",
      "--accent-foreground": "oklch(0.18 0.04 155)",
      "--destructive": "oklch(0.55 0.2 25)",
      "--destructive-foreground": "oklch(0.98 0 0)",
      "--border": "oklch(0.90 0.012 195)",
      "--input": "oklch(0.90 0.012 195)",
      "--ring": "oklch(0.55 0.15 185)",
      "--sidebar": "oklch(0.975 0.006 195)",
      "--sidebar-foreground": "oklch(0.2 0.025 210)",
      "--sidebar-primary": "oklch(0.55 0.15 185)",
      "--sidebar-primary-foreground": "oklch(0.98 0.005 195)",
      "--sidebar-accent": "oklch(0.95 0.01 195)",
      "--sidebar-accent-foreground": "oklch(0.3 0.025 210)",
      "--sidebar-border": "oklch(0.90 0.012 195)",
      "--sidebar-ring": "oklch(0.55 0.15 185)",
    },
    dark: {
      "--background": "oklch(0.14 0.018 210)",
      "--foreground": "oklch(0.94 0.01 195)",
      "--card": "oklch(0.18 0.02 210)",
      "--card-foreground": "oklch(0.94 0.01 195)",
      "--popover": "oklch(0.18 0.02 210)",
      "--popover-foreground": "oklch(0.94 0.01 195)",
      "--primary": "oklch(0.68 0.14 185)",
      "--primary-foreground": "oklch(0.14 0.018 210)",
      "--secondary": "oklch(0.24 0.02 210)",
      "--secondary-foreground": "oklch(0.94 0.01 195)",
      "--muted": "oklch(0.24 0.02 210)",
      "--muted-foreground": "oklch(0.6 0.02 195)",
      "--accent": "oklch(0.7 0.12 155)",
      "--accent-foreground": "oklch(0.14 0.018 210)",
      "--destructive": "oklch(0.55 0.18 25)",
      "--destructive-foreground": "oklch(0.94 0.01 195)",
      "--border": "oklch(0.28 0.02 210)",
      "--input": "oklch(0.28 0.02 210)",
      "--ring": "oklch(0.68 0.14 185)",
      "--sidebar": "oklch(0.16 0.018 210)",
      "--sidebar-foreground": "oklch(0.94 0.01 195)",
      "--sidebar-primary": "oklch(0.68 0.14 185)",
      "--sidebar-primary-foreground": "oklch(0.14 0.018 210)",
      "--sidebar-accent": "oklch(0.24 0.02 210)",
      "--sidebar-accent-foreground": "oklch(0.94 0.01 195)",
      "--sidebar-border": "oklch(0.28 0.02 210)",
      "--sidebar-ring": "oklch(0.68 0.14 185)",
    },
  },
} as const

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>("warm")
  const [mode, setModeState] = useState<ThemeMode>("system")
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)

  // Load saved preferences
  useEffect(() => {
    setMounted(true)
    const savedPreset = localStorage.getItem("formwise-theme-preset") as ThemePreset | null
    const savedMode = localStorage.getItem("formwise-theme-mode") as ThemeMode | null
    
    if (savedPreset && (savedPreset === "warm" || savedPreset === "fresh")) {
      setPresetState(savedPreset)
    }
    if (savedMode && (savedMode === "light" || savedMode === "dark" || savedMode === "system")) {
      setModeState(savedMode)
    }
  }, [])

  // Resolve system preference
  useEffect(() => {
    if (!mounted) return

    const updateResolvedMode = () => {
      if (mode === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setResolvedMode(isDark ? "dark" : "light")
      } else {
        setResolvedMode(mode)
      }
    }

    updateResolvedMode()

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", updateResolvedMode)
    return () => mediaQuery.removeEventListener("change", updateResolvedMode)
  }, [mode, mounted])

  // Apply theme variables
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const themeColors = THEME_PRESETS[preset][resolvedMode]

    // Apply CSS variables
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Toggle dark class
    if (resolvedMode === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [preset, resolvedMode, mounted])

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset)
    localStorage.setItem("formwise-theme-preset", newPreset)
  }

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem("formwise-theme-mode", newMode)
  }

  return (
    <ThemeContext.Provider value={{ preset, mode, resolvedMode, setPreset, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export { THEME_PRESETS }
