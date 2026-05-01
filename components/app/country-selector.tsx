"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COUNTRIES, CountryCodeBadge, getCountryName, normalizeCountryCode } from "@/lib/countries"

export { COUNTRIES, getCountryName }

interface CountrySelectorProps {
  value: string
  onChange: (country: string) => void
  disabled?: boolean
}

export function CountrySelector({ value, onChange, disabled }: CountrySelectorProps) {
  const normalizedValue = normalizeCountryCode(value)

  return (
    <Select value={normalizedValue} onValueChange={(next) => onChange(normalizeCountryCode(next))} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select country">
          {normalizedValue && COUNTRIES.find(c => c.code === normalizedValue) && (
            <span className="flex items-center gap-2">
              <CountryCodeBadge code={normalizedValue} />
              {COUNTRIES.find(c => c.code === normalizedValue)?.name}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <CountryCodeBadge code={country.code} />
              {country.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function getCountryFlag(code: string): string {
  return normalizeCountryCode(code)
}
