export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { postgres } from "@/lib/db/postgres";
import { waitUntil } from "@vercel/functions";
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { recordFeedback } from '@/lib/cognitive/feedback-store';
import { resolveUserId, parseFeedback } from '@/lib/cognitive/validation';

/**
 * POST /api/cognitive/feedback
 * Captures human feedback on a decision and triggers L4 evolution.
 * Idempotent: the same (decisionId, userId, feedbackType) is stored once and
 * evolves the persona once — retries/double-clicks return the existing row.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`cognitive:feedback:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const uid = resolveUserId(body, actor.userId);
    if (!uid.ok) return NextResponse.json({ error: uid.error }, { status: uid.status });
    const parsed = parseFeedback(body);
    if (!parsed.ok) return badRequest(parsed.error);
    const userId = uid.value;
    const { decisionId, feedbackType, comment } = parsed.value;

    // The decision must exist and belong to this user.
    const decision = await postgres.decisionLog.findFirst({ where: { id: decisionId, userId }, select: { id: true } });
    if (!decision) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });

    const result = await recordFeedback(postgres, { decisionId, userId, feedbackType, comment });
    if (result.duplicate) {
      return NextResponse.json({ status: 'success', id: result.id, duplicate: true, message: 'Feedback already recorded.' });
    }

    // waitUntil keeps the function alive until evolution finishes on Vercel.
    waitUntil(
      import("@/lib/intelligence/evolver").then(m =>
        m.EvolutionEngine.evolve({ userId, decisionId, feedbackType })
      ).catch(err => {
        console.error("[L4/Evolution] Background evolution failed:", err);
      })
    );

    return NextResponse.json({
      status: "success",
      id: result.id,
      message: "Feedback captured for Digital Twin evolution."
    });

  } catch (err: any) {
    console.error("[API/Cognitive/Feedback] Error:", err);
    return NextResponse.json({ error: "Failed to persist feedback" }, { status: 500 });
  }
}
