import { NextRequest, NextResponse } from 'next/server';
import { encodeReviewQuery, normalizeSharedFields, SHARE_REVIEW_PATH } from '@/lib/native/share-data';

export const dynamic = 'force-dynamic';

/**
 * Web Share Target endpoint (manifest share_target, POST multipart/form-data).
 * The service worker normally intercepts this request (it keeps files and works offline). This handler is
 * the fallback when no worker is controlling the page: it carries text/title/url to the review page as a
 * 303 redirect. Files are not accepted here (they need the worker); nothing is stored by this route.
 * The middleware already requires the owner session for this path.
 */
export async function POST(req: NextRequest) {
  let fields: Record<string, unknown> = {};
  try {
    const form = await req.formData();
    fields = { title: form.get('title'), text: form.get('text'), url: form.get('url') };
  } catch {
    /* unparsable body: fall through to an empty review */
  }
  const q = encodeReviewQuery(normalizeSharedFields(fields));
  return NextResponse.redirect(new URL(`${SHARE_REVIEW_PATH}${q ? `?${q}` : ''}`, req.url), 303);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.search;
  return NextResponse.redirect(new URL(`${SHARE_REVIEW_PATH}${q}`, req.url), 303);
}
