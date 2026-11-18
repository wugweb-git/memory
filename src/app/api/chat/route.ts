export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, type UIMessage } from 'ai';
import { isOpenRouterEnabled, runJob, type ChatMessage } from '@/lib/ai/openrouter';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { retrieve } from '@/lib/memory/rag';
import { chatRetrievalFilters, emptyContextText } from '@/lib/memory/visibility';
import { isAdminRequest } from '@/lib/security/auth';
import { loadStyleHints } from '@/lib/persona/styleHintsLoader';

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
    const gatewayBase = process.env.AI_GATEWAY_BASE_URL;
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    const gatewayOn = Boolean(gatewayBase && gatewayKey);
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterOn = isOpenRouterEnabled();
    if (!openrouterOn && !gatewayOn && !groqKey && !openaiKey) {
      return NextResponse.json(
        { message: 'No chat LLM configured (AI_GATEWAY_BASE_URL+AI_GATEWAY_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY)' },
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

    // Owner console chat (admin session) keeps full memory; /ask visitors only see public notes.
    const admin = isAdminRequest(req);

    const question = getLastUserText(messages);
    if (!question) {
      return NextResponse.json({ message: 'SIG_EMPTY: Awaiting signal spark.' }, { status: 400 });
    }

    // pgvector cosine retrieval over the memory embeddings (top-10 packets).
    // Retrieval needs OpenAI embeddings — if that fails (e.g. no embedding
    // quota), the chat still answers, just ungrounded, rather than erroring.
    // searchMode kept for API compat; MMR re-ranking is a future refinement.
    void searchMode;
    let context = '';
    try {
      const retrieved = await retrieve(question, chatRetrievalFilters(admin));
      const packets = Array.isArray(retrieved) ? retrieved : [];
      context = packets
        .map((p: any) => (Array.isArray(p.context) ? p.context.join('\n') : ''))
        .filter(Boolean)
        .join('\n\n');
    } catch (retrievalErr) {
      console.warn('[Chat] retrieval unavailable, answering without memory context:', retrievalErr);
    }

    // L4 persona style hints: soft, best-effort, time-boxed; '' on any failure.
    const styleHints = await loadStyleHints();

    const systemText = `${SYSTEM_PROMPT}\n\nContext nodes:\n${context || emptyContextText(admin)}${styleHints ? `\n\n${styleHints}` : ''}`;

    // Per-job routing: OPENROUTER_API_KEY set -> `ask` chain (free models, fallback
    // on 429/5xx). Not streamed upstream; the answer is replayed as a UI stream.
    const otherProvider = gatewayOn || Boolean(groqKey) || Boolean(openaiKey);
    let routed: Response | null = null;
    if (openrouterOn) {
      try {
      const chat: ChatMessage[] = [{ role: 'system', content: systemText }];
      for (const m of messages) {
        if (m.role !== 'user' && m.role !== 'assistant') continue;
        const text = m.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map((part) => part.text)
          .join('');
        if (text.trim()) chat.push({ role: m.role, content: text });
      }
      const job = await runJob('ask', chat, { temperature });
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: 'text-start', id: 'ask' });
          writer.write({ type: 'text-delta', id: 'ask', delta: job.text });
          writer.write({ type: 'text-end', id: 'ask' });
        },
      });
      routed = createUIMessageStreamResponse({ stream, headers: { 'X-Model': job.model } });
      } catch (err) {
        // Whole free chain failed (e.g. daily cap): fall back to the old provider if one is set.
        if (!otherProvider) throw err;
        console.error('[chat] OpenRouter chain failed, falling back:', err instanceof Error ? err.message : err);
      }
    }
    if (routed) return routed;

    // Generic OpenAI-compatible gateway (Command Code / Cline Pass / DeepSeek)
    // takes priority; then Groq; then OpenAI.
    const provider = gatewayOn
      ? createOpenAI({ apiKey: gatewayKey, baseURL: gatewayBase })
      : groqKey
        ? createOpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
        : createOpenAI({ apiKey: openaiKey });
    // Confirmed live via Vercel runtime error logs (2026-08-16): the old
    // hardcoded 'gpt-4-turbo' 404s — "The model `gpt-4-turbo` does not exist
    // or you do not have access to it." OpenAI's GPT-4 line was deprecated
    // through 2026; model IDs are churning fast enough that hardcoding one
    // is risky. Default to gpt-4o-mini but make it override-able —
    // if this also 404s, either set OPENAI_CHAT_MODEL to whatever
    // https://platform.openai.com/docs/models currently lists, or set
    // GROQ_API_KEY instead (stable model naming, generous free tier,
    // already fully wired below).
    const chatModel = gatewayOn
      ? (process.env.AI_GATEWAY_MODEL || 'deepseek-chat')
      : groqKey
        ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
        : (process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini');
    const result = streamText({
      // .chat() forces the chat-completions endpoint (Groq has no /responses API)
      model: provider.chat(chatModel) as unknown as Parameters<typeof streamText>[0]['model'],
      temperature,
      system: systemText,
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
