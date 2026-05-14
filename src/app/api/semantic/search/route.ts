import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/semantic/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const results = semanticSearch(q, []);
  return NextResponse.json({ query: q, results });
}
