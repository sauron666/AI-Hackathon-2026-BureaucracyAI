import type { ProcedureAnswer, DocumentRisk, RelocationJourney, CountryComparison } from './types';

/**
 * Pre-cached demo answers for demo mode fallback
 * These are used when NEXT_PUBLIC_DEMO_MODE=true to skip API calls
 */

export const CACHED_ANSWERS: Record<string, ProcedureAnswer | DocumentRisk> = {
  // Demo Q2: Partner visa Netherlands
  'partner-visa-netherlands': {
    summary: "Your Indian partner will need a团聚签证 (family reunification visa) through the IND (Immigratie- en Naturalisatiedienst). The process takes 3-6 months and requires you to have a valid residence permit in the Netherlands.",
    steps: [
      "Obtain a sponsorship declaration ( Machtiging) from the IND - your partner in NL applies for this",
      "Your partner applies for a provisional residence permit (mvv) at Dutch embassy in India",
      "Submit application via IND portal with required documents",
      "Attend biometric appointment at embassy",
      "Wait for decision (3-6 months)",
      "Travel to Netherlands and register at municipality (Gemeente)"
    ],
    documents: [
      "Valid passport",
      "Sponsorship declaration (Machtiging)",
      "Proof of relationship (marriage certificate)",
      "Proof of accommodation",
      "Proof of income (Jaarrekening or employment contract)",
      "Criminal record certificate (India)",
      "Medical examination certificate"
    ],
    office: "IND (Immigratie- en Naturalisatiedienst) - Dutch Immigration Service",
    fee_info: "€326 for visa application + €193 for residence permit",
    source_url: "https://ind.nl/en/family-members",
    confidence: 0.95,
    answerable: true
  },
  
  // Demo Q3: UK retirement to Portugal
  'uk-retirement-portugal': {
    summary: "As a British citizen, you can apply for a D7 visa (Passive Income Visa) for retirement. The NHR (Non-Habitual Resident) tax regime offers significant tax benefits for 10 years but has strict requirements.",
    steps: [
      "Open a Portuguese bank account (Conta bancária)",
      "Obtain a Portuguese NIF (Número de Identificação Fiscal) tax number",
      "Secure rental accommodation and obtain rental contract",
      "Apply for D7 visa at Portuguese consulate in UK",
      "Travel to Portugal and register at SEF for residence permit",
      "Apply for NHR status at Portuguese tax authority (Autoridade Tributária)",
      "Register with healthcare system (SNS or private insurance)"
    ],
    documents: [
      "Valid UK passport",
      "Proof of passive income (pension statements) - minimum €760/month",
      "Proof of accommodation (rental contract)",
      "Criminal record certificate from UK",
      "Health insurance proof",
      "Bank statements (3 months)",
      "NIF application form"
    ],
    office: "SEF (Serviços de Estrangeiros e Fronteiras) - now AIMA",
    fee_info: "€90 for visa + €72.50 for residence card",
    source_url: "https://www.portugal.gov.pt/en/content/covid-19",
    confidence: 0.9,
    answerable: true
  },
  
  // Demo Q5: Digital nomad in Georgia
  'digital-nomad-georgia': {
    summary: "Georgia offers a unique status called 'Remotely from Georgia' program allowing digital nomads to stay up to 1 year without a visa. As a US citizen, you can stay 365 days visa-free, and there's no income tax on foreign-sourced income for this program.",
    steps: [
      "Enter Georgia with US passport (365-day visa-free stay)",
      "Register your stay online with the Public Service Development Agency within 15 days",
      "Open a Georgian bank account for daily transactions",
      "Apply for Remotely from Georgia status at service areas",
      "Obtain Georgian ID (ID card) for longer-term activities"
    ],
    documents: [
      "Valid US passport",
      "Proof of remote employment/self-employment",
      "Income proof (minimum $2,000/month recommended)",
      "Health insurance valid in Georgia",
      "Proof of accommodation"
    ],
    office: "Public Service Development Agency (Service.gov.ge)",
    fee_info: "Free visa-free entry; status registration fee ~50 GEL",
    source_url: "https://www.geoconsul.gov.ge/en/Home/RemoteWorkInGeorgia",
    confidence: 0.88,
    answerable: true
  },
};

// Cached relocation journeys
export const CACHED_JOURNEYS: Record<string, RelocationJourney> = {
  'brazilian-to-germany-work': {
    title: "Relocation from Brazil to Germany for Work",
    phases: [
      {
        phase: "Before you leave",
        timeline: "2-3 months before departure",
        tasks: [
          { task: "Apply for German national visa (D-Type) at German embassy", urgency: "critical", where: "German Embassy Brasilia", estimated_time: "4-6 weeks" },
          { task: "Obtain Apostille on Brazilian documents (birth certificate, marriage)", urgency: "critical", where: "Cartório + OAB", estimated_time: "2-4 weeks" },
          { task: "Get documents officially translated to German by sworn translator", urgency: "critical", where: "Certified translator", estimated_time: "2-3 weeks" },
          { task: "Secure health insurance with international coverage", urgency: "important", where: "Insurance provider", estimated_time: "1 week" },
        ]
      },
      {
        phase: "First week in Germany",
        timeline: "Days 1-7",
        tasks: [
          { task: "Register at local Ausländerbehörde (Immigration Office)", urgency: "critical", where: "Rathaus/Kreisverwaltung", estimated_time: "3-4 hours" },
          { task: "Register address at Bürgeramt (Residents' Registration Office)", urgency: "critical", where: "Gemeinde", estimated_time: "30 minutes" },
          { task: "Open German bank account", urgency: "critical", where: "Sparkasse or Deutsche Bank", estimated_time: "2 hours" },
          { task: "Register for public health insurance (GKV)", urgency: "critical", where: "TK, AOK, or Barmer", estimated_time: "1-2 hours" },
        ]
      },
      {
        phase: "First month",
        timeline: "Weeks 2-4",
        tasks: [
          { task: "Apply for Tax ID (Steuer-ID) at Finanzamt", urgency: "critical", where: "Finanzamt", estimated_time: "2 weeks" },
          { task: "Get your chip card (Krankenversichertenkarte) from insurance", urgency: "important", where: "Insurance office", estimated_time: "1 hour" },
          { task: "Set up SCHUFA credit score record", urgency: "important", where: "SCHUFA", estimated_time: "Online, same day" },
          { task: "Register for German integration course (if eligible)", urgency: "optional", where: "BAMF", estimated_time: "30 minutes" },
        ]
      },
      {
        phase: "First 3 months",
        timeline: "Months 2-3",
        tasks: [
          { task: "Apply for EU Blue Card or work permit if not already granted", urgency: "critical", where: "Ausländerbehörde", estimated_time: "4-8 weeks" },
          { task: "Sign apartment lease and set up utilities", urgency: "important", where: "Apartment", estimated_time: "1-2 days" },
          { task: "Register for local radio/TV tax (Rundfunkbeitrag)", urgency: "important", where: "ARD ZDF", estimated_time: "Online, 10 min" },
        ]
      }
    ],
    warnings: [
      "Do NOT ignore official letters from Ausländerbehörde - deadlines are legally binding",
      "Your visa is only valid until the date on it - start the extension process 8 weeks early",
      "Without Anmeldung you cannot open a bank account, sign a lease, or get a phone plan"
    ],
    estimated_total_cost: "€3,000-5,000 (first month)"
  },
};

// Cached country comparisons
export const CACHED_COMPARISONS: Record<string, CountryComparison> = {
  'best-eu-tech-work-permit': {
    question_interpreted: "Best EU country work permit for non-EU software engineer",
    countries: [
      {
        country_code: "DE",
        country_name: "Germany",
        summary: "Germany offers the EU Blue Card which is relatively straightforward for tech workers earning above €45,552. Process takes 4-8 weeks after arrival.",
        processing_time: "4-8 weeks",
        typical_cost: "€100-200",
        difficulty: "moderate",
        key_advantage: "EU Blue Card valid in all EU countries after 33 months",
        key_disadvantage: "Strict salary thresholds, bureaucracy can be slow"
      },
      {
        country_code: "NL",
        country_name: "Netherlands",
        summary: "Netherlands has the Highly Skilled Migrant visa with the 30% ruling which can reduce your tax burden significantly. Fast processing through IND.",
        processing_time: "2-4 weeks",
        typical_cost: "€326",
        difficulty: "easy",
        key_advantage: "30% tax ruling, fast processing, English-friendly bureaucracy",
        key_disadvantage: "Housing crisis in Amsterdam, expensive accommodation"
      },
      {
        country_code: "PT",
        country_name: "Portugal",
        summary: "Portugal's D7 visa requires proving passive income but tech salaries can qualify. Growing tech scene in Lisbon with startup visas available.",
        processing_time: "2-3 months",
        typical_cost: "€90",
        difficulty: "moderate",
        key_advantage: "Affordable living, great weather, growing tech community",
        key_disadvantage: "Bureaucracy in Portuguese, salary levels lower"
      },
      {
        country_code: "ES",
        country_name: "Spain",
        summary: "Spain has the digital nomad visa since 2023, and regular work visa for employed. Barcelona has strong tech sector.",
        processing_time: "3-4 months",
        typical_cost: "€60-100",
        difficulty: "complex",
        key_advantage: "Affordable, great quality of life",
        key_disadvantage: "Long processing times, language barrier in bureaucracy"
      }
    ],
    recommendation: "For fastest processing with best tax benefits: Netherlands (30% ruling, IND fast-track). For best quality of life/value: Portugal (Lisbon tech scene growing). Germany is best if you plan to work in multiple EU countries long-term."
  },
};

/**
 * Get cached answer by key
 */
export function getCachedAnswer(key: string): ProcedureAnswer | DocumentRisk | null {
  return CACHED_ANSWERS[key] || null;
}

/**
 * Get cached journey by key
 */
export function getCachedJourney(key: string): RelocationJourney | null {
  return CACHED_JOURNEYS[key] || null;
}

/**
 * Get cached comparison by key
 */
export function getCachedComparison(key: string): CountryComparison | null {
  return CACHED_COMPARISONS[key] || null;
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
