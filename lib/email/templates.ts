/**
 * Inline HTML email templates.
 *
 * Kept dead-simple — no third-party templating engine, no MJML. Tailored
 * for the 3 transactional emails we currently send. Each template returns
 * { subject, html, text } so plain-text fallback is automatic.
 */

interface Address {
  email: string;
  name?: string;
}

const APP_NAME = 'FormWise';
const BRAND_COLOR = '#2563eb'; // primary

function shell(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:18px;font-weight:600;color:${BRAND_COLOR}">${APP_NAME}</div>
    </td></tr>
    <tr><td style="padding:28px">${body}</td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
      You received this because you have a ${APP_NAME} account. <br>
      If this wasn't you, ignore this email — no action needed.
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ----------------------------------------------------------------------------

export function welcomeEmail(user: Address) {
  const greeting = user.name ? `Hi ${escape(user.name)},` : 'Welcome,';
  const html = shell(
    `Welcome to ${APP_NAME}`,
    `<h2 style="margin:0 0 12px 0;font-size:20px">${greeting}</h2>
    <p>Thanks for signing up to ${APP_NAME}. You can now ask bureaucracy questions, upload documents for risk analysis, and track procedures across 18+ countries.</p>
    <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">Open dashboard</a></p>
    <p style="margin-top:24px;color:#64748b;font-size:14px">Need help? Reply to this email and we'll get back to you within one business day.</p>`,
  );
  const text = `${greeting}

Thanks for signing up to ${APP_NAME}. Open your dashboard at ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard

Reply to this email if you need help.`;
  return { subject: `Welcome to ${APP_NAME}`, html, text };
}

// ----------------------------------------------------------------------------

export function deadlineReminderEmail(
  user: Address,
  proc: { name: string; nextStep?: string; dueDate?: string },
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const greeting = user.name ? `Hi ${escape(user.name)},` : 'Heads up,';
  const dueLine = proc.dueDate ? ` due <strong>${escape(proc.dueDate)}</strong>` : '';
  const stepLine = proc.nextStep ? `<p>Next step: <strong>${escape(proc.nextStep)}</strong></p>` : '';

  const html = shell(
    `Reminder: ${proc.name}`,
    `<h2 style="margin:0 0 12px 0;font-size:20px">${greeting}</h2>
    <p>You have an upcoming step on <strong>${escape(proc.name)}</strong>${dueLine}.</p>
    ${stepLine}
    <p style="margin-top:24px"><a href="${appUrl}/dashboard" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">Open process</a></p>`,
  );
  const text = `${greeting}

Upcoming step on "${proc.name}"${proc.dueDate ? ` due ${proc.dueDate}` : ''}.
${proc.nextStep ? `Next step: ${proc.nextStep}\n` : ''}
${appUrl}/dashboard`;
  return { subject: `Reminder: ${proc.name}`, html, text };
}

// ----------------------------------------------------------------------------

export function planChangedEmail(
  user: Address,
  change: { newPlan: 'free' | 'pro' | 'business'; renewsAt?: string },
) {
  const greeting = user.name ? `Hi ${escape(user.name)},` : 'Hello,';
  const planLabel = change.newPlan.charAt(0).toUpperCase() + change.newPlan.slice(1);
  const renewLine = change.renewsAt ? `<p>Your next renewal is <strong>${escape(change.renewsAt)}</strong>.</p>` : '';

  const html = shell(
    `${APP_NAME} plan updated`,
    `<h2 style="margin:0 0 12px 0;font-size:20px">${greeting}</h2>
    <p>Your ${APP_NAME} plan is now <strong>${planLabel}</strong>.</p>
    ${renewLine}
    <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">Manage subscription</a></p>`,
  );
  const text = `${greeting}

Your ${APP_NAME} plan is now ${planLabel}.${change.renewsAt ? `\nNext renewal: ${change.renewsAt}` : ''}

Manage at ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`;
  return { subject: `${APP_NAME} plan updated to ${planLabel}`, html, text };
}
