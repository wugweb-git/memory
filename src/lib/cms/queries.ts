import { sanityClient, sanityWriteClient } from './sanity';

/* ── GROQ ──────────────────────────────────────────────────────── */
const PROJECTS = `*[_type == "project" && !(_id in path("drafts.**"))] | order(featured desc, publishedAt desc){
  _id, title, "slug": slug.current, summary, tags, url, featured, publishedAt
}`;

const CASE_STUDIES = `*[_type == "caseStudy" && !(_id in path("drafts.**"))] | order(publishedAt desc){
  _id, title, "slug": slug.current, client, summary, outcome, tags, publishedAt
}`;

const BLOG_POSTS = `*[_type == "blogPost" && !(_id in path("drafts.**"))] | order(publishedAt desc){
  _id, title, "slug": slug.current, excerpt, tags, publishedAt
}`;

/* ── Reads (public showcase) ───────────────────────────────────── */
export async function getProjects() {
  if (!sanityClient) return [];
  return sanityClient.fetch(PROJECTS);
}

export async function getCaseStudies() {
  if (!sanityClient) return [];
  return sanityClient.fetch(CASE_STUDIES);
}

export async function getBlogPosts() {
  if (!sanityClient) return [];
  return sanityClient.fetch(BLOG_POSTS);
}

/** Single call for the public profile/showcase surface. */
export async function getShowcase() {
  if (!sanityClient) {
    return { enabled: false, projects: [], caseStudies: [], blogPosts: [] };
  }
  const [projects, caseStudies, blogPosts] = await Promise.all([
    sanityClient.fetch(PROJECTS),
    sanityClient.fetch(CASE_STUDIES),
    sanityClient.fetch(BLOG_POSTS),
  ]);
  return { enabled: true, projects, caseStudies, blogPosts };
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
