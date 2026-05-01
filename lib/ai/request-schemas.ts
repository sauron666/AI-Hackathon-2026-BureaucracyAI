import { z } from 'zod';
import { COUNTRY_NAMES, type Country, type Language } from '@/lib/types';

export const supportedCountryCodes = Object.keys(COUNTRY_NAMES) as [
  Country,
  ...Country[],
];

export const supportedLanguageCodes = [
  'en',
  'de',
  'bg',
] as const satisfies readonly Language[];

export const SupportedCountrySchema = z.enum(supportedCountryCodes);
export const SupportedLanguageSchema = z.enum(supportedLanguageCodes);
export const SupportedCountryInputSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(SupportedCountrySchema);
export const SupportedLanguageInputSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(SupportedLanguageSchema);

const documentTypeAliases: Record<string, string> = {
  contract: 'contract',
  contracts: 'contract',
  rental: 'rental',
  rent: 'rental',
  lease: 'rental',
  tenancy: 'rental',
  employment: 'employment',
  job: 'employment',
  work: 'employment',
  official_letter: 'official_letter',
  'official letter': 'official_letter',
  letter: 'official_letter',
  notice: 'official_letter',
};

export function normalizeDocumentType(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, '_');
  return documentTypeAliases[normalized] || normalized;
}
