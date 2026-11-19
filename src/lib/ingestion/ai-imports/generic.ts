import { emptySkips, stableId, type MessageRole, type NormalizedConversation, type NormalizedMessage } from './types';

/** Pasted transcripts, Markdown/text files, and one-fact-per-line memory lists. */

function speakerRole(label: string): MessageRole | null {
  const l = label.trim().replace(/\s+said$/i, '');
  if (/^(?:you|me|user|human|i)$/i.test(l)) return 'user';
  if (/^(?:chatgpt|gpt-?[\w.-]*|assistant|claude|gemini|bard|ai|copilot|model|bot|perplexity|grok)$/i.test(l)) return 'assistant';
  return null;
}

/** "You: hi", "**User:** hi", "ChatGPT said: hi" start a new turn; "## Assistant" alone is a heading turn. */
const TURN = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?([A-Za-z][\w .-]{0,24}?)(?:\*\*|__)?\s*(?::|\s+said:)\s*(?:\*\*|__)?\s*(.*)$/;
const HEADING = /^\s*#{1,6}\s*(?:\*\*)?([A-Za-z][\w .-]{0,24}?)(?:\*\*)?\s*$/;

export function parseTranscript(text: string, filename?: string): NormalizedConversation[] {
  const body = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').trim();
  if (!body) throw new Error('Nothing to import: the text is empty.');
  const messages: NormalizedMessage[] = [];
  let cur: { role: MessageRole; lines: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const t = cur.lines.join('\n').trim();
    if (t) messages.push({ role: cur.role, text: t, at: null });
    cur = null;
  };
  let sawTurn = false;
  for (const line of body.split('\n')) {
    const m = TURN.exec(line);
    const h = m ? null : HEADING.exec(line);
    const role = m ? speakerRole(m[1]) : h ? speakerRole(h[1]) : null;
    if (role) {
      flush();
      sawTurn = true;
      cur = { role, lines: m && m[2] ? [m[2]] : [] };
    } else if (cur) cur.lines.push(line);
    else cur = { role: 'note', lines: [line] };
  }
  flush();
  const title =
    (filename ?? '').replace(/\.[a-z0-9]+$/i, '') || (body.split('\n')[0] ?? '').replace(/^#+\s*/, '').slice(0, 80) || 'Imported transcript';
  const msgs: NormalizedMessage[] = sawTurn ? messages : [{ role: 'note', text: body, at: null }];
  return [{ source: 'transcript', externalId: `t-${stableId(body)}`, title, startedAt: null, messages: msgs, skipped: emptySkips() }];
}

/** One fact per line (bullets and numbering stripped). Headings and lines ending in ":" are skipped. */
export function parseMemoryList(text: string, label = 'Memory list'): NormalizedConversation[] {
  const skipped = emptySkips();
  const seen = new Set<string>();
  const messages: NormalizedMessage[] = [];
  for (const raw of text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n')) {
    const line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line) || /:$/.test(line)) {
      skipped.nonConversation++;
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    messages.push({ role: 'memory', text: line, at: null });
  }
  if (!messages.length) throw new Error('No facts found. Paste one fact per line.');
  return [{ source: 'memory-list', externalId: `m-${stableId([...seen].sort().join('\n'))}`, title: label, startedAt: null, messages, skipped }];
}
