import { postgres } from '@/lib/db/postgres';
import { scoreRecommendation } from './scoring';
import { rankRecommendations } from './ranking';
import { suppressNoise } from './suppression';
import { leverageScore } from './leverage';
import { detectFatigue } from './fatigue';
import { detectTimingWindow } from './timing';

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  href: string;
  score: number;
  leverage: number;
  urgent: boolean;
};

type Candidate = {
  id: string;
  title: string;
  reason: string;
  href: string;
  /** How strong the underlying signal is (0–1). */
  signal: number;
  /** How confident we are the action is right (0–1). */
  confidence: number;
  impact: number;
  effort: number;
  urgency: number;
  readiness: number;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Next-best-actions engine (the product's "act" surface).
 * Generates candidates from live system state, then runs them through the
 * recommendation primitives: score → rank → suppress noise → fatigue cap.
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  const now = Date.now();

  const [
    rawBlobs,
    drafts,
    deadQueue,
    scheduledQueue,
    latestDecision,
    pendingEmbeddings,
    failedPackets,
    profile,
    actionsLast24h,
  ] = await Promise.all([
    postgres.blobItem.count({ where: { state: 'raw' } }).catch(() => 0),
    postgres.outputLog.count({ where: { userId, status: 'draft' } }).catch(() => 0),
    postgres.publishingQueue.count({ where: { status: 'dead' } }).catch(() => 0),
    postgres.publishingQueue.count({ where: { status: { in: ['queued', 'scheduled'] } } }).catch(() => 0),
    postgres.decisionLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
    postgres.memoryPacket.count({ where: { embedding_status: 'pending' } }).catch(() => 0),
    postgres.memoryPacket.count({ where: { processing_status: 'failed' } }).catch(() => 0),
    postgres.profile.findFirst({ select: { avatarUrl: true, sections: true } }).catch(() => null),
    postgres.executionAuditLog.count({ where: { createdAt: { gte: new Date(now - DAY) } } }).catch(() => 0),
  ]);

  const candidates: Candidate[] = [];

  if (rawBlobs > 0) {
    candidates.push({
      id: 'review-intake',
      title: `Review ${rawBlobs} item${rawBlobs === 1 ? '' : 's'} in your buffer`,
      reason: 'Raw captures only become memory once you keep or discard them.',
      href: '/buffer',
      signal: Math.min(1, rawBlobs / 10),
      confidence: 0.9,
      impact: 0.7,
      effort: 0.3,
      urgency: Math.min(1, rawBlobs / 15),
      readiness: 1,
    });
  }

  if (drafts > 0) {
    candidates.push({
      id: 'publish-drafts',
      title: `Publish ${drafts} waiting draft${drafts === 1 ? '' : 's'}`,
      reason: 'Generated output only counts once the world can see it.',
      href: '/content',
      signal: Math.min(1, drafts / 5),
      confidence: 0.85,
      impact: 0.9,
      effort: 0.2,
      urgency: 0.7,
      readiness: 1,
    });
  }

  if (deadQueue > 0) {
    candidates.push({
      id: 'dead-letter',
      title: `${deadQueue} publish${deadQueue === 1 ? '' : 'es'} failed permanently`,
      reason: 'Items in the dead-letter queue need a manual look before retrying.',
      href: '/content',
      signal: 1,
      confidence: 0.95,
      impact: 0.8,
      effort: 0.4,
      urgency: 0.9,
      readiness: 1,
    });
  }

  if (scheduledQueue > 0) {
    candidates.push({
      id: 'queue-scheduled',
      title: `${scheduledQueue} item${scheduledQueue === 1 ? '' : 's'} queued to publish`,
      reason: 'The scheduler will push these on the next cron run — review if unexpected.',
      href: '/content',
      signal: 0.4,
      confidence: 0.7,
      impact: 0.4,
      effort: 0.1,
      urgency: 0.3,
      readiness: 1,
    });
  }

  const daysSinceDecision = latestDecision
    ? (now - new Date(latestDecision.createdAt).getTime()) / DAY
    : Infinity;
  if (daysSinceDecision > 7) {
    candidates.push({
      id: 'run-decision',
      title: latestDecision ? 'No decision in over a week — run one' : 'Run your first decision',
      reason: 'The brain gives direction only when you ask it. Architect, founder or operator mode.',
      href: '/cognitive',
      signal: 0.8,
      confidence: 0.75,
      impact: 0.9,
      effort: 0.3,
      urgency: Math.min(1, daysSinceDecision === Infinity ? 0.8 : daysSinceDecision / 14),
      readiness: 0.9,
    });
  }

  if (pendingEmbeddings > 0) {
    candidates.push({
      id: 'pending-embeddings',
      title: `${pendingEmbeddings} memor${pendingEmbeddings === 1 ? 'y' : 'ies'} not yet searchable`,
      reason: 'Embedding is pending — retrieval and the twin can’t see these yet.',
      href: '/memory',
      signal: Math.min(1, pendingEmbeddings / 10),
      confidence: 0.8,
      impact: 0.6,
      effort: 0.2,
      urgency: 0.5,
      readiness: 0.8,
    });
  }

  if (failedPackets > 0) {
    candidates.push({
      id: 'failed-packets',
      title: `${failedPackets} memory packet${failedPackets === 1 ? '' : 's'} failed processing`,
      reason: 'Failed packets never reach signals or the graph — replay or archive them.',
      href: '/memory',
      signal: 0.9,
      confidence: 0.9,
      impact: 0.7,
      effort: 0.4,
      urgency: 0.8,
      readiness: 1,
    });
  }

  if (profile && !profile.avatarUrl) {
    candidates.push({
      id: 'profile-avatar',
      title: 'Add a profile photo',
      reason: 'Your public page currently shows a generated placeholder.',
      href: '/content',
      signal: 0.6,
      confidence: 0.95,
      impact: 0.5,
      effort: 0.1,
      urgency: 0.3,
      readiness: 1,
    });
  }

  if (profile && (!Array.isArray(profile.sections) || (profile.sections as unknown[]).length === 0)) {
    candidates.push({
      id: 'profile-empty',
      title: 'Your public profile is empty',
      reason: 'Publish something — the profile is what the world sees.',
      href: '/content',
      signal: 0.9,
      confidence: 0.9,
      impact: 1,
      effort: 0.3,
      urgency: 0.8,
      readiness: 1,
    });
  }

  // Primitives: score → rank → suppress → fatigue cap.
  const scored = candidates.map((c) => ({
    ...c,
    score: scoreRecommendation(c.signal, c.confidence),
    leverage: leverageScore(c.impact, c.effort),
    urgent: detectTimingWindow(c.urgency, c.readiness),
  }));

  const ranked = rankRecommendations(scored) as typeof scored;
  const audible = suppressNoise(ranked, 0.35) as typeof scored;

  const { fatigued } = detectFatigue(actionsLast24h);
  const cap = fatigued ? 2 : 5;

  return audible.slice(0, cap).map(({ id, title, reason, href, score, leverage, urgent }) => ({
    id, title, reason, href, score, leverage, urgent,
  }));
}
