import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { updateBehavioralTrait } from "@/lib/persona/behavior";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      feedbackType?: string;
      targetType?: string;
      targetId?: string;
      notes?: string;
    };

    const userId = body.userId || "system_user";
    const feedbackType = ["accepted", "rejected", "ignored"].includes(body.feedbackType || "")
      ? (body.feedbackType as "accepted" | "rejected" | "ignored")
      : "ignored";

    const saved = await postgres.feedbackMemory.create({
      data: {
        userId,
        targetType: body.targetType || "output",
        targetId: body.targetId || null,
        feedbackType,
        notes: body.notes || null,
      },
    });

    const signal = feedbackType === "accepted" ? 0.75 : feedbackType === "rejected" ? 0.35 : 0.5;
    await updateBehavioralTrait({
      userId,
      traitName: "alignment_feedback",
      observedValue: signal,
      confidence: 0.7,
      sourceLayer: "L3",
    });

    return NextResponse.json({ status: "ok", feedback: saved });
  } catch (err) {
    console.error("[L4] feedback POST error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
