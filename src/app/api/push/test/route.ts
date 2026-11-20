import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/security/auth';
import { NOT_CONFIGURED_MESSAGE, notifyOwner } from '@/lib/push/send';

export const dynamic = 'force-dynamic';

/** POST — send a short test notification to every subscribed owner device. Owner only. Honest results. */
export async function POST(req: NextRequest) {
  const actor = requireOwner(req);
  if (actor instanceof NextResponse) return actor;
  try {
    const r = await notifyOwner({ title: 'Test notification', body: 'Notifications are working on this device.', url: '/integrations' });
    if (r.notConfigured) {
      return NextResponse.json({ ...r, code: 'NOT_CONFIGURED', message: NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    if (r.sent === 0 && r.failed === 0) {
      return NextResponse.json({ ...r, code: 'NO_DEVICES', message: 'No devices are subscribed. Turn notifications on for a device first.' }, { status: 404 });
    }
    if (r.sent === 0) {
      return NextResponse.json({ ...r, code: 'FAILED', message: 'The push service did not accept the notification. Try again in a moment.' }, { status: 502 });
    }
    return NextResponse.json({ ...r, message: `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}.` });
  } catch (err) {
    console.error('[API/Push/Test]', err);
    return NextResponse.json({ error: 'Could not send a test notification. Try again.', message: 'Could not send a test notification. Try again.' }, { status: 500 });
  }
}
