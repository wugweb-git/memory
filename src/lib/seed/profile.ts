import { postgres, postgres as prisma } from '@/lib/db/postgres';
import { IDENTITY_CONFIG } from '@/config/identity';

const SECTIONS = [
  {
    type: 'venture',
    title: 'Identity Prism',
    content: {
      industry: 'AI Engineering',
      phase: '0→1',
      role: 'Founder',
      logicApplied: 'Vector embedding of human logic pulses with RAG-grounded persona.',
      legacyLessons: 'Spirit is the ultimate metadata for durable identity systems.',
      perspective2026: 'Active synthesis node — unified memory, persona, and output layers.',
      tags: ['LangChain', 'OpenAI', 'MongoDB', 'Next.js'],
    },
  },
  {
    type: 'venture',
    title: 'Neural OS Platform',
    content: {
      industry: 'Fintech',
      phase: 'Scaling',
      role: 'Architect',
      logicApplied: 'Distributed ingestion gates with provenance scoring.',
      legacyLessons: 'Immutable audit trails are non-negotiable in trustless systems.',
      perspective2026: 'Refactored into 2026 semantic clusters and cognitive L3.',
      tags: ['Next.js', 'Prisma', 'Vercel'],
    },
  },
  {
    type: 'experience',
    title: 'Fintech Disruption 2018',
    content: {
      company: 'NeoBank Corp',
      industries: ['Fintech', 'UX', 'Product'],
      originalLogic: 'Reduced onboarding friction through progressive disclosure.',
      perspective2026: 'Evolved into intent-based anticipatory design patterns.',
      date: 'March 2018',
    },
  },
  {
    type: 'experience',
    title: 'AI Middleware Architecture',
    content: {
      company: 'NeuralSync',
      industries: ['AI', 'Systems Architect', 'Tech/DevOps'],
      originalLogic: 'Caching layer for LLM responses to reduce latency.',
      perspective2026: 'Now semantic alignment clusters across model providers.',
      date: 'November 2021',
    },
  },
  {
    type: 'published',
    title: 'The Future of UX in Fintech Architecture',
    content: {
      source: 'Substack',
      summary: 'A deep dive into 0→1 scaling for digital banking interfaces.',
      summaryAI: 'Reduced friction in high-stakes transactions as the core UX metric.',
      tags: ['UX', 'Fintech', 'Scaling'],
      url: IDENTITY_CONFIG.PORTFOLIO_URL,
      date: 'April 2026',
    },
  },
  {
    type: 'published',
    title: 'Architecting Scalable Vector Engines',
    content: {
      source: 'Medium',
      summary: 'RAG optimization strategies for real-time retrieval.',
      summaryAI: 'Latent space efficiency for real-time retrieval pipelines.',
      tags: ['AI Engine', 'RAG', 'Vector'],
      url: IDENTITY_CONFIG.GITHUB_URL,
      date: 'March 2026',
    },
  },
];

const SOURCES = [
  { name: 'github', type: 'external', trust_score: 0.9, auth_status: 'connected' },
  { name: 'linkedin', type: 'external', trust_score: 0.85, auth_status: 'connected' },
  { name: 'youtube', type: 'external', trust_score: 0.6, auth_status: 'disconnected' },
  { name: 'behance', type: 'external', trust_score: 0.7, auth_status: 'connected' },
  { name: 'dribbble', type: 'external', trust_score: 0.65, auth_status: 'disconnected' },
  { name: 'twitter', type: 'external', trust_score: 0.75, auth_status: 'connected' },
];

export async function seedProfileAndSources() {
  const handle = IDENTITY_CONFIG.HANDLE;

  await postgres.profile.upsert({
    where: { username: handle },
    update: {
      displayName: IDENTITY_CONFIG.DISPLAY_NAME,
      bio: `${IDENTITY_CONFIG.ROLE} — building Identity Prism OS.`,
      socialLinks: [
        { platform: 'LinkedIn', url: IDENTITY_CONFIG.LINKEDIN_URL },
        { platform: 'GitHub', url: IDENTITY_CONFIG.GITHUB_URL },
        { platform: 'Twitter', url: IDENTITY_CONFIG.TWITTER_URL },
        { platform: 'Portfolio', url: IDENTITY_CONFIG.PORTFOLIO_URL },
      ],
      sections: SECTIONS,
      isPublished: true,
    },
    create: {
      username: handle,
      displayName: IDENTITY_CONFIG.DISPLAY_NAME,
      bio: `${IDENTITY_CONFIG.ROLE} — building Identity Prism OS.`,
      socialLinks: [
        { platform: 'LinkedIn', url: IDENTITY_CONFIG.LINKEDIN_URL },
        { platform: 'GitHub', url: IDENTITY_CONFIG.GITHUB_URL },
        { platform: 'Twitter', url: IDENTITY_CONFIG.TWITTER_URL },
        { platform: 'Portfolio', url: IDENTITY_CONFIG.PORTFOLIO_URL },
      ],
      sections: SECTIONS,
      isPublished: true,
    },
  });

  for (const s of SOURCES) {
    const existing = await prisma.source.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.source.update({
        where: { id: existing.id },
        data: {
          auth_status: s.auth_status,
          trust_score: s.trust_score,
          last_sync: s.auth_status === 'connected' ? new Date() : existing.last_sync,
        },
      });
    } else {
      await prisma.source.create({
        data: {
          name: s.name,
          type: s.type,
          trust_score: s.trust_score,
          auth_status: s.auth_status,
          last_sync: s.auth_status === 'connected' ? new Date() : null,
        },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin && admin.role !== 'admin') {
      await prisma.user.update({ where: { id: admin.id }, data: { role: 'admin' } });
    }
  }

  return { username: handle, sections: SECTIONS.length, sources: SOURCES.length };
}
