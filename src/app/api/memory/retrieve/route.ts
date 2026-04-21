import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '@/lib/memory/rag';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { query, filters, test_run_id } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const searchFilters = { ...(filters || {}), test_run_id: test_run_id || 'PROD' };
    const results = await retrieve(query, searchFilters);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Retrieval API Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during retrieval' }, { status: 500 });
  }
}
