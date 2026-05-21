import { NextResponse } from "next/server";
import { mongo as prisma } from "@/lib/db/mongo";
import { buildSemanticTimeline } from "@/lib/semantic/timeline";

export const dynamic = "force-dynamic";

export async function GET() {
  const [activities, signals] = await Promise.all([
    prisma.activityStream.findMany({ orderBy: { timestamp: "desc" }, take: 40 }),
    prisma.signal.findMany({ orderBy: { timestamp: "desc" }, take: 40, where: { processing_state: "complete" } }),
  ]);

  const events = [
    ...activities.map((a) => ({
      at: new Date(a.timestamp).toISOString(),
      type: a.activity_type,
      label: `activity:${a.activity_type}`,
    })),
    ...signals.map((s) => ({
      at: new Date(s.timestamp).toISOString(),
      type: s.type,
      label: `signal:${s.category}`,
    })),
  ];

  return NextResponse.json({ timeline: buildSemanticTimeline(events) });
}
