'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { PrismChatHelpers } from '@/hooks/usePrismChat';
import { ASK_SOURCES_HEADER, parseSourcesHeader, type AskSource } from '@/lib/chat/sources';

/** Plain-language message for a failed /api/chat response. */
export function askErrorMessage(status: number): string {
  if (status === 429) return 'You are asking too fast. Wait a moment and try again.';
  if (status === 401 || status === 403) return 'Chat is not available right now.';
  return 'The answer did not come through. Try again.';
}

export type AskChatHelpers = PrismChatHelpers & {
  /** Sources per finished assistant message id. Empty when the answer was not grounded. */
  sourcesById: Record<string, AskSource[]>;
  clearSources: () => void;
};

/**
 * Same contract as usePrismChat, plus the X-Ask-Sources response header read
 * from the chat fetch. The streamed body is untouched.
 */
export function useAskChat(apiPath: string): AskChatHelpers {
  const latest = useRef<AskSource[]>([]);
  const [sourcesById, setSourcesById] = useState<Record<string, AskSource[]>>({});

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiPath,
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          latest.current = [];
          const res = await fetch(input, init);
          latest.current = parseSourcesHeader(res.headers.get(ASK_SOURCES_HEADER));
          if (!res.ok) {
            // The transport reads the body as the error message, so hand it a plain one.
            return new Response(askErrorMessage(res.status), { status: res.status });
          }
          return res;
        },
      }),
    [apiPath],
  );

  const chat = useChat({ transport } as never) as unknown as PrismChatHelpers;
  const { messages, status } = chat;

  // When an answer finishes, attach the sources of that request to it.
  useEffect(() => {
    if (status !== 'ready') return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    const found = latest.current;
    setSourcesById((prev) => {
      if (found.length === 0) {
        if (!(last.id in prev)) return prev;
        const { [last.id]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [last.id]: found };
    });
  }, [status, messages]);

  const clearSources = useCallback(() => {
    latest.current = [];
    setSourcesById({});
  }, []);

  return { ...chat, sourcesById, clearSources };
}
