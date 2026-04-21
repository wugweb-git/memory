import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

/**
 * GET /api/cognitive/history
 * Fetches the persistent decision log for the user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'system_user';
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = await postgres.decisionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50)
    });

    if (history.length === 0) {
      return NextResponse.json([]);
    }

    // Batch fetch all feedback in a single query (avoids N+1)
    const logIds = history.map(log => log.id);
    const allFeedback = await postgres.feedbackLog.findMany({
      where: { decisionId: { in: logIds } },
      orderBy: { createdAt: 'desc' }
    });

    // Group feedback by decisionId
    const feedbackByDecision = allFeedback.reduce((acc, fb) => {
      if (!acc[fb.decisionId]) acc[fb.decisionId] = [];
      acc[fb.decisionId].push(fb);
      return acc;
    }, {} as Record<string, typeof allFeedback>);

    const results = history.map(log => ({
      ...log,
      feedbackCount: feedbackByDecision[log.id]?.length || 0,
      lastFeedback: feedbackByDecision[log.id]?.[0]?.feedbackType || null
    }));

    return NextResponse.json(results);

  } catch (err: any) {
    console.error("[API/Cognitive/History] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch cognitive history", details: err.message },
      { status: 500 }
    );
  }
}
