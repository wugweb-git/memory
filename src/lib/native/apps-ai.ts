/**
 * AI assistant handoff. A handoff, not a live session: the prompt is placed in the web fallback URL
 * (where the site supports a prefilled prompt) and the installed app is opened by intent. The web cannot
 * read another app's chats; answers come back via the Android share sheet into /share-target, or a
 * "paste from clipboard" capture. Content is only sent on an explicit user tap.
 */
import { buildIntentUrl, type AppLauncher } from './apps';

export const AI_HANDOFF_MAX_CHARS = 4000;

export function truncateForHandoff(s: string, max: number = AI_HANDOFF_MAX_CHARS): { text: string; truncated: boolean } {
  const t = s.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`, truncated: true };
}

/** Exactly what will leave the device; shown to the user before they tap a provider. */
export function buildAiPrompt(prompt: string, context?: string, max: number = AI_HANDOFF_MAX_CHARS): { text: string; truncated: boolean } {
  const p = prompt.trim();
  const ctx = context?.trim();
  const joined = ctx ? `${p ? `${p}\n\n` : ''}${ctx}` : p;
  return truncateForHandoff(joined, max);
}

const enc = encodeURIComponent;

export interface AiProvider {
  id: string;
  name: string;
  package: string;
  web: (q: string) => string;
  promptPrefill: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'chatgpt', name: 'ChatGPT', package: 'com.openai.chatgpt', web: (q) => `https://chatgpt.com/?q=${enc(q)}`, promptPrefill: true },
  { id: 'claude', name: 'Claude', package: 'com.anthropic.claude', web: (q) => `https://claude.ai/new?q=${enc(q)}`, promptPrefill: true },
  { id: 'gemini', name: 'Gemini', package: 'com.google.android.apps.bard', web: () => 'https://gemini.google.com/app', promptPrefill: false },
  { id: 'perplexity', name: 'Perplexity', package: 'ai.perplexity.app.android', web: (q) => `https://www.perplexity.ai/search?q=${enc(q)}`, promptPrefill: true },
  { id: 'copilot', name: 'Microsoft Copilot', package: 'com.microsoft.copilot', web: (q) => `https://copilot.microsoft.com/?q=${enc(q)}`, promptPrefill: true },
];

export type AiLauncher = AppLauncher & { promptPrefill: boolean; truncated: boolean };

export function aiLaunchers(prompt: string, context?: string): AiLauncher[] {
  const { text, truncated } = buildAiPrompt(prompt, context);
  return AI_PROVIDERS.map((p) => {
    const web = p.web(text);
    const u = new URL(web);
    return {
      id: `ai.${p.id}`,
      app: p.name,
      label: `Ask ${p.name}`,
      kind: 'intent' as const,
      url: buildIntentUrl({ data: `//${u.host}${u.pathname}${u.search}`, scheme: 'https', package: p.package, fallbackUrl: web }),
      fallbackUrl: web,
      promptPrefill: p.promptPrefill,
      truncated,
    };
  });
}
