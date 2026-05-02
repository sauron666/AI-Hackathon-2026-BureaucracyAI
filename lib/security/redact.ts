/**
 * PII redaction for logs and audit events.
 *
 * Run user-supplied text through `redactPII` before sending it to console
 * or any persistent log. Targets common Bulgarian + EU patterns:
 *   - email addresses
 *   - international phone numbers (E.164 + spaced/dashed forms)
 *   - IBAN
 *   - Bulgarian EGN (10-digit personal code)
 *   - credit-card-like 13–19 digit sequences
 *   - JWT-shaped tokens
 *   - long base64ish API keys
 *
 * Prefer redacting structured fields (req.body) before serializing rather
 * than redacting after — but this is a defensive net for everything else.
 */

const PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[email-redacted]',
  },
  {
    name: 'phone',
    // International format: + then 7-15 digits with optional separators.
    regex: /(?<![A-Za-z0-9])\+\d[\d\s\-().]{6,16}\d(?![A-Za-z0-9])/g,
    replacement: '[phone-redacted]',
  },
  {
    name: 'iban',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    replacement: '[iban-redacted]',
  },
  {
    name: 'egn',
    // Bulgarian personal number: 10 digits not surrounded by other digits.
    regex: /(?<!\d)\d{10}(?!\d)/g,
    replacement: '[egn-redacted]',
  },
  {
    name: 'credit-card',
    regex: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,
    replacement: '[card-redacted]',
  },
  {
    name: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: '[jwt-redacted]',
  },
  {
    name: 'api-key',
    // sk-...., sb_secret_..., supabase service role-like blobs.
    regex: /\b(?:sk|pk|sb)[_-][A-Za-z0-9_-]{20,}\b/g,
    replacement: '[apikey-redacted]',
  },
];

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwd',
  'pwd',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'service_role_key',
  'service_role',
  'anthropic_api_key',
  'openai_api_key',
  'google_api_key',
  'gemini_api_key',
  'cohere_api_key',
  'sirma_api_key',
  'supabase_service_role_key',
]);

/** Redact PII patterns from a free-form string. Idempotent. */
export function redactPII(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let output = input;
  for (const { regex, replacement } of PATTERNS) {
    output = output.replace(regex, replacement);
  }
  return output;
}

/**
 * Recursively walk a structure and:
 *   - replace values of sensitive-named fields with "[redacted]"
 *   - run string values through redactPII
 *
 * Safe for circular structures (uses a WeakSet).
 */
export function redactObject<T>(value: T, _seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactPII(value) as unknown as T;
  if (typeof value !== 'object') return value;

  if (_seen.has(value as object)) return value;
  _seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, _seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_NAMES.has(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = redactObject(v, _seen);
    }
  }
  return out as unknown as T;
}
