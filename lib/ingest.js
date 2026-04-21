import { createItem } from './items.js';
import { syncItem } from './sync.js';
import { fail } from './errors.js';

function getBody(req) {
  return req.body || {};
}

export async function ingestSoul(req) {
  const body = getBody(req);
  const raw = String(body.raw || body?.raw_payload?.body || '').trim();
  if (!raw) throw fail('raw or raw_payload.body is required', 'validation_error', 400);

  req.body = {
    ...body,
    raw,
    source_type: body.source_type || 'spirit_note',
    source_origin: body.source_origin || 'manual',
    raw_payload: body.raw_payload || {
      title: body.title || 'Spirit Note',
      body: raw,
      context: body.context || 'personal',
      signal_intent: body.signal_intent || 'insight',
      logic_pattern: body.logic_pattern || 'system_design'
    },
    content_chunk: body.content_chunk || raw,
    profile_id: body.profile_id || null,
    is_public: Boolean(body.is_public)
  };

  return createItem(req);
}

export async function ingestPulse(req) {
  const body = getBody(req);
  const raw = String(body.raw || body.candidate_text || body?.raw_payload?.message || '').trim();
  if (!raw) throw fail('raw, candidate_text, or raw_payload.message is required', 'validation_error', 400);

  req.body = {
    ...body,
    raw,
    source_type: body.source_type || 'telemetry_event',
    source_origin: body.source_origin || body.platform || 'external',
    raw_payload: body.raw_payload || {},
    content_chunk: body.content_chunk || raw,
    platform: body.platform || body.source_origin || 'external'
  };

  return syncItem(req);
}
