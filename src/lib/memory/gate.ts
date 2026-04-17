import { IngestionDecision, MemoryPacket, Source, TraceSchema, ProcessingError } from './types';
import crypto from 'crypto';

export function deriveTrust(sourceType: string): number {
  const TRUST_BY_SOURCE: Record<string, number> = {
    manual: 1.0,
    github: 0.9,
    gmail: 0.85,
    api: 0.8,
    webhook: 0.8,
    rss: 0.6,
    scraper: 0.4,
    unknown: 0.2
  };
  return TRUST_BY_SOURCE[sourceType.toLowerCase()] ?? TRUST_BY_SOURCE.unknown;
}

/**
 * Enforces strict trace schema and immutability.
 */
export function validateTrace(trace: any, existingTrace?: TraceSchema): TraceSchema {
  const validated: TraceSchema = {
    origin: trace.origin || 'unknown',
    ingestion_path: Array.isArray(trace.ingestion_path) ? trace.ingestion_path : [],
    parent_origin_id: trace.parent_origin_id || null,
    retry_count: Number(trace.retry_count) || 0,
    error_reason: trace.error_reason || undefined
  };

  if (existingTrace) {
    // IMMUTABILITY ENFORCEMENT
    if (validated.origin !== existingTrace.origin) {
      throw new Error('IMMUTABILITY_VIOLATION: Cannot change origin of anchored packet.');
    }
    if (validated.parent_origin_id !== existingTrace.parent_origin_id) {
      throw new Error('IMMUTABILITY_VIOLATION: Cannot change parent_origin_id.');
    }
    // PATH APPEND-ONLY ENFORCEMENT
    if (!validated.ingestion_path.join(',').startsWith(existingTrace.ingestion_path.join(','))) {
      throw new Error('IMMUTABILITY_VIOLATION: Ingestion path must be append-only.');
    }
  }

  return validated;
}

/**
 * High-fidelity gate for Layer 1.
 */
export async function ingestionGate(
  raw: any,
  sourceModel: Source,
  storageUsagePercent: number,
  existingHash?: string
): Promise<{ decision: IngestionDecision; reason: string }> {
  // 1. Loop Prevention
  if (raw.trace?.parent_origin_id && raw.source_id === raw.trace.parent_origin_id) {
    return { decision: 'REJECT', reason: 'RECURSIVE_LOOP_DETECTED' };
  }

  // 2. Storage Enforcement (>95% usage = block)
  if (storageUsagePercent >= 95) {
    return { decision: 'REJECT', reason: 'STORAGE_CRITICAL_FULL' };
  }

  // 3. Source Trust Scoring
  if (sourceModel.trust_score < 0.3) {
    return { decision: 'HOLD', reason: 'LOW_TRUST_SOURCE_PENDING_REVIEW' };
  }

  // 4. Trace Validation (Draft check)
  try {
    validateTrace(raw.trace || {});
  } catch (err: any) {
    return { decision: 'REJECT', reason: `INVALID_TRACE: ${err.message}` };
  }

  // DEFAULT: ACCEPT
  return { decision: 'ACCEPT', reason: 'PASSED_GOVERNANCE_GATE' };
}

/**
 * Truncate processing errors to prevent Mongo document bloat.
 */
export function addProcessingError(errors: ProcessingError[], error: ProcessingError): ProcessingError[] {
  const updated = [error, ...errors];
  return updated.slice(0, 5); // Keep only the last 5 errors
}

export function generateHash(packet: Partial<MemoryPacket>): string {
  const data = JSON.stringify({
    source: packet.source,
    source_id: packet.source_id,
    content: packet.content,
    event_time: packet.timestamps?.event_time
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}
