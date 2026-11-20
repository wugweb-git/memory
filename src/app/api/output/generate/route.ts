import { NextRequest, NextResponse } from "next/server";
import { generateArtifact, normalizeOutputPlatform } from "@/lib/output/generator";
import { requireOwner } from "@/lib/security/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const limit = await checkRateLimit(`generate:${actor.userId}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  try {
    const body = await req.json().catch(() => null);
    // Identity comes from the session, never from the request body.
    const userId = actor.userId;
    const { decisionId, sourceContent, platform } = body ?? {};

    if (!userId || !decisionId || !sourceContent || !platform) {
      return NextResponse.json(
        { error: "Missing required fields. decisionId is mandatory." }, 
        { status: 400 }
      );
    }

    if (typeof decisionId !== "string" || typeof sourceContent !== "string" || typeof platform !== "string") {
      return NextResponse.json({ error: "decisionId, sourceContent and platform must be strings" }, { status: 400 });
    }
    if (sourceContent.length > 50_000) {
      return NextResponse.json({ error: "sourceContent too large" }, { status: 413 });
    }

    const result = await generateArtifact({
      userId,
      decisionId,
      sourceContent,
      platform: normalizeOutputPlatform(platform)
    });

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[API/Output/Generate] Error:", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
