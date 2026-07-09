import type { EmailPayload } from './email';

/**
 * Normalize an inbound-email webhook payload from common providers into the
 * internal EmailPayload. Supports Postmark, Resend, and a generic shape so a
 * provider can be swapped without touching the route.
 */
export function parseInboundEmail(payload: any): EmailPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  // Resend wraps the message under `data` with a `type` like "email.received".
  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;

  const from =
    firstString(data.from, data.From, data.sender, data.FromFull?.Email) ?? null;
  const subject = firstString(data.subject, data.Subject) ?? '';
  const body =
    firstString(data.text, data.TextBody, data.body, data.plain) ??
    stripHtml(firstString(data.html, data.HtmlBody)) ??
    null;
  const to = firstString(data.to, data.To, data.recipient) ?? undefined;
  const messageId =
    firstString(data.messageId, data.MessageID, data.message_id, payload.id) ?? undefined;

  if (!from || !body) return null;
  return { from, subject, body, to, messageId };
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    // Some providers give recipients as arrays of objects.
    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object' && typeof (first as any).email === 'string') {
        return (first as any).email;
      }
    }
  }
  return undefined;
}

function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
