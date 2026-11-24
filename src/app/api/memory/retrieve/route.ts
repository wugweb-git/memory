import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/auth';
import { readJsonObject, badRequest } from '@/lib/validation/http';
import { retrieve } from '@/lib/memory/rag';
import { aiErrorResponse } from '@/lib/ai/error-messages';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const adminGate = requireAdmin(req);
  if (adminGate instanceof NextResponse) return adminGate;
  try {
    const body = await readJsonObject(req);
    if (!body) return badRequest('JSON object body required');
    const { query, filters, test_run_id } = body as { query?: string; filters?: Record<string, unknown>; test_run_id?: string };

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const searchFilters = { ...(filters || {}), test_run_id: test_run_id || 'PROD' };
    const results = await retrieve(query, searchFilters);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Retrieval API Error:', error);
    const aiFailure = aiErrorResponse(error);
    if (aiFailure) return aiFailure;
    // Never forward raw error text: it can carry provider URLs, keys or SQL.
    return NextResponse.json({ error: 'Retrieval failed. Try again.' }, { status: 500 });
  }
}
