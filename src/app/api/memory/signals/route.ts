import { NextRequest, NextResponse } from 'next/server';
import { postgres as prisma } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export type ActivityFeedEntry = {
  id: string;
  type: 'creation' | 'curation';
  action: string;
  target: string;
  source: string;
  sourceUrl: string;
  time: string;
  industry: string;
  spiritNote?: string;
};

const CREATION_TYPES = new Set(['creation', 'work_activity', 'learning', 'communication']);

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapActivity(
  activity: {
    id: string;
    packet_id: string;
    activity_type: string;
    timestamp: Date;
    source: string | null;
    metadata: unknown;
  },
  packetTitle?: string | null,
): ActivityFeedEntry {
  const meta = (activity.metadata ?? {}) as Record<string, unknown>;
  const activityType = activity.activity_type;
  const type: ActivityFeedEntry['type'] = CREATION_TYPES.has(activityType) ? 'creation' : 'curation';

  return {
    id: activity.id,
    type,
    action: activityType.replace(/_/g, ' '),
    target: packetTitle || (meta.title as string) || `Packet ${activity.packet_id.slice(-6)}`,
    source: activity.source || 'memory',
    sourceUrl: (meta.sourceUrl as string) || '#',
    time: formatRelativeTime(new Date(activity.timestamp)),
    industry: (meta.category as string) || 'general',
    spiritNote: typeof meta.note === 'string' ? meta.note : undefined,
  };
}

/**
 * GET /api/memory/signals
 * Activity feed for the ActivityLog UI (backed by activity_stream + packet titles).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const test_run_id = searchParams.get('test_run_id') || 'PROD';
    const take = Math.min(Number(searchParams.get('limit') || 50), 100);

    const activities = await prisma.activityStream.findMany({
      where: { test_run_id },
      orderBy: { timestamp: 'desc' },
      take,
    });

    const packetIds = [...new Set(activities.map((a) => a.packet_id))];
    const packets =
      packetIds.length > 0
        ? await prisma.memoryPacket.findMany({
            where: { id: { in: packetIds } },
            select: { id: true, type: true, source: true, metadata: true },
          })
        : [];

    const labelByPacket = new Map(
      packets.map((p) => {
        const meta = (p.metadata ?? {}) as Record<string, unknown>;
        const label =
          (meta.title as string) ||
          (meta.subject as string) ||
          (meta.file_name as string) ||
          `${p.source} // ${p.type}`;
        return [p.id, label] as const;
      }),
    );

    const feed = activities.map((activity) =>
      mapActivity(activity, labelByPacket.get(activity.packet_id)),
    );

    return NextResponse.json(feed);
  } catch (error: unknown) {
    console.error('[API Memory Signals] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity signals' }, { status: 500 });
  }
}
