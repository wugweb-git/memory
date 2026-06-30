import { createClient, type SanityClient } from 'next-sanity';

// projectId/dataset are public (not secrets); default to the wugweb project so
// the public showcase renders even before env is wired. Env always overrides.
const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_API_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  'splvhmk1';
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_API_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  process.env.SANITY_DATASET ||
  'production';
const apiVersion = process.env.SANITY_API_VERSION || '2025-01-01';
// Vercel/Sanity integration provides SANITY_API_WRITE_TOKEN.
const writeToken = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '';

/** True when a Sanity project is configured. Callers fall back to the internal
 *  profile API when this is false, so the app never hard-fails without Sanity. */
export const sanityEnabled = Boolean(projectId);

export function sanityConfig() {
  return { projectId, dataset, apiVersion };
}

/** Public read client (CDN-cached). Null when Sanity isn't configured. */
export const sanityClient: SanityClient | null = projectId
  ? createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: 'published' })
  : null;

/** Write/draft client (token, no CDN). Null when token/project absent. */
export const sanityWriteClient: SanityClient | null =
  projectId && writeToken
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: writeToken,
      })
    : null;
