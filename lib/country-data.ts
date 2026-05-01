export interface CountryOption {
  code: string
  aliases?: string[]
  name: string
}

export const COUNTRIES: CountryOption[] = [
  { code: "BG", name: "Bulgaria" },
  { code: "DE", name: "Germany" },
  { code: "GB", aliases: ["UK"], name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "RO", name: "Romania" },
  { code: "GR", name: "Greece" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "NO", name: "Norway" },
  { code: "CH", name: "Switzerland" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
]

export function normalizeCountryCode(code?: string | null): string {
  const normalized = (code || "").trim().toUpperCase()
  if (normalized === "UK") return "GB"
  return normalized
}

export function getCountryOption(code?: string | null): CountryOption | undefined {
  const normalized = normalizeCountryCode(code)
  return COUNTRIES.find(
    (country) => country.code === normalized || country.aliases?.includes(normalized),
  )
}

export function getCountryName(code: string): string {
  return getCountryOption(code)?.name || normalizeCountryCode(code) || code
}
