import { NextResponse } from "next/server";
import { traverseGraph } from "@/lib/semantic/traversal";

export async function GET() {
  return NextResponse.json({ nodes: traverseGraph("root", [], 2) });
}
