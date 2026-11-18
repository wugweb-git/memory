import { NextRequest, NextResponse } from 'next/server';
import { publishContentToProfile } from '@/lib/profile/store';
import { requireAdmin } from '@/lib/security/auth';
import { getRequestUserId } from '@/lib/identity/request';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ username: string }> };

/**
 * Push blog/post content to a public profile.
 * Body: { outputId? } from Output Studio, or { title, body, platform?, url?, tags? } for manual posts.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const { username } = await params;
    const body = await req.json();
    const userId = getRequestUserId(req);

    if (!body.outputId && !body.body && !body.title) {
      return NextResponse.json(
        { error: 'Provide outputId or title+body' },
        { status: 400 },
      );
    }

    const result = await publishContentToProfile({
      username,
      userId,
      outputId: body.outputId,
      title: body.title,
      body: body.body,
      platform: body.platform,
      url: body.url,
      sectionType: body.sectionType,
      tags: body.tags,
    });

    return NextResponse.json({
      ok: true,
      message: 'Content published to profile',
      section: result.section,
      profileUrl: `/p/${username}`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Publish failed';
    console.error('Profile publish:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
