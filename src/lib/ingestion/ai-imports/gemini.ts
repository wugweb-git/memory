import { emptySkips, isObj, toIso, type NormalizedConversation, type NormalizedMessage, type SkipCounts } from './types';

/**
 * Google Takeout > My Activity > Gemini Apps (MyActivity.json), best effort.
 * Takeout has no conversation ids: each entry is one prompt with an optional
 * HTML reply (`safeHtmlItem`), so entries are grouped into one conversation per
 * calendar day. The shape is undocumented and varies by locale; anything that
 * does not look like a prompt is skipped and counted.
 */

const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export function htmlToText(html: string): string {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseGemini(data: unknown): NormalizedConversation[] {
  if (!Array.isArray(data)) throw new Error('This does not look like a Google Takeout activity file: expected a list of entries (MyActivity.json).');
  const days = new Map<string, { pairs: NormalizedMessage[][]; skipped: SkipCounts }>();
  const orphan = emptySkips();
  for (const e of data) {
    if (!isObj(e)) continue;
    const header = `${e.header ?? ''} ${Array.isArray(e.products) ? e.products.join(' ') : ''}`;
    if (header.trim() && !/gemini|bard/i.test(header)) continue; // a Takeout file that also holds other products
    const at = toIso(e.time);
    const m = /^(?:Prompted|Asked)\s+([\s\S]+)$/.exec(String(e.title ?? ''));
    if (!m || !at) {
      orphan.nonConversation++;
      continue;
    }
    const day = at.slice(0, 10);
    const bucket = days.get(day) ?? days.set(day, { pairs: [], skipped: emptySkips() }).get(day)!;
    bucket.skipped.attachments += (Array.isArray(e.attachedFiles) ? e.attachedFiles.length : 0) + (Array.isArray(e.imageFile) ? e.imageFile.length : 0);
    const pair: NormalizedMessage[] = [{ role: 'user', text: m[1].trim(), at }];
    const html = Array.isArray(e.safeHtmlItem) ? e.safeHtmlItem.map((i: any) => (isObj(i) && typeof i.html === 'string' ? i.html : '')).join('\n') : '';
    const reply = htmlToText(html);
    if (reply) pair.push({ role: 'assistant', text: reply, at });
    bucket.pairs.push(pair);
  }
  const out: NormalizedConversation[] = [];
  for (const [day, b] of [...days.entries()].sort((a, c) => a[0].localeCompare(c[0]))) {
    // Takeout lists newest first; restore chronological order within the day.
    const messages = b.pairs.sort((p, q) => String(p[0].at).localeCompare(String(q[0].at))).flat();
    if (!messages.length) continue;
    out.push({ source: 'gemini', externalId: `gemini-${day}`, title: `Gemini activity ${day}`, startedAt: messages[0].at, messages, skipped: b.skipped });
  }
  if (out.length) out[0].skipped.nonConversation += orphan.nonConversation; // keep the count
  return out;
}
