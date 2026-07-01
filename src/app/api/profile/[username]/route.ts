import { NextRequest, NextResponse } from 'next/server';
import { postgres as prisma } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { username } = await params;
    const profile = await (prisma as any).profile.findUnique({
      where: { username },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { username } = await params;
    const data = await req.json();
    const profile = await (prisma as any).profile.upsert({
      where: { username },
      update: { ...data, updated_at: new Date() },
      create: {
        username,
        displayName: data.displayName ?? username,
        ...data,
      },
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { username } = await params;
    const data = await req.json();

    const profile = await (prisma as any).profile.upsert({
      where: { username },
      update: { ...data, updated_at: new Date() },
      create: { username, displayName: data.displayName ?? username, ...data },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
