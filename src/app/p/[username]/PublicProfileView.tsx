"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, User, Globe, Linkedin, Twitter, Github, ExternalLink,
  Zap, Star, Sparkles, MessageSquare, ArrowRight, ArrowUpRight, BookOpen, Loader2,
} from 'lucide-react';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { useProfileData } from '@/hooks/useProfileData';
import { PUBLIC_PROFILE_SERVICES, PUBLIC_PROFILE_TESTIMONIALS } from '@/config/ui-content';
import type { ProfileSection } from '@/lib/profile/types';

function sectionContent(s: ProfileSection) {
  return (s.content ?? {}) as Record<string, unknown>;
}

export function PublicProfileView({ username }: { username: string }) {
  const { profile, byType, loading, error } = useProfileData(username);
  const tabs = ['All_Nodes', '1:1_Neural_Sync', 'Priority_Uplink', 'Digital_Twin'] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All_Nodes');

  const displayName = profile?.displayName ?? (username === IDENTITY_CONFIG.HANDLE ? IDENTITY_CONFIG.DISPLAY_NAME : username);
  const bio =
    profile?.bio ??
    'Passionate about bridging human intuition and machine intelligence through Identity Prism.';
  const avatar = profile?.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${username}`;

  const posts = useMemo(
    () => [...byType('blog'), ...byType('published')],
    [byType],
  );
  const references = useMemo(() => byType('reference'), [byType]);

  const servicesFromProfile = byType('service').map((s, i) => {
    const c = sectionContent(s);
    return {
      title: s.title,
      description: String(c.description ?? ''),
      price: String(c.price ?? 'FREE'),
      popular: Boolean(c.popular),
      tab: (c.tab as string) ?? 'All_Nodes',
      icon:
        String(c.tab) === 'Priority_Uplink' ? (
          <MessageSquare size={20} className="text-accent" />
        ) : (
          <Zap size={20} className="text-warning" />
        ),
    };
  });

  const services =
    servicesFromProfile.length > 0
      ? servicesFromProfile
      : PUBLIC_PROFILE_SERVICES.map((s) => ({
          ...s,
          icon:
            s.tab === 'Priority_Uplink' ? (
              <MessageSquare size={20} className="text-accent" />
            ) : (
              <Zap size={20} className="text-warning" />
            ),
        }));

  const testimonialsFromProfile = byType('testimonial').map((s) => {
    const c = sectionContent(s);
    return {
      content: String(c.content ?? s.title),
      author: String(c.author ?? 'Anonymous'),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(c.author ?? s.id))}`,
    };
  });

  const testimonials =
    testimonialsFromProfile.length > 0
      ? testimonialsFromProfile
      : PUBLIC_PROFILE_TESTIMONIALS.map((t) => ({
          content: t.content,
          author: t.author,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.avatarSeed}`,
        }));

  const filteredServices = services.filter((service) => {
    if (activeTab === 'All_Nodes') return true;
    if (activeTab === 'Digital_Twin') return (service.title ?? '').toLowerCase().includes('cognitive');
    return 'tab' in service && service.tab === activeTab;
  });

  const socialIcons: Record<string, typeof Linkedin> = {
    linkedin: Linkedin,
    github: Github,
    twitter: Twitter,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="animate-spin text-accent" size={36} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary gap-4 px-4">
        <p className="text-text-tertiary">Profile not found or not yet seeded.</p>
        <Link href="/" className="text-accent text-sm font-bold uppercase">
          Back to console
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-[1400px] mx-auto w-full px-[var(--space-page)] py-10 md:py-20 space-y-20 md:space-y-32">
      <div className="flex flex-col xl:flex-row gap-20 xl:gap-32">
        <div className="xl:w-[480px] space-y-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square w-full rounded-[4.5rem] bg-accent/5 overflow-hidden shadow-3xl border-4 border-white group"
          >
            <img
              src={avatar}
              alt={displayName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              onError={(e) => {
                e.currentTarget.src = avatarFallbackUrl(400);
              }}
            />
            <div className="absolute bottom-12 left-12 right-12">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-panel p-8 rounded-[2.5rem] border-white/20 backdrop-blur-3xl shadow-3xl"
              >
                <h1 className="text-5xl font-black italic tracking-tight uppercase leading-[0.85] text-text-primary kinetic-text">
                  {displayName}
                </h1>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] opacity-60">
                    {profile?.isPublished === false ? 'Draft' : 'Digital Twin Active'}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <Link
              href="/ask"
              className="flex items-center justify-center gap-3 w-full py-5 bg-text-primary text-bg-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-accent transition-all"
            >
              <Brain size={20} /> Initiate Neural Sync
            </Link>
            <div className="flex gap-4 justify-center">
              {(profile?.socialLinks ?? []).map((link) => {
                const Icon = socialIcons[(link.platform ?? '').toLowerCase()] ?? ExternalLink;
                if (!link.url) return null;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-border-secondary hover:border-accent text-text-tertiary hover:text-accent"
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-24">
          {references.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-text-tertiary">References</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {references.map((ref) => {
                  const c = sectionContent(ref);
                  return (
                    <a
                      key={ref.id}
                      href={String(c.url ?? '#')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-panel p-6 rounded-2xl border border-border-secondary hover:border-accent/40 block"
                    >
                      <h3 className="font-bold">{ref.title}</h3>
                      <p className="text-xs text-text-tertiary mt-2 line-clamp-2">{String(c.summary ?? '')}</p>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section className="space-y-8">
              <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-text-tertiary flex items-center gap-3">
                <BookOpen size={16} className="text-accent" /> Latest_Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.slice(0, 6).map((post, idx) => {
                  const c = sectionContent(post);
                  const url = String(c.url ?? '#');
                  return (
                    <motion.a
                      key={post.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-panel p-8 rounded-[2rem] border border-border-secondary hover:border-accent/40 block group"
                    >
                      <span className="text-[9px] font-black uppercase text-accent">{post.type}</span>
                      <h3 className="text-xl font-black mt-2 group-hover:text-accent transition-colors">{post.title}</h3>
                      <p className="text-sm text-text-tertiary mt-2 line-clamp-3 italic">
                        {String(c.summary ?? c.body ?? '').slice(0, 160)}
                      </p>
                      <span className="text-[10px] text-text-disabled mt-4 block">{String(c.date ?? '')}</span>
                    </motion.a>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-12 glass-panel border border-border-secondary rounded-[3.5rem] shadow-xl relative overflow-hidden"
              >
                <p className="text-xl font-bold italic text-text-secondary leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center gap-5 pt-8">
                  <img src={t.avatar} alt="" className="w-12 h-12 rounded-2xl" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{t.author}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-10">
            <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-text-tertiary">Interaction_Modes</h2>
            <div className="flex flex-wrap gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border-2 ${
                    activeTab === tab
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'border-border-secondary text-text-tertiary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredServices.map((service, i) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel border-2 border-border-secondary p-10 rounded-[3.5rem] flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="flex justify-between">
                      {service.icon}
                      {'popular' in service && service.popular && (
                        <span className="px-3 py-1 bg-accent text-bg-primary text-[9px] font-black uppercase rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-black italic uppercase">{service.title}</h3>
                    <p className="text-[11px] font-black text-text-tertiary uppercase opacity-60">{service.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-12 pt-8 border-t border-border-primary/40">
                    <span className="text-3xl font-black">{service.price}</span>
                    <div className="w-14 h-14 rounded-[1.5rem] bg-text-primary flex items-center justify-center text-bg-primary">
                      <ArrowRight size={24} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <section className="glass-panel p-16 rounded-[4rem] border border-border-secondary">
            <h2 className="text-[11px] font-black tracking-[0.5em] text-accent uppercase mb-6">About</h2>
            <p className="text-2xl font-bold text-text-secondary leading-snug italic">{bio}</p>
          </section>
        </div>
      </div>

      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 right-4 md:bottom-12 md:right-12 z-[100]"
      >
        <Link
          href="/"
          className="relative px-8 py-5 bg-text-primary text-bg-primary rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 hover:bg-accent transition-all"
        >
          Build Your Prism <ArrowUpRight size={18} />
        </Link>
      </motion.div>
    </div>
  );
}
