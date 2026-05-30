import { NextRequest, NextResponse } from 'next/server';
import { getAdminChecklist, saveAdminChecklist, type AdminChecklistItem } from '@/lib/admin/checklist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await getAdminChecklist();
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[admin/checklist] GET', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: AdminChecklistItem[] };
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const items = await saveAdminChecklist(body.items);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[admin/checklist] PATCH', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
