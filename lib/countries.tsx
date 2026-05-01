"use client"

import { Badge } from "@/components/ui/badge"
import { COUNTRIES, getCountryName, getCountryOption, normalizeCountryCode } from "@/lib/country-data"
import { cn } from "@/lib/utils"

export { COUNTRIES, getCountryName, getCountryOption, normalizeCountryCode }

export function CountryCodeBadge({
  code,
  className,
  label,
}: {
  code: string
  className?: string
  label?: string
}) {
  const normalized = normalizeCountryCode(code)
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 min-w-8 justify-center rounded-[4px] border-border bg-background px-1.5 font-mono text-[10px] font-semibold tracking-normal",
        className,
      )}
      aria-label={label || getCountryName(normalized)}
      title={label || getCountryName(normalized)}
    >
      {normalized}
    </Badge>
  )
}
