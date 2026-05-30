"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, MapPin, Globe, Twitter, Github, Linkedin, ExternalLink, Zap, Star, Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { useProfileData } from '@/hooks/useProfileData';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export const ProfileHeader = () => {
  const { profile, byType, loading: profileLoading } = useProfileData();
  const [liveStats, setLiveStats] = useState<{ packets: number; stability: number | null } | null>(null);

  const displayName = profile?.displayName ?? IDENTITY_CONFIG.DISPLAY_NAME;
  const bio =
    profile?.bio ??
    `${IDENTITY_CONFIG.ROLE}. Building the intersection of human spirit and machine logic.`;
  const avatarSrc = profile?.avatarUrl || avatarFallbackUrl(512);

  const skillTags = [
    ...new Set(
      byType('venture')
        .flatMap((s) => {
          const c = (s.content ?? {}) as Record<string, unknown>;
          return Array.isArray(c.tags) ? (c.tags as string[]) : [];
        })
        .slice(0, 6),
    ),
  ];
  const skills =
    skillTags.length > 0
      ? skillTags
      : ['Systems Arch', 'RAG Neural', 'Venture Mapping', 'Digital Twin'];

  useEffect(() => {
    Promise.all([
      fetch(API_ENDPOINTS.memory.stats.path).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(API_ENDPOINTS.health.system.path).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([memStats, health]) => {
      const packets = memStats?.total_packets ?? memStats?.total ?? 0;
      const stability = health?.metrics?.logic_stability_pct ?? null;
      setLiveStats({
        packets,
        stability: stability ?? (health?.core_integrity === 'PASSED' ? 100 : null),
      });
    });
  }, []);

  const packetDisplay =
    liveStats == null
      ? '… Nodes'
      : liveStats.packets >= 1000
        ? `${(liveStats.packets / 1000).toFixed(1)}k Nodes`
        : `${liveStats.packets} Nodes`;

  const socials = (profile?.socialLinks?.length
    ? profile.socialLinks
        .filter((l) => l.url)
        .map((l) => ({
          label: l.platform ?? 'Link',
          href: l.url!,
          icon:
            (l.platform ?? '').toLowerCase().includes('linkedin')
              ? Linkedin
              : (l.platform ?? '').toLowerCase().includes('github')
                ? Github
                : (l.platform ?? '').toLowerCase().includes('twitter')
                  ? Twitter
                  : ExternalLink,
        }))
    : [
        { label: 'LinkedIn', icon: Linkedin, href: IDENTITY_CONFIG.LINKEDIN_URL },
        { label: 'GitHub', icon: Github, href: IDENTITY_CONFIG.GITHUB_URL },
        { label: 'Twitter', icon: Twitter, href: IDENTITY_CONFIG.TWITTER_URL },
        { label: 'Portfolio', icon: ExternalLink, href: IDENTITY_CONFIG.PORTFOLIO_URL },
      ]) as Array<{ label: string; icon: typeof Linkedin; href: string }>;

  const stats = [
    {
      label: 'Neural_Density',
      val: packetDisplay,
      pct: liveStats ? Math.min(100, Math.round((liveStats.packets / Math.max(liveStats.packets, 1)) * 100)) : 0,
    },
    {
      label: 'Logic_Stability',
      val: liveStats?.stability != null ? `${liveStats.stability}%` : '…',
      pct: liveStats?.stability ?? 0,
    },
    { label: 'Sync_Density', val: liveStats ? 'Live' : '…', pct: liveStats?.stability ?? 0 },
  ];

  return (
    <section aria-label="Profile overview" className="w-full">
      <div className="glass-panel p-10 rounded-[2.5rem] border border-border-primary relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 relative z-10">
          <div className="relative shrink-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] bg-secondary border border-border-secondary flex items-center justify-center overflow-hidden shadow-inner"
            >
              <img
                src={avatarSrc}
                alt={displayName}
                className="w-full h-full object-cover rounded-[1.5rem]"
                onError={(e) => {
                  e.currentTarget.src = avatarFallbackUrl(512);
                }}
              />
            </motion.div>
            <div
              className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-accent-high text-bg-primary border border-white flex items-center justify-center shadow-xl"
              aria-label="Verified identity"
            >
              <ShieldCheck size={24} strokeWidth={2.5} aria-hidden="true" />
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-1 kinetic-text">
                <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tighter uppercase italic">
                  {profileLoading ? '…' : displayName}
                </h1>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-[10px] font-black text-bg-primary tracking-[0.2em] uppercase shadow-lg shadow-accent/20">
                  <Star size={10} fill="currentColor" /> {IDENTITY_CONFIG.ROLE.split(' ')[0]}
                </div>
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border-secondary text-[10px] font-bold uppercase text-text-tertiary hover:text-text-primary"
                >
                  <Pencil size={12} /> Edit
                </Link>
              </div>
              <p className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed italic tracking-tight">
                {bio}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary/50 border border-border-secondary">
                <MapPin size={14} className="text-accent" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-text-tertiary">
                  Global_Matrix
                </span>
              </div>
              <a
                href={`/p/${IDENTITY_CONFIG.HANDLE}`}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary/50 border border-border-secondary hover:border-accent/40"
              >
                <Globe size={14} className="text-text-tertiary" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-text-tertiary">
                  Public profile
                </span>
              </a>
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-success/5 border border-success/20">
                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-success">
                  LLM_Anchor_Active
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-border-secondary flex flex-wrap items-center justify-center lg:justify-start gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-bg-elevated border border-border-primary text-[10px] font-black text-text-tertiary uppercase tracking-widest transition-all hover:bg-black hover:text-bg-primary hover:scale-105 shadow-sm"
                >
                  <social.icon size={14} /> {social.label}
                </a>
              ))}
            </div>
          </div>

          <div className="hidden xl:flex flex-col gap-8 justify-center pl-12 border-l border-border-secondary min-w-[15rem]">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-black text-text-tertiary tracking-[0.3em] uppercase">
                    {stat.label}
                  </span>
                  <span className="text-[10px] font-black font-mono text-accent">{stat.val}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border-secondary shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.pct}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-accent-high opacity-80 rounded-full"
                  />
                </div>
              </div>
            ))}
            <div className="pt-4 space-y-3">
              <span className="text-[9px] font-black text-text-tertiary tracking-[0.3em] uppercase block">
                Skill_Nodes
              </span>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-secondary rounded border border-border-secondary text-[8px] font-bold text-text-secondary uppercase tracking-widest"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
