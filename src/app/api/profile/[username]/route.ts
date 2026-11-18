import { NextRequest, NextResponse } from 'next/server';
import { getProfile, upsertProfile } from '@/lib/profile/store';
import { isAdminRequest, requireAdmin } from '@/lib/security/auth';
import { isValidUsername, toPublicProfile, validateProfileInput } from '@/lib/profile/validate';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ username: string }> };

/**
 * GET: public readers get the published profile only (unpublished profile =
 * 404, draft sections stripped, internal fields removed). The owner's admin
 * session sees everything.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const profile = await getProfile(username);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (isAdminRequest(req)) return NextResponse.json(profile);

    const pub = toPublicProfile(profile);
    if (!pub) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(pub);
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function write(req: NextRequest, { params }: RouteContext) {
  const gate = requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  try {
    const { username } = await params;
    if (!isValidUsername(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    const body = await req.json().catch(() => null);
    const parsed = validateProfileInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const profile = await upsertProfile(username, parsed.value);
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile write error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = write;
export const POST = write;
