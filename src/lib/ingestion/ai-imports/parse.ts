import { parseChatGpt } from './chatgpt';
import { parseClaude } from './claude';
import { parseGemini } from './gemini';
import { parseMemoryList, parseTranscript } from './generic';
import { SOURCE_LABELS, isObj, parseJson, type AiImportSource, type NormalizedConversation } from './types';

/** Parse the text of an export file or a paste for the chosen source. Pure; runs in the browser. */
export function parseAiExport(source: AiImportSource, text: string, filename?: string): NormalizedConversation[] {
  switch (source) {
    case 'chatgpt':
    case 'claude':
    case 'gemini': {
      const data = parseJson(text);
      const seen = detectJsonSource(data);
      if (seen && seen !== source) {
        throw new Error(`This file looks like a ${SOURCE_LABELS[seen]} export, not ${SOURCE_LABELS[source]}. Pick ${SOURCE_LABELS[seen]} as the source.`);
      }
      return source === 'chatgpt' ? parseChatGpt(data) : source === 'claude' ? parseClaude(data) : parseGemini(data);
    }
    case 'memory-list':
      return parseMemoryList(text);
    default:
      return parseTranscript(text, filename);
  }
}

/** Guess the source of a conversations.json from its shape, so a wrong picker choice is caught. */
export function detectJsonSource(data: unknown): AiImportSource | null {
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray((data as any).conversations) ? (data as any).conversations : null;
  const first = list?.find((x: unknown) => isObj(x));
  if (!first) return null;
  if (isObj(first.mapping)) return 'chatgpt';
  if (Array.isArray(first.chat_messages)) return 'claude';
  if (typeof first.title === 'string' && ('safeHtmlItem' in first || 'products' in first || 'header' in first)) return 'gemini';
  return null;
}
