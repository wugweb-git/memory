import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from "langchain/memory";

/**
 * IDENTITY PRISM: NEURAL RAG CORE (v4.2)
 * -------------------------------------
 * Unified Retrieval-Augmented Generation with Signature Logic Guardrails.
 */

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ message: 'OPENAI_API_KEY is not configured in the environment' }, { status: 401 });
        }
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        const searchMode = body.searchMode ?? 'mmr';
        const temperature = body.temperature ?? 0.75;
        
        // GUARDRAIL: Input Validation
        if (messages.length === 0) {
            return NextResponse.json({ message: 'SIG_EMPTY: Awaiting signal spark.' }, { status: 400 });
        }

        const question = messages[messages.length - 1].content;

        const model = new ChatOpenAI({
            modelName: 'gpt-4-turbo-preview',
            temperature: temperature,
            streaming: true,
            callbacks: [handlers],
        });

        // SYSTEM_PROMPT: Enforcing Signature Tone & Identity Context
        const SYSTEM_PROMPT = `
            IDENTITY: You are the Antigravity AI integrated into the Identity Prism OS.
            MISSION: Ground all responses strictly in the provided context nodes (Memory). 
            TONE: Technical, Sophisticated, and Architectural. Use terms like "Logic Matrix", "Venture DNA", and "Signal Density".
            GUARDRAIL: If the answer is not in the context, state that the signal is outside current indexed clusters.
        `;

        const retriever = vectorStore().asRetriever(
            searchMode.toLowerCase() === 'mmr' 
            ? { 
                "searchType": "mmr", 
                "searchKwargs": { "fetchK": 15, "lambda": 0.3 } 
            }
            : {
                "searchType": "similarity",
                "k": 10
            }
        );

        const conversationChain = ConversationalRetrievalQAChain.fromLLM(
            model, 
            retriever, 
            {
                qaTemplate: `${SYSTEM_PROMPT}\n\nContext nodes:\n{context}\n\nQuestion: {question}\nResponse:`,
                memory: new BufferMemory({
                    memoryKey: "chat_history", // Must match qaTemplate if used
                    inputKey: "question",
                    outputKey: "text",
                    returnMessages: true
                }),
            }
        );

        // ASYNC_INVOCATION: Execute Neural Recall
        await conversationChain.invoke({
            "question": question
        }).catch(err => {
            console.error("NEURAL_CHAIN_ERROR:", err);
        });

        return new StreamingTextResponse(stream);

    } catch (e: any) {
        console.error('CRITICAL_RAG_FAILURE:', e);
        return NextResponse.json({ 
            message: 'RAG_FAILURE: Neural chain desynchronized.',
            error: e.message 
        }, { status: 500 });
    }
}