import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { parseEndpointBody, parseSubscription } from '@/lib/push/keys';
import { NOT_CONFIGURED_MESSAGE, getVapidConfig } from '@/lib/push/send';
import { removeSubscription, saveSubscription } from '@/lib/push/store';

export const dynamic = 'force-dynamic';

/** GET — whether push is configured, plus the public VAPID key the browser needs to subscribe. Owner only. */
export async function GET(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const cfg = getVapidConfig();
  return NextResponse.json({ configured: !!cfg, publicKey: cfg?.publicKey ?? null });
}

/** POST { subscription } — store this device's PushSubscription. Owner only. */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  if (!getVapidConfig()) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE, code: 'NOT_CONFIGURED' }, { status: 503 });
  }
  const parsed = parseSubscription(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await saveSubscription(parsed.subscription);
  } catch (err) {
    console.error('[API/Push/Subscribe]', err);
    return NextResponse.json({ error: 'Could not save this device. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ subscribed: true });
}

/** DELETE { endpoint } — forget this device. Owner only. */
export async function DELETE(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  const parsed = parseEndpointBody(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await removeSubscription(parsed.endpoint);
  } catch (err) {
    console.error('[API/Push/Subscribe]', err);
    return NextResponse.json({ error: 'Could not remove this device. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ subscribed: false });
}
