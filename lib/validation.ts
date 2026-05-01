import { z } from 'zod';
import { COUNTRY_NAMES, CATEGORIES } from './types';

/**
 * Validation schemas for API requests
 */

// Country code validation
export const countryCodeSchema = z.enum([
  'BG', 'DE', 'NL', 'PT', 'ES', 'FR', 'PL', 'CZ',
  'AT', 'SE', 'HR', 'GR', 'RO', 'GE', 'RS', 'GB', 'CH', 'UA'
]);

export type CountryCode = z.infer<typeof countryCodeSchema>;

// Language code validation
export const languageCodeSchema = z.enum(['en', 'bg', 'de']);

// Ingest request validation
export const ingestRequestSchema = z.object({
  file_url: z.string().url().optional().or(z.literal('')),
  text_override: z.string().min(1).optional(),
  metadata: z.object({
    country: countryCodeSchema.optional(),
    category: z.string().optional(),
    source_url: z.string().url().optional().or(z.literal('')),
    language: languageCodeSchema.optional(),
    procedure_id: z.string().optional(),
    title: z.string().optional(),
    difficulty: z.enum(['easy', 'moderate', 'complex']).optional(),
  }).optional(),
});

// Chat request validation
export const chatRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  language: languageCodeSchema.default('en'),
  country: countryCodeSchema.default('DE'),
});

// Analyze request validation
export const analyzeRequestSchema = z.object({
  text: z.string().min(1).optional(),
  file_url: z.string().url().optional(),
  document_type: z.enum(['rental', 'employment', 'official_letter', 'contract', 'other']).default('contract'),
  country: countryCodeSchema.default('DE'),
});

// Journey request validation
export const journeyRequestSchema = z.object({
  from_country: z.string().default('unknown'),
  to_country: countryCodeSchema.default('DE'),
  nationality: z.string().optional(),
  purpose: z.enum(['work', 'study', 'retirement', 'family', 'digital_nomad']).default('work'),
  language: languageCodeSchema.default('en'),
});

// Procedures query validation
export const proceduresQuerySchema = z.object({
  country: countryCodeSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
});

/**
 * Validation helpers
 */
export function validateCountry(country: string): boolean {
  return country in COUNTRY_NAMES;
}

export function validateCategory(category: string): boolean {
  return CATEGORIES.includes(category as typeof CATEGORIES[number]);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatValidationError(error: z.ZodError): { field: string; message: string }[] {
  return error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
