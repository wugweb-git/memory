"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronRight, Globe, Eye, BookOpen, Loader2 } from 'lucide-react';
import { IDENTITY_CONFIG } from '@/config/identity';
import { useProfileData } from '@/hooks/useProfileData';

export const IdentityShowcase = () => {
  const { profile, byType, loading } = useProfileData();
  const posts = [...byType('published'), ...byType('blog')];
  const references = byType('reference');
  const publicUrl = `/p/${IDENTITY_CONFIG.HANDLE}`;

  const facets = [
    { platform: 'Public Profile', label: 'Live showcase', score: profile?.isPublished ? 100 : 0, status: profile?.isPublished ? 'LIVE' : 'DRAFT', href: publicUrl },
    { platform: 'Published', label: `${posts.length} works indexed`, score: Math.min(100, posts.length * 12), status: posts.length ? 'ACTIVE' : 'EMPTY', href: publicUrl },
    { platform: 'References', label: `${references.length} external links`, score: Math.min(100, references.length * 15), status: references.length ? 'SYNCED' : '—', href: '/portfolio' },
    { platform: 'Portfolio', label: IDENTITY_CONFIG.PORTFOLIO_URL.replace(/^https?:\/\//, ''), score: 85, status: 'STABLE', href: IDENTITY_CONFIG.PORTFOLIO_URL },
  ];

  return (
    <div className="glass-panel rounded-[3.5rem] border border-border-secondary overflow-hidden shadow-3xl bg-bg-secondary/[0.01]">
      <div className="flex flex-col xl:flex-row min-h-[420px]">
        <aside className="w-full xl:w-96 bg-bg-secondary/40 border-r border-border-primary p-8 xl:p-12 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-2xs font-black tracking-[0.5em] text-accent uppercase">Public layer</h3>
              <h4 className="text-3xl font-black text-text-primary  tracking-tighter uppercase leading-[0.9]">
                Identity surfaces
              </h4>
            </div>
            <p className="text-sm text-text-tertiary leading-relaxed">
              {profile?.bio?.slice(0, 160) ?? 'Publish posts from Output Studio or the profile editor to populate your public page.'}
              {profile?.bio && profile.bio.length > 160 ? '…' : ''}
            </p>
            <Link
              href={publicUrl}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-text-primary text-bg-primary text-2xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
            >
              <Eye size={14} /> View public profile <ExternalLink size={12} />
            </Link>
            <Link
              href="/admin/profile"
              className="block text-2xs font-bold text-accent uppercase tracking-widest hover:underline"
            >
              Edit profile & posts →
            </Link>
          </div>
        </aside>

        <div className="flex-1 p-8 xl:p-12 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-text-tertiary" size={28} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facets.map((f, idx) => (
                  <motion.a
                    key={f.platform}
                    href={f.href}
                    target={f.href.startsWith('http') ? '_blank' : undefined}
                    rel={f.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="glass-panel p-6 rounded-[2rem] border border-border-secondary hover:border-accent/30 block group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Globe size={18} className="text-text-tertiary group-hover:text-accent" />
                      <span className="text-2xs font-black uppercase text-success">{f.status}</span>
                    </div>
                    <p className="text-2xs font-black text-text-disabled uppercase tracking-widest">{f.platform}</p>
                    <p className="text-sm font-bold text-text-primary mt-1">{f.label}</p>
                    <div className="mt-4 h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${f.score}%` }} />
                    </div>
                  </motion.a>
                ))}
              </div>

              {posts.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-2xs font-black uppercase tracking-widest text-text-tertiary flex items-center gap-2">
                    <BookOpen size={14} /> Recent on profile
                  </h5>
                  {posts.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-bg-secondary/50 border border-border-secondary">
                      <span className="text-sm font-bold text-text-primary truncate">{p.title}</span>
                      <ChevronRight size={14} className="text-text-disabled shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
