import { runJob, type ChatMessage } from './openrouter';
import type { JobName } from './models';

/**
 * Minimal LangChain-shaped client (`call(messages) -> { content }`) backed by a
 * job chain, so call sites that take an injectable `llmClient` can be routed
 * per job without code changes. `lastModel` reports the model that answered.
 */
export interface JobClient {
  lastModel?: string;
  call(messages: Array<{ content: unknown; _getType?: () => string }>): Promise<{ content: string }>;
}

export function toChatMessages(messages: Array<{ content: unknown; _getType?: () => string }>): ChatMessage[] {
  return messages.map((m) => {
    const t = typeof m._getType === 'function' ? m._getType() : 'human';
    const role: ChatMessage['role'] = t === 'system' ? 'system' : t === 'ai' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return { role, content };
  });
}

export function createJobClient(
  job: JobName,
  opts: { temperature?: number; fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {},
): JobClient {
  const client: JobClient = {
    async call(messages) {
      const r = await runJob(job, toChatMessages(messages), opts);
      client.lastModel = r.model;
      // Best-effort usage tracking against the free-tier cap; never blocks the call.
      void import('@/lib/cost/tracking').then((m) => m.recordJobUsage(job, r.attempts)).catch(() => {});
      return { content: r.text };
    },
  };
  return client;
}
