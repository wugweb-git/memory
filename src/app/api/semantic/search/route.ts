import { NextRequest, NextResponse } from "next/server";
import { postgres as prisma } from "@/lib/db/postgres";
import { semanticSearch, mapVectorHits, type VectorHit } from "@/lib/semantic/search";
import { retrieve } from "@/lib/memory/rag";
import { clampLimit } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 500);
  const limit = clampLimit(req.nextUrl.searchParams.get("limit"), 50, 100);

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

  // Primary: pgvector retrieval over embedded packets. Fallback: substring filter when
  // embeddings are unavailable (no provider key / query too short / no hits / error).
  let mode: "vector" | "substring" = "substring";
  let results: unknown[] = [];
  if (q.trim().length >= 3) {
    try {
      const hits = (await retrieve(q)) as unknown;
      if (Array.isArray(hits) && hits.length > 0) {
        const packetIds = (hits as VectorHit[]).map((h) => h.packet_id);
        const matched = await prisma.semanticObject.findMany({
          where: { packet_id: { in: packetIds } },
          select: { id: true, entities: true, topics: true, intents: true, packet_id: true },
        });
        const vecCorpus = matched.map((o) => ({
          id: o.id,
          text: [JSON.stringify(o.entities ?? ""), JSON.stringify(o.topics ?? ""), JSON.stringify(o.intents ?? "")].join(" "),
          packet_id: o.packet_id,
        }));
        results = mapVectorHits(hits as VectorHit[], vecCorpus);
        mode = "vector";
      }
    } catch (err) {
      console.warn("[semantic/search] vector retrieval unavailable, using substring fallback:", (err as Error).message);
    }
  }
  if (mode === "substring") results = semanticSearch(q, corpus);

  return NextResponse.json({ query: q, results, corpus_size: corpus.length, mode });
}
