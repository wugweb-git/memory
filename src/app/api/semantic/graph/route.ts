import { NextResponse } from "next/server";
import { postgres as prisma } from "@/lib/db/postgres";
import { traverseGraph } from "@/lib/semantic/traversal";

export const dynamic = "force-dynamic";

export async function GET() {
  const entities = await prisma.entity.findMany({
    where: { processing_state: "complete" },
    take: 200,
    select: { id: true, name: true, type: true, packet_ids: true },
  });

  const edges: Array<{ from: string; to: string }> = [];
  const byPacket = new Map<string, string[]>();
  for (const e of entities) {
    const packetKey = Array.isArray(e.packet_ids) && e.packet_ids[0] ? String(e.packet_ids[0]) : e.id;
    const list = byPacket.get(packetKey) ?? [];
    list.push(e.id);
    byPacket.set(packetKey, list);
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
