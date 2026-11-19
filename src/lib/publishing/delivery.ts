/**
 * Pure helpers for recording and describing the EXTERNAL delivery outcome of a
 * publish (LinkedIn / Medium). No DB or network imports, so they are unit-testable.
 *
 * The record is stored under `delivery` inside the existing Json column
 * `PublishedOutput.publishedContent` (no schema change).
 */

export type DeliveryStatus = 'published' | 'internal' | 'not_configured' | 'error';

/** Structural subset of PlatformPublishResult (kept local to avoid coupling). */
export type DeliveryInput = {
  platform: string;
  status: string;
  delivered: boolean;
  externalId: string | null;
  error?: string;
};

export type DeliveryRecord = {
  platform: string;
  status: DeliveryStatus;
  delivered: boolean;
  externalId: string | null;
  error: string | null;
  /** ISO timestamp of when the outcome was recorded. */
  at: string;
};

const KNOWN_STATUSES: ReadonlySet<string> = new Set(['published', 'internal', 'not_configured', 'error']);
const MAX_REASON_LENGTH = 80;

export function platformDisplayName(platform: string): string {
  const p = String(platform ?? '').trim();
  if (!p) return 'platform';
  if (p.toLowerCase() === 'linkedin') return 'LinkedIn';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Builds the persisted record. An unknown status is treated as an error, never as success. */
export function buildDeliveryRecord(result: DeliveryInput, now: Date = new Date()): DeliveryRecord {
  const known = KNOWN_STATUSES.has(result.status);
  const status: DeliveryStatus = known ? (result.status as DeliveryStatus) : 'error';
  const error =
    result.error ??
    (known ? null : `Unexpected delivery status: ${String(result.status)}`);
  return {
    platform: result.platform,
    status,
    // Only a real, successful external send counts as delivered.
    delivered: status === 'published' && result.delivered === true,
    externalId: result.externalId ?? null,
    error: error ? String(error) : null,
    at: now.toISOString(),
  };
}

function shortReason(error: string | null | undefined): string {
  const flat = String(error ?? '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  if (!flat) return 'unknown reason';
  return flat.length > MAX_REASON_LENGTH ? `${flat.slice(0, MAX_REASON_LENGTH - 1).trimEnd()}…` : flat;
}

/**
 * Human label for a delivery record. Returns null when there is nothing to say
 * (internal-only platforms, or no record, e.g. rows published before this existed).
 */
export function describeDelivery(delivery: Pick<DeliveryRecord, 'platform' | 'status' | 'delivered' | 'error'> | null | undefined): string | null {
  if (!delivery) return null;
  const name = platformDisplayName(delivery.platform);
  if (delivery.status === 'published' && delivery.delivered) return `Posted to ${name}`;
  if (delivery.status === 'not_configured') return `Not sent: ${name} not configured`;
  if (delivery.status === 'internal') return null;
  return `Not sent: error, ${shortReason(delivery.error)}`;
}

/** Reads `delivery` back out of a PublishedOutput.publishedContent value. */
export function extractDelivery(publishedContent: unknown): DeliveryRecord | null {
  if (!publishedContent || typeof publishedContent !== 'object' || Array.isArray(publishedContent)) return null;
  const d = (publishedContent as Record<string, unknown>).delivery;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const r = d as Record<string, unknown>;
  if (typeof r.platform !== 'string' || typeof r.status !== 'string') return null;
  return {
    platform: r.platform,
    status: (KNOWN_STATUSES.has(r.status) ? r.status : 'error') as DeliveryStatus,
    delivered: r.delivered === true,
    externalId: typeof r.externalId === 'string' ? r.externalId : null,
    error: typeof r.error === 'string' ? r.error : null,
    at: typeof r.at === 'string' ? r.at : '',
  };
}
