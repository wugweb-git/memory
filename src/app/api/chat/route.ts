export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { retrieve } from '@/lib/memory/rag';

const SYSTEM_PROMPT = `IDENTITY: You are the Antigravity AI integrated into the Identity Prism OS.
MISSION: Ground all responses strictly in the provided context nodes (Memory).
TONE: Technical, Sophisticated, and Architectural. Use terms like "Logic Matrix", "Venture DNA", and "Signal Density".
GUARDRAIL: If the answer is not in the context, state that the signal is outside current indexed clusters.`;

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;
    const text = message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('');
    if (text.trim()) return text.trim();
  }
  return '';
}

/**
 * IDENTITY PRISM: NEURAL RAG CORE
 * Retrieval-augmented chat using vector search + AI SDK streaming.
 */
export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: 'OPENAI_API_KEY is not configured in the environment' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    const searchMode = (body.searchMode ?? 'mmr').toLowerCase();
    const temperature = body.temperature ?? 0.75;

    if (messages.length === 0) {
      return NextResponse.json({ message: 'SIG_EMPTY: Awaiting signal spark.' }, { status: 400 });
    }

    const question = getLastUserText(messages);
    if (!question) {
      return NextResponse.json({ message: 'SIG_EMPTY: Awaiting signal spark.' }, { status: 400 });
    }

    // pgvector cosine retrieval over the memory embeddings (top-10 packets).
    // searchMode kept for API compat; MMR re-ranking is a future refinement.
    void searchMode;
    const retrieved = await retrieve(question);
    const packets = Array.isArray(retrieved) ? retrieved : [];
    const context = packets
      .map((p: any) => (Array.isArray(p.context) ? p.context.join('\n') : ''))
      .filter(Boolean)
      .join('\n\n');

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = streamText({
      model: openai('gpt-4-turbo') as unknown as Parameters<typeof streamText>[0]['model'],
      temperature,
      system: `${SYSTEM_PROMPT}\n\nContext nodes:\n${context || '(no indexed clusters matched)'}`,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('CRITICAL_RAG_FAILURE:', e);
    return NextResponse.json(
      {
        message: 'RAG_FAILURE: Neural chain desynchronized.',
        error: message,
      },
      { status: 500 },
    );
  }
}
