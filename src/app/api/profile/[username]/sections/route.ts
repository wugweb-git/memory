import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest, requireAdmin } from '@/lib/security/auth';
import { isSectionPublic, isValidUsername, validateSectionInput } from '@/lib/profile/validate';
import {
  addProfileSection,
  getProfile,
  removeProfileSection,
  updateProfileSection,
} from '@/lib/profile/store';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const profile = await getProfile(username);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const all = profile.sections ?? [];
    if (isAdminRequest(req)) return NextResponse.json({ sections: all });
    if (!profile.isPublished) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ sections: all.filter(isSectionPublic) });
  } catch (e) {
    console.error('Profile sections GET:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    const parsed = validateSectionInput(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const v = parsed.value;
    const profile = await addProfileSection(username, {
      type: v.type as string,
      title: v.title as string,
      content: v.content ?? {},
      settings: v.settings,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    console.error('Profile sections POST:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    const body = await req.json().catch(() => null);
    const sectionId = body && typeof body === 'object' ? (body as { sectionId?: unknown }).sectionId : undefined;
    if (typeof sectionId !== 'string' || !sectionId || sectionId.length > 120) {
      return NextResponse.json({ error: 'sectionId required' }, { status: 400 });
    }
    const parsed = validateSectionInput(body, { partial: true });
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const profile = await updateProfileSection(username, sectionId, parsed.value);
    if (!profile) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    console.error('Profile sections PATCH:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
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
