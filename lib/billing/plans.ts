/**
 * Plan definitions and quota lookup.
 *
 * Single source of truth for what each plan includes. Used by:
 *   - paywall middleware (to check quotas)
 *   - billing UI (to render plan cards)
 *   - webhook handler (to set profiles.plan)
 */

export type PlanId = 'free' | 'pro' | 'business';

export interface PlanQuota {
  /** Per month. Use Infinity for unlimited. */
  askPerMonth: number;
  analyzePerMonth: number;
  journeyPerMonth: number;
  comparePerMonth: number;
  /** Allow document upload at all? */
  documentUpload: boolean;
  /** API access (Phase 4 follow-up). */
  apiAccess: boolean;
  /** Priority queue for AI requests. */
  priorityQueue: boolean;
  /** Number of team seats. */
  seats: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceCents: number; // monthly
  currency: string;
  yearlyDiscountPercent: number;
  description: string;
  highlights: string[];
  quota: PlanQuota;
  /** LemonSqueezy variant id for the monthly subscription. */
  lsVariantIdEnv: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    currency: 'EUR',
    yearlyDiscountPercent: 0,
    description: 'Try FormWise with no commitment.',
    highlights: [
      '5 questions per month',
      '1 document analysis per month',
      'Country comparison + relocation plans',
      'Single device, local history',
    ],
    quota: {
      askPerMonth: 5,
      analyzePerMonth: 1,
      journeyPerMonth: 2,
      comparePerMonth: 2,
      documentUpload: true,
      apiAccess: false,
      priorityQueue: false,
      seats: 1,
    },
    lsVariantIdEnv: '',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 900,
    currency: 'EUR',
    yearlyDiscountPercent: 17, // ~2 months free
    description: 'For serious relocations and frequent users.',
    highlights: [
      '200 questions per month',
      'Unlimited document analyses',
      'PDF export of answers',
      'Email reminders for deadlines',
      'Cross-device sync via cloud',
    ],
    quota: {
      askPerMonth: 200,
      analyzePerMonth: Number.POSITIVE_INFINITY,
      journeyPerMonth: 30,
      comparePerMonth: 30,
      documentUpload: true,
      apiAccess: false,
      priorityQueue: true,
      seats: 1,
    },
    lsVariantIdEnv: 'LEMONSQUEEZY_VARIANT_ID_PRO',
  },
  business: {
    id: 'business',
    name: 'Business',
    priceCents: 2900,
    currency: 'EUR',
    yearlyDiscountPercent: 17,
    description: 'For relocation firms, law offices, and HR teams.',
    highlights: [
      '1,000 questions per month per seat',
      'Everything in Pro',
      'API access',
      'Up to 5 team seats',
      'Priority email + chat support',
      'Custom system prompt per workspace',
    ],
    quota: {
      askPerMonth: 1000,
      analyzePerMonth: Number.POSITIVE_INFINITY,
      journeyPerMonth: Number.POSITIVE_INFINITY,
      comparePerMonth: Number.POSITIVE_INFINITY,
      documentUpload: true,
      apiAccess: true,
      priorityQueue: true,
      seats: 5,
    },
    lsVariantIdEnv: 'LEMONSQUEEZY_VARIANT_ID_BUSINESS',
  },
};

export function getPlan(id: string | null | undefined): PlanDefinition {
  if (id === 'pro') return PLANS.pro;
  if (id === 'business') return PLANS.business;
  return PLANS.free;
}

export function getQuota(planId: string | null | undefined): PlanQuota {
  return getPlan(planId).quota;
}

/** Resolve a LemonSqueezy variant id from env for a given plan. */
export function getVariantId(planId: PlanId): string | null {
  const def = PLANS[planId];
  if (!def.lsVariantIdEnv) return null;
  return process.env[def.lsVariantIdEnv] || null;
}
