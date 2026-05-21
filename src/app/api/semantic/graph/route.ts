import { NextResponse } from "next/server";
import { mongo as prisma } from "@/lib/db/mongo";
import { traverseGraph } from "@/lib/semantic/traversal";

export const dynamic = "force-dynamic";

export async function GET() {
  const entities = await prisma.entity.findMany({
    where: { processing_state: "complete" },
    take: 200,
    select: { id: true, name: true, type: true, packet_id: true },
  });

  const edges: Array<{ from: string; to: string }> = [];
  const byPacket = new Map<string, string[]>();
  for (const e of entities) {
    const list = byPacket.get(e.packet_id) ?? [];
    list.push(e.id);
    byPacket.set(e.packet_id, list);
  }
  for (const ids of byPacket.values()) {
    for (let i = 1; i < ids.length; i++) {
      edges.push({ from: ids[0], to: ids[i] });
    }
  }

  const start = entities[0]?.id ?? "root";
  const nodes = traverseGraph(start, edges, 2);

  return NextResponse.json({
    nodes,
    edges,
    entity_count: entities.length,
  });
}
