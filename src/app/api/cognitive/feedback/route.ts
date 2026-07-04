export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { postgres } from "@/lib/db/postgres";
import { waitUntil } from "@vercel/functions";

/**
 * API for capturing human feedback on the Cognitive Engine's decisions.
 * Crucial for the L4 evolution loop.
 */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = checkRateLimit(`cognitive:feedback:${actor.userId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  try {
    const body = await req.json();
    const { decisionId, userId, feedbackType, comment } = body;

    if (!decisionId || !userId || !feedbackType) {
      return NextResponse.json(
        { error: "Missing required fields: decisionId, userId, feedbackType" }, 
        { status: 400 }
      );
    }

    const validTypes = ["accepted", "rejected", "ignored"];
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: "feedbackType must be: accepted | rejected | ignored" },
        { status: 400 }
      );
    }

    const feedback = await postgres.feedbackLog.create({
      data: {
        decisionId,
        userId,
        feedbackType,
        comment: comment || null
      }
    });

    // Trigger L4 Evolution safely — waitUntil ensures Vercel doesn't terminate
    // the function before the async operation completes.
    waitUntil(
      import("@/lib/intelligence/evolver").then(m =>
        m.EvolutionEngine.evolve({ userId, decisionId, feedbackType: feedbackType as any })
      ).catch(err => {
        console.error("[L4/Evolution] Background evolution failed:", err);
      })
    );

    return NextResponse.json({ 
      status: "success", 
      id: feedback.id,
      message: "Feedback captured for Digital Twin evolution."
    });

  } catch (err: any) {
    console.error("[API/Cognitive/Feedback] Error:", err);
    return NextResponse.json(
      { error: "Failed to persist feedback", details: err.message },
      { status: 500 }
    );
  }
}
