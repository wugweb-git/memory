import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * GET /api/processing/topics
 * Returns a distribution of thematic topics across the memory store.
 */
export async function GET(req: NextRequest) {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { strength: 'desc' },
      take: 50
    });

    return NextResponse.json(topics);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
