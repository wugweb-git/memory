import { NextRequest, NextResponse } from 'next/server';
import { getShowcase } from '@/lib/cms/queries';
import { isAdminRequest } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/showcase
 * Public showcase content (projects / case studies / blog) from Sanity.
 * Public callers get published items only (no drafts, nothing scheduled in
 * the future); the owner's admin session also sees drafts.
 * Returns { enabled:false, ... } when Sanity isn't configured so the
 * public profile can fall back to the internal API.
 */
export async function GET(req: NextRequest) {
  try {
    const data = await getShowcase({ includeUnpublished: isAdminRequest(req) });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API/Showcase]', err);
    return NextResponse.json(
      { enabled: false, projects: [], caseStudies: [], blogPosts: [], error: err.message },
      { status: 200 },
    );
  }
}
