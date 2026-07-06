/**
 * Seed realistic dummy content for validating the public profile UI.
 * - Sanity (4d6jaglm): UX case study + blog post + project, each with an
 *   uploaded cover image (assets.upload — works on the free tier).
 * - Neon profile sections: testimonial, service, reference, published post —
 *   so every section of /p/[handle] renders.
 * All docs are tagged "sample" / titled clearly so they're easy to remove.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@sanity/client';
import { PrismaClient } from '../src/generated/postgres/index.js';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_API_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_API_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (!projectId || !token) {
  console.error('Missing Sanity projectId or write token');
  process.exit(1);
}
const sanity = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false });

async function uploadImage(seed, label) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/1200/630`);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await sanity.assets.upload('image', buf, { filename: `${label}.jpg` });
  console.log(`uploaded image ${label}: ${asset._id}`);
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

function blocks(...paragraphs) {
  return paragraphs.map((text, i) => ({
    _type: 'block',
    _key: `blk${i}`,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `sp${i}`, text, marks: [] }],
  }));
}

// ── Sanity docs ─────────────────────────────────────────────────────
const caseImg = await uploadImage('prism-ux-case', 'ux-case-study-cover');
const blogImg = await uploadImage('prism-blog', 'blog-cover');
const projImg = await uploadImage('prism-project', 'project-cover');

await sanity.createOrReplace({
  _id: 'sample-case-study-fintech-onboarding',
  _type: 'caseStudy',
  title: 'Redesigning onboarding for a fintech super-app',
  slug: { _type: 'slug', current: 'fintech-onboarding-redesign' },
  client: 'NeoVault (sample)',
  summary:
    'A 6-week engagement to cut drop-off in a KYC-heavy onboarding flow. We mapped every abandonment point, rebuilt the flow around progressive disclosure, and moved document capture to the last possible moment.',
  outcome: 'Activation rate up 34%, median time-to-first-transaction down from 9 minutes to 3.5.',
  coverImage: caseImg,
  body: blocks(
    'The original flow front-loaded every regulatory requirement — 14 fields and two document uploads before the user saw any value. Analytics showed 61% abandonment on the document step alone.',
    'We restructured around a "value first, friction last" principle: users could explore the product in a sandboxed state immediately, with KYC requested only at the first real transaction.',
    'The design system introduced a reusable progressive-disclosure pattern that the client has since applied to two other flows.',
  ),
  tags: ['UX', 'Fintech', 'Onboarding', 'sample'],
  publishedAt: new Date('2026-03-15').toISOString(),
});
console.log('created case study');

await sanity.createOrReplace({
  _id: 'sample-blog-design-systems-ai',
  _type: 'blogPost',
  title: 'Design systems in the age of AI-generated UI',
  slug: { _type: 'slug', current: 'design-systems-ai-generated-ui' },
  excerpt:
    'When any screen can be generated in seconds, the design system stops being a component library and becomes a constitution — the encoded taste that keeps a thousand generated screens feeling like one product.',
  coverImage: blogImg,
  body: blocks(
    'Generated UI is cheap. Coherent UI is not. The teams winning with AI tooling are the ones whose design systems encode judgment, not just components.',
    'A token file is a constitution: it says what the product believes about hierarchy, rhythm and restraint. Generation without it produces plausible screens that belong to no product in particular.',
  ),
  tags: ['Design systems', 'AI', 'UX', 'sample'],
  publishedAt: new Date('2026-05-02').toISOString(),
});
console.log('created blog post');

await sanity.createOrReplace({
  _id: 'sample-project-atlas-research',
  _type: 'project',
  title: 'Atlas — research repository for product teams',
  slug: { _type: 'slug', current: 'atlas-research-repository' },
  summary:
    'A lightweight research repository that turns scattered interview notes into a searchable insight graph. Built as a 0→1 exploration with weekly user testing.',
  coverImage: projImg,
  tags: ['Product', 'Research', '0→1', 'sample'],
  url: 'https://example.com/atlas',
  featured: false,
  publishedAt: new Date('2026-01-20').toISOString(),
});
console.log('created project');

// ── Neon profile sections ───────────────────────────────────────────
const p = new PrismaClient();
const username = 'system_user';
const profile = await p.profile.findUnique({ where: { username } });
if (profile) {
  const sections = Array.isArray(profile.sections) ? profile.sections : [];
  const withoutSamples = sections.filter((s) => !String(s?.id ?? '').startsWith('sample-'));
  const now = new Date().toISOString();
  const samples = [
    {
      id: 'sample-published-1',
      type: 'published',
      title: 'What a personal cognitive OS actually does',
      content: {
        source: 'blog',
        summary: 'Observe → understand → decide → act: how the four-layer loop turns captured signals into published direction.',
        body: 'Most productivity tools store what you tell them. A cognitive OS argues with you: it watches the signals you capture, builds a model of what you care about, and pushes back with decisions.',
        url: 'https://memory-wugweb.vercel.app',
        tags: ['Systems', 'AI'],
        date: 'June 2026',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-testimonial-1',
      type: 'testimonial',
      title: 'Testimonial',
      content: {
        content: 'Vedanshu sees systems where others see screens. He rebuilt our onboarding logic in six weeks and the metrics moved within days of launch. (sample)',
        author: 'Priya Sharma — Head of Product, NeoVault',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-service-1',
      type: 'service',
      title: 'Product architecture review',
      content: {
        description: '90-minute deep dive into your product architecture with a written follow-up. (sample)',
        price: '₹8,000',
        popular: true,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-reference-1',
      type: 'reference',
      title: 'Talk: Designing decision systems',
      content: {
        url: 'https://example.com/talk',
        summary: 'Conference talk on layered cognition for personal tools. (sample)',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
  await p.profile.update({
    where: { username },
    data: { sections: [...withoutSamples, ...samples] },
  });
  console.log(`profile sections updated (+${samples.length} samples)`);
} else {
  console.warn('profile not found — skipped section seed');
}
await p.$disconnect();
console.log('DONE');
