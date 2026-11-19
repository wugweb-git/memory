import { emptySkips, isObj, stableId, toIso, type NormalizedConversation, type NormalizedMessage } from './types';

/**
 * ChatGPT data export: conversations.json is an array of conversations, each a
 * tree (`mapping`) of nodes. The final linear conversation is the path from
 * `current_node` back to the root through `parent`. Edited or regenerated
 * replies live on other branches and are intentionally left out.
 */

/** Node ids from root to the current leaf. Falls back to the latest leaf when current_node is missing. */
function activePath(mapping: Record<string, any>, current: unknown): string[] {
  let leaf: string | null = typeof current === 'string' && mapping[current] ? current : null;
  if (!leaf) {
    let best = -Infinity;
    for (const [id, node] of Object.entries(mapping)) {
      if (!isObj(node)) continue;
      const children = Array.isArray(node.children) ? node.children.filter((c: string) => mapping[c]) : [];
      if (children.length) continue;
      const t = typeof node.message?.create_time === 'number' ? node.message.create_time : 0;
      if (t >= best) {
        best = t;
        leaf = id;
      }
    }
  }
  const path: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = leaf;
  while (cur && mapping[cur] && !seen.has(cur)) {
    seen.add(cur);
    path.push(cur);
    const parent: unknown = mapping[cur]?.parent;
    cur = typeof parent === 'string' ? parent : null;
  }
  return path.reverse();
}

const TEXT_TYPES = ['text', 'multimodal_text'];

function contentToText(content: any): { text: string; attachments: number; textual: boolean } {
  let attachments = 0;
  const out: string[] = [];
  if (!isObj(content)) return { text: '', attachments, textual: false };
  const type = String(content.content_type ?? 'text');
  if (TEXT_TYPES.includes(type)) {
    for (const p of Array.isArray(content.parts) ? content.parts : []) {
      if (typeof p === 'string') out.push(p);
      else if (isObj(p)) {
        if (typeof p.text === 'string') out.push(p.text);
        else attachments++; // image_asset_pointer, audio and video pointers
      }
    }
    return { text: out.join('\n').trim(), attachments, textual: true };
  }
  if (type === 'code' && typeof content.text === 'string') {
    return { text: '```\n' + content.text + '\n```', attachments, textual: true };
  }
  return { text: '', attachments, textual: false }; // thoughts, browsing quotes, tool results
}

export function parseChatGpt(data: unknown): NormalizedConversation[] {
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray((data as any).conversations) ? (data as any).conversations : null;
  if (!list) throw new Error('This does not look like a ChatGPT export: expected a list of conversations.');
  const out: NormalizedConversation[] = [];
  for (const c of list) {
    if (!isObj(c) || !isObj(c.mapping)) continue;
    const skipped = emptySkips();
    const messages: NormalizedMessage[] = [];
    for (const id of activePath(c.mapping, c.current_node)) {
      const msg = c.mapping[id]?.message;
      if (!isObj(msg)) continue;
      const role = msg.author?.role;
      if (msg.metadata?.is_visually_hidden_from_conversation || role === 'system' || role === 'tool') {
        skipped.nonConversation++;
        continue;
      }
      if (role !== 'user' && role !== 'assistant') continue;
      const { text, attachments, textual } = contentToText(msg.content);
      skipped.attachments += attachments;
      if (!text) {
        if (!textual) skipped.nonConversation++;
        else if (attachments === 0) skipped.empty++;
        continue;
      }
      messages.push({ role, text, at: toIso(msg.create_time) });
    }
    if (!messages.length) continue;
    out.push({
      source: 'chatgpt',
      externalId: String(c.conversation_id ?? c.id ?? stableId(JSON.stringify(messages.slice(0, 3)))),
      title: typeof c.title === 'string' && c.title.trim() ? c.title.trim() : 'Untitled conversation',
      startedAt: toIso(c.create_time) ?? messages.find((m) => m.at)?.at ?? null,
      messages,
      skipped,
    });
  }
  return out;
}
