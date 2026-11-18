import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Registration is closed. This is a single-owner system: the owner signs in
 * with the ADMIN_EMAIL / ADMIN_PASSWORD environment credentials. An open
 * signup that granted admin on an email match (unverified) let anyone claim
 * the owner account, so no account can be created from the public internet.
 */
export async function POST() {
  return NextResponse.json({ error: 'Registration is closed' }, { status: 403 });
}
