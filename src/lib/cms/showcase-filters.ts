/** GROQ visibility filter for showcase reads (pure, unit-tested). */
export type ShowcaseType = 'project' | 'caseStudy' | 'blogPost';

/**
 * Public readers never see drafts or items scheduled in the future.
 * The owner (admin session) sees everything.
 */
export function showcaseFilter(type: ShowcaseType, includeUnpublished: boolean): string {
  if (includeUnpublished) return `_type == "${type}"`;
  return `_type == "${type}" && !(_id in path("drafts.**")) && (!defined(publishedAt) || publishedAt <= now())`;
}
