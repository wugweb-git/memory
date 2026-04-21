import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
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

export async function POST(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const data = await req.json();

    const profile = await (prisma as any).profile.upsert({
      where: { username },
      update: {
        ...data,
        updated_at: new Date(),
      },
      create: {
        username,
        ...data,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
