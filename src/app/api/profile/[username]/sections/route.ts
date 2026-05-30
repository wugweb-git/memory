import { NextRequest, NextResponse } from 'next/server';
import {
  addProfileSection,
  getProfile,
  removeProfileSection,
  updateProfileSection,
} from '@/lib/profile/store';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    const profile = await getProfile(username);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ sections: profile.sections ?? [] });
  } catch (e) {
    console.error('Profile sections GET:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    const body = await req.json();
    if (!body?.title || !body?.type) {
      return NextResponse.json({ error: 'title and type required' }, { status: 400 });
    }
    const profile = await addProfileSection(username, {
      type: body.type,
      title: body.title,
      content: body.content ?? {},
      settings: body.settings,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    console.error('Profile sections POST:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    const body = await req.json();
    const { sectionId, ...patch } = body;
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId required' }, { status: 400 });
    }
    const profile = await updateProfileSection(username, sectionId, patch);
    if (!profile) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    console.error('Profile sections PATCH:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    const sectionId = req.nextUrl.searchParams.get('sectionId');
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId query required' }, { status: 400 });
    }
    const profile = await removeProfileSection(username, sectionId);
    if (!profile) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    console.error('Profile sections DELETE:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
