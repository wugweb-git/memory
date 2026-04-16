import { MemoryPacket, Signal, SignalType } from '../memory/types';
import crypto from 'crypto';

const RULE_VERSION = 1;

const SIGNAL_HIERARCHY: Record<SignalType, number> = {
  work_activity: 1,
  creation: 2,
  health: 3,
  finance: 4,
  learning: 5,
  communication: 6,
  consumption: 7,
  unknown: 8
};

/**
 * Generates a unique hash for a signal to ensure idempotency.
 */
function generateSignalHash(packetId: string, type: string, ruleVersion: number): string {
  return crypto
    .createHash('md5')
    .update(`${packetId}-${type}-${ruleVersion}`)
    .digest('hex');
}

/**
 * Extracts descriptive signals from a MemoryPacket.
 * Standard L2: Purely descriptive, non-prescriptive extraction.
 */
export function extractSignals(packet: MemoryPacket): Signal[] {
  const detected: Partial<Signal>[] = [];
  const contentStr = typeof packet.content === 'string' 
    ? packet.content 
    : JSON.stringify(packet.content);

  const source = packet.source.toLowerCase();
  const packetId = packet.id!;

  // Rule: Work Activity
  if (source === 'github' || (source === 'gmail' && /work|project|meeting|sprint|task/i.test((packet.metadata as any).subject || ''))) {
    detected.push({
      packet_id: packetId,
      type: 'work_activity',
      category: source === 'github' ? 'engineering' : 'coordination',
      source: source,
      intensity_absolute: source === 'github' ? 0.8 : 0.6,
      confidence: 0.9,
      source_trust: packet.confidence,
      timestamp: packet.event_time,
      metadata: {
        extraction_rule: 'work_source_match',
        rule_version: RULE_VERSION,
        repo: (packet.metadata as any).repo
      }
    });
  }

  // Rule: Learning
  const learningKeywords = /\b(how to|research|documentation|tutorial|learning|course|study|algorithm|principle)\b/i;
  if (learningKeywords.test(contentStr)) {
    detected.push({
      packet_id: packetId,
      type: 'learning',
      category: 'research',
      source: source,
      intensity_absolute: 0.7,
      confidence: 0.75,
      source_trust: packet.confidence,
      timestamp: packet.event_time,
      metadata: { 
        extraction_rule: 'learning_keyword_match',
        rule_version: RULE_VERSION 
      }
    });
  }

  // Rule: Communication
  if (source === 'gmail') {
    const isReply = !!(packet.metadata as any).thread_id;
    detected.push({
      packet_id: packetId,
      type: 'communication',
      category: isReply ? 'dialogue' : 'broadcast',
      source: source,
      intensity_absolute: isReply ? 0.5 : 0.3,
      confidence: 0.95,
      source_trust: packet.confidence,
      timestamp: packet.event_time,
      metadata: { 
        extraction_rule: 'communication_gmail_interaction',
        rule_version: RULE_VERSION,
        thread_id: (packet.metadata as any).thread_id 
      }
    });
  }

  // Deduplication & Selection
  const typeMap: Record<string, Partial<Signal>> = {};
  detected.forEach(s => {
    if (s.type && (!typeMap[s.type] || (s.confidence || 0) > (typeMap[s.type].confidence || 0))) {
      typeMap[s.type] = s;
    }
  });

  const uniqueSignals = Object.values(typeMap);

  // Sorting by hierarchy and confidence
  uniqueSignals.sort((a, b) => {
    const pA = SIGNAL_HIERARCHY[a.type as SignalType] || 99;
    const pB = SIGNAL_HIERARCHY[b.type as SignalType] || 99;
    if (pA !== pB) return pA - pB;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  // Final mapping and validation
  return uniqueSignals
    .slice(0, 3) // Max 3 diverse signals per packet
    .filter(s => (s.confidence || 0) >= 0.6) // Discard low confidence
    .map((sig, idx) => {
      const type = sig.type as SignalType;
      return {
        ...sig,
        intensity_relative: sig.intensity_absolute || 0.5, // Initial normalization
        signal_hash: generateSignalHash(packetId, type, RULE_VERSION),
        metadata: {
          ...sig.metadata,
          is_primary: idx === 0,
          signal_weight: idx === 0 ? 1.0 : 0.5
        }
      } as Signal;
    });
}
