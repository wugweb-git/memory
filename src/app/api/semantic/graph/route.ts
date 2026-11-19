import { NextResponse } from "next/server";
import { postgres as prisma } from "@/lib/db/postgres";
import { traverseGraph } from "@/lib/semantic/traversal";
import { buildGraphEdges } from "@/lib/semantic/graph";

export const dynamic = "force-dynamic";

export async function GET() {
  const entities = await prisma.entity.findMany({
    where: { processing_state: "complete" },
    orderBy: { occurrences: "desc" },
    take: 200,
    select: { id: true, name: true, type: true, packet_ids: true },
  });

  const ids = entities.map((e) => e.id);
  const rels = ids.length
    ? await prisma.relationship.findMany({
        where: { processing_state: "complete", from_entity_id: { in: ids }, to_entity_id: { in: ids } },
        take: 1000,
        select: { from_entity_id: true, to_entity_id: true, type: true, confidence: true },
      })
    : [];

  const edges = buildGraphEdges(rels, entities);
  const inferred = edges.length > 0 && edges.every((e) => e.inferred);

  const start = entities[0]?.id ?? "root";
  const nodes = traverseGraph(start, edges, 2);

  return NextResponse.json({
    nodes,
    edges,
    entity_count: entities.length,
    relationship_count: rels.length,
    inferred,
  });
}
