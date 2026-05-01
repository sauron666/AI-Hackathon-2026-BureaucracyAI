"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react"
import { useTheme, THEME_PRESETS, type ThemePreset, type ThemeMode } from "@/lib/theme/context"
import { useI18n } from "@/lib/i18n-context"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const modeOptions: { value: ThemeMode; labelKey: string; icon: typeof Sun }[] = [
  { value: "light", labelKey: "theme.light", icon: Sun },
  { value: "dark", labelKey: "theme.dark", icon: Moon },
  { value: "system", labelKey: "theme.system", icon: Monitor },
]

const presetColors: Record<ThemePreset, { primary: string; accent: string }> = {
  warm: { primary: "#e07c3f", accent: "#5ab07a" },
  fresh: { primary: "#2d9ca8", accent: "#4bb87d" },
}

export function ThemePicker() {
  const { translate: tr } = useI18n()
  const { preset, mode, setPreset, setMode } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-secondary/80 transition-colors duration-300"
        >
          <motion.div
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Palette className="h-5 w-5" />
          </motion.div>
          <span className="sr-only">{tr("theme.change")}</span>
        </Button>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent
            className="w-72 p-0 overflow-hidden"
            align="end"
            sideOffset={8}
            asChild
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="p-4 space-y-4">
                {/* Theme Presets */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">{tr("theme.colorTheme")}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => (
                      <motion.button
                        key={key}
                        onClick={() => setPreset(key)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          preset === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        {/* Color preview circles */}
                        <div className="flex gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: presetColors[key].primary }}
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: presetColors[key].accent }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {tr(`theme.${key}`)}
                        </span>
                        {preset === key && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5"
                          >
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Mode Selection */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">{tr("theme.appearance")}</h4>
                  <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                    {modeOptions.map(({ value, labelKey, icon: Icon }) => (
                      <motion.button
                        key={value}
                        onClick={() => setMode(value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                          mode === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr(labelKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  )
}
