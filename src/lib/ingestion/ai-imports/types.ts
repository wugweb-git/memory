/**
 * Normalised shapes shared by every AI-history importer. Pure (no node or DB
 * imports) so the same parsers run in the browser, where the export file is read.
 */

export type AiImportSource = 'chatgpt' | 'claude' | 'gemini' | 'transcript' | 'memory-list';

export const AI_IMPORT_SOURCES: readonly AiImportSource[] = ['chatgpt', 'claude', 'gemini', 'transcript', 'memory-list'];

export type MessageRole = 'user' | 'assistant' | 'note' | 'memory';

export interface NormalizedMessage {
  role: MessageRole;
  text: string;
  /** ISO timestamp, or null when the export has none. */
  at: string | null;
}

export interface SkipCounts {
  /** Images, files and other attachments that were not imported. */
  attachments: number;
  /** System, tool and other non-conversation messages that were dropped. */
  nonConversation: number;
  /** Messages with no text. */
  empty: number;
}

export interface NormalizedConversation {
  source: AiImportSource;
  /** Stable id from the export (or a content hash for pasted text). */
  externalId: string;
  title: string;
  startedAt: string | null;
  messages: NormalizedMessage[];
  skipped: SkipCounts;
}

export const emptySkips = (): SkipCounts => ({ attachments: 0, nonConversation: 0, empty: 0 });

export const SOURCE_LABELS: Record<AiImportSource, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  transcript: 'Pasted transcript or file',
  'memory-list': 'Memory list',
};

/** Small, stable, dependency-free string hash (two FNV-style lanes), safe in the browser. */
export function stableId(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Epoch seconds or ms, or an ISO string, to an ISO string; null when unusable. */
export function toIso(v: unknown): string | null {
  if (v == null || v === '') return null;
  let ms: number;
  if (typeof v === 'number') ms = v < 1e11 ? v * 1000 : v;
  else if (typeof v === 'string') {
    if (/^\d+(\.\d+)?$/.test(v.trim())) {
      const n = Number(v);
      ms = n < 1e11 ? n * 1000 : n;
    } else ms = Date.parse(v);
  } else return null;
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  if (y < 2015 || y > 2100) return null; // outside the era of these tools: treat as bad data
  return d.toISOString();
}

export const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Parse JSON, throwing a readable error. Strips a UTF-8 BOM. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new Error('This file is not valid JSON. Upload conversations.json (or the zip it came in) straight from the export.');
  }
}
