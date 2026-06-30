import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@sanity/client';

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_API_PROJECT_ID;
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_API_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error('Missing projectId or write token', { projectId, hasToken: Boolean(token) });
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false });

const doc = await client.createIfNotExists({
  _id: 'sample-project-identity-prism',
  _type: 'project',
  title: 'Identity Prism OS',
  slug: { _type: 'slug', current: 'identity-prism-os' },
  summary:
    'A personal cognitive operating system — layered memory, signals, semantics, and a decision engine that turns knowledge into direction.',
  tags: ['AI', 'Systems', 'RAG', 'Product'],
  url: 'https://memory-git-main-wugweb.vercel.app',
  featured: true,
  publishedAt: new Date().toISOString(),
});

console.log(`OK project=${projectId} dataset=${dataset} _id=${doc._id} title="${doc.title}"`);
