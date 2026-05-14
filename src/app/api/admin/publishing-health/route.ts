import { NextResponse } from "next/server";
import { getQueue } from "@/lib/queue/publishing";

export async function GET() {
  const queue = await getQueue();
  const failed = queue.filter((q: any) => q.status === "failed").length;
  return NextResponse.json({ status: "ok", queueSize: queue.length, failed });
}
