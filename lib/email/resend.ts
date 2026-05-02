/**
 * Resend client — transactional email.
 *
 * Direct REST calls (no extra SDK dep). Same gracefully-degrading pattern
 * as our other helpers: no env vars → no-op, never throws.
 *
 * Use this for:
 *   - signup welcome
 *   - password reset link (Supabase sends its own; only needed if we
 *     replace Supabase auth flows)
 *   - deadline reminders for tracked processes
 *   - weekly digest
 *   - billing receipts (LemonSqueezy can also send these natively)
 */

const API_URL = 'https://api.resend.com/emails';

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Tag for analytics in the Resend dashboard. */
  tag?: string;
  /** Idempotency key — set this for retried sends to avoid duplicates. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  /** True when Resend isn't configured — caller may want to log differently. */
  skipped?: boolean;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(req: SendEmailRequest): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'FormWise <noreply@formwise.example>';
  const replyTo = req.replyTo || process.env.RESEND_REPLY_TO;

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(req.to) ? req.to : [req.to],
    subject: req.subject,
  };
  if (req.html) body.html = req.html;
  if (req.text) body.text = req.text;
  if (replyTo) body.reply_to = replyTo;
  if (req.tag) body.tags = [{ name: 'category', value: req.tag }];

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  };
  if (req.idempotencyKey) {
    headers['idempotency-key'] = req.idempotencyKey;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Resend ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
