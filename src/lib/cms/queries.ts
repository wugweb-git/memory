import { sanityClient, sanityWriteClient } from './sanity';
import { showcaseFilter } from './showcase-filters';

/* ── GROQ ──────────────────────────────────────────────────────── */
const PROJECT_FIELDS = `{
  _id, title, "slug": slug.current, summary, tags, url, featured, publishedAt,
  "coverImage": coverImage.asset->url
}`;
const CASE_STUDY_FIELDS = `{
  _id, title, "slug": slug.current, client, summary, outcome, tags, publishedAt,
  "coverImage": coverImage.asset->url
}`;
const BLOG_POST_FIELDS = `{
  _id, title, "slug": slug.current, excerpt, tags, publishedAt,
  "coverImage": coverImage.asset->url
}`;

const projectsQuery = (all: boolean) =>
  `*[${showcaseFilter('project', all)}] | order(featured desc, publishedAt desc)${PROJECT_FIELDS}`;
const caseStudiesQuery = (all: boolean) =>
  `*[${showcaseFilter('caseStudy', all)}] | order(publishedAt desc)${CASE_STUDY_FIELDS}`;
const blogPostsQuery = (all: boolean) =>
  `*[${showcaseFilter('blogPost', all)}] | order(publishedAt desc)${BLOG_POST_FIELDS}`;

/* ── Reads (public showcase) ───────────────────────────────────── */
export async function getProjects() {
  if (!sanityClient) return [];
  return sanityClient.fetch(projectsQuery(false));
}

export async function getCaseStudies() {
  if (!sanityClient) return [];
  return sanityClient.fetch(caseStudiesQuery(false));
}

export async function getBlogPosts() {
  if (!sanityClient) return [];
  return sanityClient.fetch(blogPostsQuery(false));
}

/**
 * Single call for the public profile/showcase surface. Public callers get
 * published items only; pass includeUnpublished for the owner's view.
 */
export async function getShowcase(opts: { includeUnpublished?: boolean } = {}) {
  const all = Boolean(opts.includeUnpublished);
  // Owner view reads through the non-CDN client so drafts are visible.
  const client = all ? (sanityWriteClient ?? sanityClient) : sanityClient;
  if (!client) {
    return { enabled: false, projects: [], caseStudies: [], blogPosts: [] };
  }
  const [projects, caseStudies, blogPosts] = await Promise.all([
    client.fetch(projectsQuery(all)),
    client.fetch(caseStudiesQuery(all)),
    client.fetch(blogPostsQuery(all)),
  ]);
  return { enabled: true, projects, caseStudies, blogPosts };
}

/* ── In-app CMS management (create / edit / delete public content) ─ */
export type CmsType = 'project' | 'caseStudy' | 'blogPost';

const MANAGED_TYPES: CmsType[] = ['project', 'caseStudy', 'blogPost'];

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || `item-${Date.now()}`;
}

/** All managed docs (incl. drafts) with _id, for the in-app manager.
 *  Uses the non-CDN client when available so newly created/deleted docs
 *  reflect immediately (the CDN read client is eventually consistent). */
export async function listManagedContent() {
  const client = sanityWriteClient ?? sanityClient;
  if (!client) return { enabled: false as const, project: [], caseStudy: [], blogPost: [] };
  const query = `{
    "project": *[_type == "project"] | order(_createdAt desc){ _id, _type, title, "slug": slug.current, summary, tags, url, featured, publishedAt },
    "caseStudy": *[_type == "caseStudy"] | order(_createdAt desc){ _id, _type, title, "slug": slug.current, client, summary, outcome, tags, publishedAt },
    "blogPost": *[_type == "blogPost"] | order(_createdAt desc){ _id, _type, title, "slug": slug.current, excerpt, tags, publishedAt }
  }`;
  const res = await client.fetch(query);
  return { enabled: true as const, ...res };
}

/** Create a public content doc in Sanity. Returns null when writes aren't configured. */
export async function createContent(type: CmsType, fields: Record<string, any>) {
  if (!sanityWriteClient) return null;
  if (!MANAGED_TYPES.includes(type)) throw new Error(`Unsupported CMS type: ${type}`);
  const title = String(fields.title ?? '').trim();
  if (!title) throw new Error('title required');
  const tags = Array.isArray(fields.tags)
    ? fields.tags
    : String(fields.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const base = {
    _type: type,
    title,
    slug: { _type: 'slug', current: slugify(fields.slug || title) },
    tags,
    publishedAt: fields.publishedAt ?? new Date().toISOString(),
  };
  const byType: Record<CmsType, Record<string, any>> = {
    project: { summary: fields.summary ?? '', url: fields.url ?? undefined, featured: Boolean(fields.featured) },
    caseStudy: { client: fields.client ?? '', summary: fields.summary ?? '', outcome: fields.outcome ?? '' },
    blogPost: { excerpt: fields.excerpt ?? '' },
  };
  return sanityWriteClient.create({ ...base, ...byType[type] });
}

/** Patch fields on an existing doc. */
export async function updateContent(id: string, fields: Record<string, any>) {
  if (!sanityWriteClient) return null;
  const set: Record<string, any> = { ...fields };
  if (typeof fields.tags === 'string') {
    set.tags = fields.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  if (typeof fields.title === 'string' && fields.slug === undefined) {
    // keep slug stable unless explicitly changed
    delete set.slug;
  }
  return sanityWriteClient.patch(id).set(set).commit();
}

/** Delete a public content doc. */
export async function deleteContent(id: string) {
  if (!sanityWriteClient) return null;
  return sanityWriteClient.delete(id);
}

/* ── Writes (L5 publish → Sanity) ──────────────────────────────── */
export interface GeneratedOutputDoc {
  title: string;
  platform: string;
  content: string;
  status?: 'draft' | 'approved' | 'published';
  sourceDecisionId?: string;
  confidence?: number;
}

/**
 * Persist an L3-generated artifact into Sanity as a `generatedOutput` doc.
 * Returns null when Sanity write isn't configured (caller keeps its own path).
 */
export async function createGeneratedOutput(doc: GeneratedOutputDoc) {
  if (!sanityWriteClient) return null;
  return sanityWriteClient.create({
    _type: 'generatedOutput',
    title: doc.title,
    platform: doc.platform,
    content: doc.content,
    status: doc.status ?? 'draft',
    sourceDecisionId: doc.sourceDecisionId ?? null,
    confidence: typeof doc.confidence === 'number' ? doc.confidence : null,
    createdAt: new Date().toISOString(),
  });
}
