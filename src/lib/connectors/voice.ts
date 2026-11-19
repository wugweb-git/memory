/**
 * Voice connector: transcribe an uploaded audio file, then buffer the text.
 *
 * STT provider (first configured wins), all via OpenAI-compatible
 * `/audio/transcriptions`:
 *   1. STT_API_URL + STT_API_KEY (+ STT_MODEL)   explicit override
 *   2. GROQ_API_KEY      -> Groq whisper-large-v3-turbo
 *   3. OPENAI_API_KEY    -> whisper-1
 * OpenRouter exposes no transcription endpoint, so it is deliberately not used.
 * Nothing configured => honest NOT_CONFIGURED, never a fake transcript.
 */

import { createHash } from 'node:crypto';
import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { ingestItems, recordError } from './sync-items';

export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const AUDIO_EXT = /\.(mp3|mp4|m4a|wav|webm|ogg|oga|flac|mpeg|mpga)$/i;

export interface SttConfig { url: string; key: string; model: string; provider: string }

export function sttConfig(env: NodeJS.ProcessEnv = process.env): SttConfig | null {
  if (env.STT_API_URL && env.STT_API_KEY) {
    return { url: env.STT_API_URL, key: env.STT_API_KEY, model: env.STT_MODEL || 'whisper-1', provider: 'custom' };
  }
  if (env.GROQ_API_KEY) {
    return { url: 'https://api.groq.com/openai/v1/audio/transcriptions', key: env.GROQ_API_KEY, model: env.STT_MODEL || 'whisper-large-v3-turbo', provider: 'groq' };
  }
  if (env.OPENAI_API_KEY) {
    return { url: 'https://api.openai.com/v1/audio/transcriptions', key: env.OPENAI_API_KEY, model: env.STT_MODEL || 'whisper-1', provider: 'openai' };
  }
  return null;
}

export async function transcribeAudio(
  data: Buffer,
  filename: string,
  mime: string,
  opts: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<{ text: string; provider: string }> {
  const cfg = sttConfig(opts.env);
  if (!cfg) throw new Error('NOT_CONFIGURED: set GROQ_API_KEY, OPENAI_API_KEY, or STT_API_URL + STT_API_KEY for transcription');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(data)], { type: mime || 'audio/webm' }), filename || 'audio.webm');
  form.append('model', cfg.model);
  form.append('response_format', 'json');
  const res = await (opts.fetchImpl ?? fetch)(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${json?.error?.message ?? json?.error ?? 'unknown error'}`);
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  if (!text) throw new Error('Transcription returned no speech');
  return { text, provider: cfg.provider };
}

export async function ingestAudioFile(
  data: Buffer,
  filename: string,
  mime: string,
  opts: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<SyncResult> {
  if (!sttConfig(opts.env)) {
    return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: no speech-to-text provider configured' };
  }
  if (data.length === 0) return recordError('voice', 'Empty audio file');
  if (data.length > MAX_AUDIO_BYTES) return recordError('voice', `Audio too large (max ${MAX_AUDIO_BYTES / 1024 / 1024}MB)`);
  if (!/^audio\/|^video\/(mp4|webm)/.test(mime) && !AUDIO_EXT.test(filename)) {
    return recordError('voice', 'Unsupported file type (expected audio)');
  }
  try {
    const { text, provider } = await transcribeAudio(data, filename, mime, opts);
    const hash = createHash('sha256').update(data).digest('hex');
    return await ingestItems({
      connectorId: 'voice',
      source: 'voice',
      inputMode: 'upload',
      items: [{ sourceId: `voice:${hash}`, type: 'voice_transcript', payload: { title: text.slice(0, 80), text, filename, stt_provider: provider, bytes: data.length } }],
    });
  } catch (err: any) {
    return recordError('voice', err?.message ?? String(err));
  }
}

export const voiceConnector: Connector = {
  id: 'voice',
  label: 'Voice',
  category: 'device',
  kind: 'manual',
  requires: 'env',
  cadenceMins: 0,
  setupHint: 'Upload an audio file (POST /api/connectors/import). Needs GROQ_API_KEY, OPENAI_API_KEY or STT_API_URL+STT_API_KEY to transcribe.',
  configured: () => sttConfig() !== null,
  async sync(): Promise<SyncResult> {
    return {
      ingested: 0,
      skipped: 0,
      error: sttConfig() ? 'MANUAL: upload an audio file to transcribe' : 'NOT_CONFIGURED: no speech-to-text provider configured',
    };
  },
};
