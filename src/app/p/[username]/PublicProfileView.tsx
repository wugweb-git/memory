"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Linkedin, Twitter, Github, Globe, ExternalLink, ArrowUpRight, Loader2, Mail, MessageSquare,
} from 'lucide-react';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { useProfileData } from '@/hooks/useProfileData';
import type { ProfileSection } from '@/lib/profile/types';

/* ── helpers ─────────────────────────────────────────────────────── */

function sectionContent(s: ProfileSection) {
  return (s.content ?? {}) as Record<string, unknown>;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const SOCIAL_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  portfolio: Globe,
};

/** Small uppercase eyebrow — the one intentional uppercase in the design system. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary">
      {children}
    </h2>
  );
}

/* ── view ────────────────────────────────────────────────────────── */

export function PublicProfileView({ username }: { username: string }) {
  const { profile, byType, loading, error } = useProfileData(username);

  const isOwner = username === IDENTITY_CONFIG.HANDLE;
  const displayName = profile?.displayName ?? (isOwner ? IDENTITY_CONFIG.DISPLAY_NAME : username);
  const role = isOwner ? IDENTITY_CONFIG.ROLE : null;
  const bio = profile?.bio ?? null;
  const avatar = profile?.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${username}`;

  const posts = useMemo(
    () => [...byType('blog'), ...byType('published')],
    [byType],
  );
  const references = useMemo(() => byType('reference'), [byType]);
  const ventures = useMemo(() => byType('venture'), [byType]);
  const experience = useMemo(() => byType('experience'), [byType]);

  // Only real, owner-authored content renders publicly — no placeholder
  // services or testimonials.
  const services = useMemo(() => byType('service'), [byType]);
  const testimonials = useMemo(() => byType('testimonial'), [byType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-text-disabled" size={28} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-text-primary">This profile isn&rsquo;t live yet</p>
        <p className="text-sm text-text-tertiary">Check the link, or come back soon.</p>
      </div>
    );
  }

  const socials = (profile?.socialLinks ?? []).filter((l) => l.url);

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      {/* ── Identity header ── */}
      <header className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary leading-tight">
              {displayName}
            </h1>
            {role && (
              <p className="text-base text-text-tertiary mt-2">{role}</p>
            )}
          </div>
          <img
            src={avatar}
            alt={displayName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-border-secondary bg-bg-secondary object-cover shrink-0"
            onError={(e) => { e.currentTarget.src = avatarFallbackUrl(160); }}
          />
        </div>

        {bio && (
          <p className="text-lg text-text-secondary leading-relaxed max-w-prose">{bio}</p>
        )}

        {(socials.length > 0 || isOwner) && (
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <a
                href={`mailto:${IDENTITY_CONFIG.EMAIL}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-sm font-bold hover:bg-text-secondary transition-colors"
              >
                <Mail size={15} /> Get in touch
              </a>
            )}
            {socials.map((link) => {
              const key = (link.platform ?? '').toLowerCase();
              const Icon = SOCIAL_ICONS[key] ?? ExternalLink;
              return (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-secondary text-sm font-medium text-text-secondary hover:border-border-primary hover:text-text-primary transition-colors"
                >
                  <Icon size={15} className="text-text-tertiary" />
                  {link.platform}
                </a>
              );
            })}
          </div>
        )}
      </header>

      <div className="mt-16 space-y-16">
        {/* ── Ventures / focus areas (real profile sections) ── */}
        {ventures.length > 0 && (
          <section className="space-y-4">
            <Eyebrow>Now building</Eyebrow>
            <div className="space-y-3">
              {ventures.map((v) => {
                const c = sectionContent(v);
                return (
                  <div key={v.id} className="rounded-2xl border border-border-secondary bg-bg-secondary/50 p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-bold text-text-primary">{v.title}</h3>
                      {str(c.phase) && <span className="text-2xs text-text-tertiary shrink-0">{str(c.phase)}</span>}
                    </div>
                    {(str(c.summary) || str(c.industry)) && (
                      <p className="text-sm text-text-secondary mt-1.5">{str(c.summary) || str(c.industry)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Experience / career tree (Neon profile sections, type=experience) ── */}
        {experience.length > 0 && (
          <section className="space-y-4">
            <Eyebrow>Career</Eyebrow>
            <ol className="relative border-l border-border-secondary ml-1.5 space-y-6">
              {experience.map((exp) => {
                const c = sectionContent(exp);
                const company = str(c.company) || str(c.organization);
                const industries = Array.isArray(c.industries)
                  ? (c.industries as string[])
                  : str(c.industry) ? [str(c.industry)] : [];
                const logic = str(c.originalLogic) || str(c.logic);
                const perspective = str(c.perspective2026) || str(c.perspective);
                return (
                  <li key={exp.id} className="ml-5">
                    <span className="absolute -left-[6.5px] mt-1.5 h-3 w-3 rounded-full bg-accent border-2 border-bg-primary" />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-base font-bold text-text-primary">{exp.title}</h3>
                      {str(c.date) && <span className="text-2xs text-text-disabled shrink-0">{str(c.date)}</span>}
                    </div>
                    {company && <p className="text-sm text-text-tertiary mt-0.5">{company}</p>}
                    {logic && <p className="text-sm text-text-secondary mt-2 max-w-prose">{logic}</p>}
                    {perspective && (
                      <p className="text-sm text-text-secondary mt-2 pl-3 border-l-2 border-accent/40 max-w-prose">
                        <span className="text-accent font-medium">Now: </span>{perspective}
                      </p>
                    )}
                    {industries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {industries.map((ind) => (
                          <span key={ind} className="text-2xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary border border-border-secondary text-text-tertiary">
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ── Writing & published work (Neon profile sections) ── */}
        {posts.length > 0 && (
          <section className="space-y-2">
            <Eyebrow>Writing</Eyebrow>
            <div className="divide-y divide-border-secondary">
              {posts.slice(0, 8).map((post) => {
                const c = sectionContent(post);
                const url = str(c.url);
                const summary = str(c.summary) || str(c.body);
                const inner = (
                  <>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                        {post.title}
                      </h3>
                      {str(c.date) && (
                        <span className="text-2xs text-text-disabled shrink-0">{str(c.date)}</span>
                      )}
                    </div>
                    {summary && (
                      <p className="text-sm text-text-tertiary mt-1 line-clamp-2 max-w-prose">
                        {summary.slice(0, 200)}
                      </p>
                    )}
                  </>
                );
                return url ? (
                  <a key={post.id} href={url} target="_blank" rel="noopener noreferrer" className="block py-4 group">
                    {inner}
                  </a>
                ) : (
                  <div key={post.id} className="py-4 group">{inner}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Showcase (Sanity CMS) ── */}
        <SanityShowcase />

        {/* ── Services (only when real) ── */}
        {services.length > 0 && (
          <section className="space-y-4">
            <Eyebrow>Work with me</Eyebrow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((s) => {
                const c = sectionContent(s);
                return (
                  <div key={s.id} className="rounded-2xl border border-border-secondary p-5 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-text-primary">{s.title}</h3>
                      {str(c.description) && (
                        <p className="text-sm text-text-tertiary mt-1">{str(c.description)}</p>
                      )}
                    </div>
                    {str(c.price) && (
                      <p className="text-lg font-black text-text-primary">{str(c.price)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Testimonials (only when real) ── */}
        {testimonials.length > 0 && (
          <section className="space-y-4">
            <Eyebrow>Kind words</Eyebrow>
            <div className="space-y-3">
              {testimonials.map((t) => {
                const c = sectionContent(t);
                return (
                  <figure key={t.id} className="rounded-2xl bg-bg-secondary/50 border border-border-secondary p-5">
                    <blockquote className="text-base text-text-secondary leading-relaxed">
                      &ldquo;{str(c.content) || t.title}&rdquo;
                    </blockquote>
                    {str(c.author) && (
                      <figcaption className="text-2xs text-text-tertiary mt-3">— {str(c.author)}</figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </section>
        )}

        {/* ── External references / links ── */}
        {references.length > 0 && (
          <section className="space-y-2">
            <Eyebrow>Elsewhere</Eyebrow>
            <div className="divide-y divide-border-secondary">
              {references.map((ref) => {
                const c = sectionContent(ref);
                return (
                  <a
                    key={ref.id}
                    href={str(c.url) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 py-3.5 group"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                        {ref.title}
                      </h3>
                      {str(c.summary) && (
                        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{str(c.summary)}</p>
                      )}
                    </div>
                    <ArrowUpRight size={16} className="text-text-disabled group-hover:text-accent shrink-0 transition-colors" />
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-20 pt-8 border-t border-border-secondary flex items-center justify-between gap-4">
        <p className="text-2xs text-text-disabled">
          {displayName} · powered by Identity Prism
        </p>
        {isOwner && (
          <Link
            href="/ask"
            className="inline-flex items-center gap-1.5 text-2xs font-bold text-text-tertiary hover:text-accent transition-colors"
          >
            <MessageSquare size={13} /> Ask my digital twin
          </Link>
        )}
      </footer>
    </main>
  );
}

/* ── Sanity-backed showcase (projects / case studies / writing) ────
   Renders nothing when Sanity isn't configured or empty. */
function SanityShowcase() {
  const [data, setData] = useState<{
    enabled: boolean;
    projects: any[];
    caseStudies: any[];
    blogPosts: any[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/showcase')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data?.enabled) return null;

  const items = [
    ...(data.projects ?? []).map((p: any) => ({ ...p, kind: 'Project' })),
    ...(data.caseStudies ?? []).map((c: any) => ({ ...c, kind: 'Case study' })),
    ...(data.blogPosts ?? []).map((b: any) => ({ ...b, kind: 'Writing' })),
  ];
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xs font-bold uppercase tracking-widest text-text-tertiary">Selected work</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.slice(0, 8).map((it: any) => {
          const body = (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xs font-bold text-accent">{it.kind}</span>
                {it.url && <ArrowUpRight size={14} className="text-text-disabled group-hover:text-accent transition-colors" />}
              </div>
              <h3 className="text-base font-bold text-text-primary mt-2 group-hover:text-accent transition-colors">
                {it.title}
              </h3>
              {(it.summary || it.excerpt) && (
                <p className="text-sm text-text-tertiary mt-1.5 line-clamp-3">
                  {String(it.summary ?? it.excerpt ?? '').slice(0, 180)}
                </p>
              )}
              {Array.isArray(it.tags) && it.tags.length > 0 && (
                <p className="text-2xs text-text-disabled mt-3">{it.tags.slice(0, 4).join(' · ')}</p>
              )}
            </>
          );
          const cls = "rounded-2xl border border-border-secondary p-5 block group hover:border-border-primary transition-colors";
          return it.url ? (
            <a key={it._id} href={it.url} target="_blank" rel="noopener noreferrer" className={cls}>
              {body}
            </a>
          ) : (
            <div key={it._id} className={cls}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
