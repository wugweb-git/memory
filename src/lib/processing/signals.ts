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
function generateSignalHash(packetId: string, type: string, ruleVersion: number, testRunId: string = 'PROD'): string {
  return crypto
    .createHash('md5')
    .update(`${packetId}-${type}-${ruleVersion}-${testRunId}`)
    .digest('hex');
}

interface KeywordRule {
  type: SignalType;
  category: string;
  pattern: RegExp;
  /** Sources that imply the signal even without a keyword hit. */
  sources?: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    type: 'creation',
    category: 'authoring',
    pattern: /\b(published|wrote|drafted|drafting|designed|built|shipped|launched|released|composed|recorded|created|prototype)\b/gi,
    sources: ['notion', 'blog', 'medium', 'substack', 'linkedin', 'x', 'twitter'],
  },
  {
    type: 'health',
    category: 'wellbeing',
    pattern: /\b(workout|exercise|gym|run(?:ning)?|jog(?:ging)?|steps|sleep|meditat\w*|diet|calories|doctor|therapy|hydrat\w*|yoga|heart rate|blood pressure)\b/gi,
    sources: ['health', 'fitbit', 'apple_health', 'strava'],
  },
  {
    type: 'finance',
    category: 'money',
    pattern: /\b(invoice|payment|paid|salary|budget|expense|revenue|invest\w*|subscription|refund|receipt|tax(?:es)?|bank|mortgage|rent)\b|[$\u20ac\u00a3\u20b9]\s?\d/gi,
    sources: ['bank', 'stripe', 'plaid'],
  },
  {
    type: 'consumption',
    category: 'media',
    pattern: /\b(watched|watching|listened|listening|podcast|episode|playlist|album|movie|netflix|spotify|youtube|read(?:ing)? (?:a |the )?(?:book|article)|bookmark(?:ed)?)\b/gi,
    sources: ['rss', 'spotify', 'youtube', 'pocket', 'readwise'],
  },
];

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
  const testRunId = (packet as any).test_run_id || 'PROD';
  // Inbound mail arrives as source 'email' (the email connector), while some
  // connectors historically used 'gmail'. Treat both as mail or these rules are
  // dead on real data.
  const isEmail = source === 'gmail' || source === 'email';

  // Rule: Work Activity
  const isCalendar = source === 'google_calendar' || source === 'google_calendar_events';
  if (source === 'github' || isCalendar || (isEmail && /work|project|meeting|sprint|task/i.test((packet.metadata as any).subject || ''))) {
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
  if (isEmail) {
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
        extraction_rule: 'communication_email_interaction',
        rule_version: RULE_VERSION,
        thread_id: (packet.metadata as any).thread_id
      }
    });
  }

  // Rules: Creation / Health / Finance / Consumption (cheap keyword + source-aware, descriptive only)
  const subject = String((packet.metadata as any)?.subject || '');
  const haystack = `${subject}\n${contentStr}`;
  for (const rule of KEYWORD_RULES) {
    const hits = haystack.match(rule.pattern);
    const sourceMatch = rule.sources?.includes(source) ?? false;
    if (!hits && !sourceMatch) continue;
    const distinct = hits ? new Set(hits.map((h) => h.toLowerCase())).size : 0;
    // Source-only matches are weaker than text matches; more distinct keywords -> higher confidence.
    const confidence = Math.min(0.9, (hits ? 0.62 : 0.6) + Math.min(distinct, 3) * 0.08);
    detected.push({
      packet_id: packetId,
      type: rule.type,
      category: rule.category,
      source: source,
      intensity_absolute: Math.min(0.9, 0.4 + distinct * 0.1),
      confidence,
      source_trust: packet.confidence,
      timestamp: packet.event_time,
      metadata: {
        extraction_rule: hits ? `${rule.type}_keyword_match` : `${rule.type}_source_match`,
        rule_version: RULE_VERSION,
        matched: hits ? [...new Set(hits.map((h) => h.toLowerCase()))].slice(0, 5) : []
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
    .slice(0, 4) // Max 4 diverse signals per packet (8 types now extractable)
    .filter(s => (s.confidence || 0) >= 0.6) // Discard low confidence
    .map((sig, idx) => {
      const type = sig.type as SignalType;
      return {
        ...sig,
        intensity_relative: sig.intensity_absolute || 0.5, // Initial normalization
        signal_hash: generateSignalHash(packetId, type, RULE_VERSION, testRunId),
        timestamp: packet.event_time, // FLATTENED
        metadata: {
          ...sig.metadata,
          is_primary: idx === 0,
          signal_weight: idx === 0 ? 1.0 : 0.5
        }
      } as Signal;
    });
}
