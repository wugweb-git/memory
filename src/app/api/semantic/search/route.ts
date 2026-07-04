import { NextRequest, NextResponse } from "next/server";
import { postgres as prisma } from "@/lib/db/postgres";
import { semanticSearch } from "@/lib/semantic/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);

  const objects = await prisma.semanticObject.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    select: { id: true, entities: true, topics: true, intents: true, packet_id: true },
  });

  const corpus = objects.map((o) => ({
    id: o.id,
    text: [
      JSON.stringify(o.entities ?? ""),
      JSON.stringify(o.topics ?? ""),
      JSON.stringify(o.intents ?? ""),
    ].join(" "),
    packet_id: o.packet_id,
  }));

  const results = semanticSearch(q, corpus);
  return NextResponse.json({ query: q, results, corpus_size: corpus.length });
}
