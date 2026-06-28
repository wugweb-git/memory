import { NextResponse } from 'next/server';
import { getShowcase } from '@/lib/cms/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/showcase
 * Public showcase content (projects / case studies / blog) from Sanity.
 * Returns { enabled:false, ... } when Sanity isn't configured so the
 * public profile can fall back to the internal API.
 */
export async function GET() {
  try {
    const data = await getShowcase();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API/Showcase]', err);
    return NextResponse.json(
      { enabled: false, projects: [], caseStudies: [], blogPosts: [], error: err.message },
      { status: 200 },
    );
  }
}
