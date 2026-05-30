'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

export type PrismChatHelpers = {
  messages: UIMessage[];
  sendMessage: (message: { text: string }) => void;
  status: string;
  setMessages: (messages: UIMessage[]) => void;
};

/** Typed wrapper around AI SDK chat hooks (SDK types lag runtime API). */
export function usePrismChat(apiPath: string): PrismChatHelpers {
  return useChat({
    transport: new DefaultChatTransport({ api: apiPath }),
  } as never) as unknown as PrismChatHelpers;
}
