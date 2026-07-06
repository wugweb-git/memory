/**
 * Layer 4 — Full persona rebuild pipeline (docs/layer-4-persona-behavioral-intelligence.md).
 *
 * "L4 consumes derived evidence from signals/decisions/feedback and updates
 * profile gradually." This orchestrates the existing engines end-to-end:
 *
 *   evidence (profile text + outputs + decisions + signals + feedback)
 *     → extractor (tone / structure / markers)
 *     → behavioral traits (confidence-weighted momentum)
 *     → LLM synthesis (voice summary — best-effort, heuristics stand alone)
 *     → evolvePersonaField × {communication, writing, decision}Style
 *
 * Guardrails preserved: AI-contamination gate, confidence-gated evolution,
 * everything logged to persona_evolution_logs (reversible).
 */

import { postgres } from '@/lib/db/postgres';
import { extractPersonaEvidence } from './extractor';
import { evolvePersonaField } from './evolution';
import { updateBehavioralTrait } from './behavior';
import { isVerifiedHuman } from './fingerprint';
import { collectProfileRebuildText } from './rebuild-source';
import { runLLM } from '@/lib/cognitive/llm';
import { IDENTITY_CONFIG } from '@/config/identity';

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

type RebuildResult =
  | { status: 'blocked'; reason: string }
  | {
      status: 'ok';
      sourceLength: number;
      evidence: { outputs: number; decisions: number; signals: number; feedback: number };
      traits: Array<{ traitName: string; traitValue: number }>;
      synthesis: Record<string, unknown> | null;
      confidenceScore: number;
    };

async function gatherEvidence(userId: string, username: string) {
  const [profileText, outputs, decisions, signalGroups, feedback] = await Promise.all([
    collectProfileRebuildText(username),
    postgres.outputLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true, platform: true },
    }),
    postgres.decisionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { mode: true, confidence: true },
    }),
    postgres.signal.groupBy({ by: ['type'], _count: true, orderBy: { _count: { type: 'desc' } }, take: 5 }).catch(() => []),
    postgres.feedbackLog.groupBy({ by: ['feedbackType'], _count: true }).catch(() => [] as any[]),
  ]);
  return { profileText, outputs, decisions, signalGroups, feedback };
}

/** Best-effort LLM voice synthesis; heuristic pipeline works without it. */
async function synthesizeVoice(input: {
  tone: Record<string, number>;
  structure: Record<string, unknown>;
  traits: Array<{ traitName: string; traitValue: number }>;
  topSignals: string[];
  sample: string;
}): Promise<Record<string, unknown> | null> {
  try {
    const raw = await runLLM(`Analyze this person's communication evidence and return ONLY a JSON object
(no markdown fences) shaped as {"summary": string, "voice": string, "strengths": string[]}.
- "summary": 1-2 sentences describing how they communicate and decide.
- "voice": 3-6 adjectives, comma-separated.
- "strengths": up to 3 short phrases.

Tone metrics (0-1): ${JSON.stringify(input.tone)}
Writing structure: ${JSON.stringify(input.structure)}
Behavioral traits: ${JSON.stringify(input.traits)}
Dominant signal types: ${input.topSignals.join(', ') || 'none yet'}
Writing sample (truncated):
"""${input.sample.slice(0, 1500)}"""`);
    const jsonText = raw.replace(/```json?|```/g, '').trim();
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(jsonText.slice(start, end + 1)) as Record<string, unknown>;
  } catch (err) {
    console.warn('[L4] voice synthesis unavailable (continuing with heuristics):', err);
    return null;
  }
}

export async function rebuildPersona(params: {
  userId?: string;
  username?: string;
  outputText?: string;
}): Promise<RebuildResult> {
  const userId = params.userId || IDENTITY_CONFIG.DEFAULT_USER_ID;
  const username = params.username || IDENTITY_CONFIG.HANDLE;

  const { profileText, outputs, decisions, signalGroups, feedback } = await gatherEvidence(userId, username);

  const outputText = outputs.map((o) => String(o.content ?? '')).join('\n\n');
  const text = [params.outputText?.trim(), profileText, outputText].filter(Boolean).join('\n\n').slice(0, 16_000);

  if (!text || text.length < 40) {
    return { status: 'blocked', reason: 'insufficient_source_text' };
  }

  const verified = await isVerifiedHuman({ userId, text });
  if (!verified) {
    return { status: 'blocked', reason: 'ai_contamination_detected' };
  }

  // 1. Extract tone / structure / behavioral markers (also persists comm patterns)
  const extracted = await extractPersonaEvidence({ userId, outputText: text, sourceLayer: 'L4' });
  const { tone, writingStructure, behavioralMarkers } = extracted;

  // 2. Behavioral traits — confidence-weighted momentum via behavior engine
  const evidenceStrength = clamp(0.45 + outputs.length * 0.03 + decisions.length * 0.02);
  const traitInputs: Array<[string, number]> = [
    ['execution_focus', behavioralMarkers.executionFocus],
    ['analytical_depth', behavioralMarkers.analyticalDepth],
    ['verbosity', behavioralMarkers.verbosity],
    ['abstraction_preference', behavioralMarkers.abstractionPreference],
    ['directness', tone.directness],
    ['urgency_bias', tone.urgency],
  ];
  const traits: Array<{ traitName: string; traitValue: number }> = [];
  for (const [traitName, observedValue] of traitInputs) {
    const t = (await updateBehavioralTrait({
      userId,
      traitName,
      observedValue,
      confidence: evidenceStrength,
      sourceLayer: 'L4-rebuild',
    })) as unknown as { traitName: string; traitValue: number };
    traits.push({ traitName: t.traitName, traitValue: t.traitValue });
  }

  // 3. Decision style from real decision logs
  const decisionStyle: Record<string, unknown> = {
    sampleCount: decisions.length,
    avgConfidence: decisions.length
      ? Number((decisions.reduce((s, d) => s + (d.confidence ?? 0), 0) / decisions.length).toFixed(3))
      : null,
    executionFocus: behavioralMarkers.executionFocus,
    analyticalDepth: behavioralMarkers.analyticalDepth,
  };

  // 4. LLM voice synthesis (Groq) — optional enrichment
  const topSignals = (signalGroups as Array<{ type: string }>).map((s) => s.type);
  const synthesis = await synthesizeVoice({
    tone: tone as unknown as Record<string, number>,
    structure: writingStructure as unknown as Record<string, unknown>,
    traits,
    topSignals,
    sample: text,
  });

  // 5. Evolve all three persona fields (confidence-gated, logged, reversible)
  await evolvePersonaField({
    userId,
    field: 'writingStyle',
    nextValue: writingStructure as unknown as Record<string, unknown>,
    reason: 'persona_rebuild',
    confidenceWeight: evidenceStrength,
  });
  await evolvePersonaField({
    userId,
    field: 'communicationStyle',
    nextValue: { ...tone, ...(synthesis ? { synthesis } : {}) },
    reason: 'persona_rebuild',
    confidenceWeight: evidenceStrength,
  });
  const evolved = await evolvePersonaField({
    userId,
    field: 'decisionStyle',
    nextValue: decisionStyle,
    reason: 'persona_rebuild',
    confidenceWeight: evidenceStrength,
  });

  // 6. Display name from the public profile
  const profile = await postgres.profile.findFirst({ where: { username } }).catch(() => null);
  if (profile?.displayName) {
    await postgres.personaProfile.update({
      where: { userId },
      data: { displayName: profile.displayName },
    }).catch(() => {});
  }

  const feedbackCount = (feedback as Array<{ _count: number }>).reduce((s, f) => s + (f._count ?? 0), 0);

  return {
    status: 'ok',
    sourceLength: text.length,
    evidence: {
      outputs: outputs.length,
      decisions: decisions.length,
      signals: topSignals.length,
      feedback: feedbackCount,
    },
    traits,
    synthesis,
    confidenceScore: evolved.nextConfidence,
  };
}
