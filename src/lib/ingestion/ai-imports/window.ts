import { SOURCE_LABELS, type NormalizedConversation, type NormalizedMessage } from './types';

/**
 * Splits a conversation into windows of about 3,500 characters with overlap so
 * each embedding covers one coherent stretch of talk. Pure (browser-safe) so the
 * UI can show the exact packet count before anything is sent.
 */

export const WINDOW_TARGET = 3500;
export const WINDOW_OVERLAP = 400;

export interface Window {
  index: number;
  total: number;
  text: string;
  /** First message time inside the window, else null. */
  at: string | null;
}

const ROLE_LABEL: Record<NormalizedMessage['role'], string> = { user: 'Me', assistant: 'AI', note: 'Note', memory: 'Fact' };

/** Splits one over-long block on paragraph, line, sentence, then hard boundaries. */
function splitLong(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  let rest = s;
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    let cut = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf('. ') + 1);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

export function conversationHeader(c: NormalizedConversation): string {
  const when = c.startedAt ? `, ${c.startedAt.slice(0, 10)}` : '';
  return `${SOURCE_LABELS[c.source]}: ${c.title}${when}`;
}

export function windowConversation(c: NormalizedConversation, target = WINDOW_TARGET, overlap = WINDOW_OVERLAP): Window[] {
  const header = conversationHeader(c);
  const budget = Math.max(500, target - header.length - 20);
  // Segments keep their message time so a window can report when it starts.
  const segs: Array<{ text: string; at: string | null }> = [];
  for (const m of c.messages) {
    const label = ROLE_LABEL[m.role];
    splitLong(m.text, budget - overlap - label.length - 12).forEach((part, i) => segs.push({ text: `${label}${i ? ' (cont.)' : ''}: ${part}`, at: m.at }));
  }
  const groups: Array<typeof segs> = [];
  let cur: typeof segs = [];
  let len = 0;
  for (const s of segs) {
    if (cur.length && len + s.text.length + 2 > budget) {
      groups.push(cur);
      // Carry trailing segments (up to `overlap` chars) into the next window.
      const carry: typeof segs = [];
      let cl = 0;
      for (let i = cur.length - 1; i >= 0 && cl + cur[i].text.length <= overlap; i--) {
        carry.unshift(cur[i]);
        cl += cur[i].text.length + 2;
      }
      if (!carry.length && overlap > 0) {
        // The last message is longer than the overlap: carry its tail, cut at a word boundary.
        const last = cur[cur.length - 1];
        const tail = last.text.slice(-overlap);
        const sp = tail.indexOf(' ');
        const frag = `…${sp > 0 && sp < tail.length / 2 ? tail.slice(sp) : tail}`;
        carry.push({ text: frag, at: last.at });
        cl = frag.length + 2;
      }
      cur = carry;
      len = cl;
    }
    cur.push(s);
    len += s.text.length + 2;
  }
  if (cur.length) groups.push(cur);
  const total = groups.length;
  return groups.map((g, index) => ({
    index,
    total,
    at: g.find((s) => s.at)?.at ?? null,
    text: `${header}${total > 1 ? ` (part ${index + 1} of ${total})` : ''}\n\n${g.map((s) => s.text).join('\n\n')}`,
  }));
}

export const countWindows = (c: NormalizedConversation) => windowConversation(c).length;
