import { emptySkips, isObj, stableId, toIso, type NormalizedConversation, type NormalizedMessage } from './types';

/**
 * Claude export: conversations.json is an array of
 * { uuid, name, created_at, updated_at, chat_messages: [{ sender, text, content[], created_at, attachments, files }] }.
 * `text` is the flat message text; newer exports also carry typed `content` blocks, used as a fallback.
 */
export function parseClaude(data: unknown): NormalizedConversation[] {
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray((data as any).conversations) ? (data as any).conversations : null;
  if (!list) throw new Error('This does not look like a Claude export: expected a list of conversations.');
  const out: NormalizedConversation[] = [];
  for (const c of list) {
    if (!isObj(c) || !Array.isArray(c.chat_messages)) continue;
    const skipped = emptySkips();
    const messages: NormalizedMessage[] = [];
    for (const m of c.chat_messages) {
      if (!isObj(m)) continue;
      const sender = String(m.sender ?? m.role ?? '').toLowerCase();
      const role = sender === 'human' || sender === 'user' ? 'user' : sender === 'assistant' ? 'assistant' : null;
      if (!role) {
        skipped.nonConversation++;
        continue;
      }
      skipped.attachments += (Array.isArray(m.attachments) ? m.attachments.length : 0) + (Array.isArray(m.files) ? m.files.length : 0);
      let text = typeof m.text === 'string' ? m.text.trim() : '';
      if (!text && Array.isArray(m.content)) {
        text = m.content
          .filter((b: any) => isObj(b) && b.type === 'text' && typeof b.text === 'string')
          .map((b: any) => b.text)
          .join('\n')
          .trim();
      }
      if (Array.isArray(m.content)) {
        for (const b of m.content) {
          if (isObj(b) && b.type && !['text', 'thinking', 'tool_use', 'tool_result'].includes(b.type)) skipped.attachments++;
        }
      }
      if (!text) {
        skipped.empty++;
        continue;
      }
      messages.push({ role, text, at: toIso(m.created_at) });
    }
    if (!messages.length) continue;
    out.push({
      source: 'claude',
      externalId: String(c.uuid ?? c.id ?? stableId(JSON.stringify(messages.slice(0, 3)))),
      title: typeof c.name === 'string' && c.name.trim() ? c.name.trim() : 'Untitled conversation',
      startedAt: toIso(c.created_at) ?? messages.find((m) => m.at)?.at ?? null,
      messages,
      skipped,
    });
  }
  return out;
}
