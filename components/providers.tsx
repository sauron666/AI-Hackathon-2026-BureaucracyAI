"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/lib/auth/context"
import { LanguageProvider } from "@/lib/i18n-context"
import { TrialProvider } from "@/lib/trial/context"
import { ThemeProvider } from "@/lib/theme/context"
import { CommandPaletteProvider } from "@/components/app/command-palette"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TrialProvider>
            <CommandPaletteProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </CommandPaletteProvider>
          </TrialProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
