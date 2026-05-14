import { NextRequest, NextResponse } from "next/server";
import { enqueuePublishing } from "@/lib/queue/publishing";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await enqueuePublishing({
    userId: body.userId || "system_user",
    outputId: body.outputId,
    platform: body.platform,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
  });
  return NextResponse.json(entry);
}
