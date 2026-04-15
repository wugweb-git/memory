"use client";
import React from 'react';
import { 
  ShieldCheck, MapPin, Globe, Cpu,
  Twitter, Github, Linkedin, ExternalLink
} from 'lucide-react';

export const ProfileHeader = () => {
  const socials = [
    { label: 'LinkedIn', icon: Linkedin, href: '#', ariaLabel: 'Visit LinkedIn profile' },
    { label: 'GitHub', icon: Github, href: '#', ariaLabel: 'Visit GitHub profile' },
    { label: 'Twitter', icon: Twitter, href: '#', ariaLabel: 'Visit Twitter/X profile' },
    { label: 'Portfolio', icon: ExternalLink, href: '#', ariaLabel: 'Visit portfolio website' },
  ];

  const stats = [
    { label: 'Venture DNA', val: '4.2k Nodes', pct: 92 },
    { label: 'Logic Sync', val: '98%', pct: 98 },
    { label: 'Neural Weight', val: 'High', pct: 75 },
  ];

  return (
    <section aria-label="Profile overview">
      <div className="glass-panel p-8 rounded-2xl border border-primary relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-secondary border border-primary flex items-center justify-center overflow-hidden">
              <img 
                src="/user.png" 
                alt="Vedanshu Srivastava – Systems Architect & Founder"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=VS&size=512&background=0A0A0A&color=00AAFF&bold=true')} 
              />
            </div>
            {/* Verified badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-secondary border border-primary flex items-center justify-center text-success" aria-label="Verified identity">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 text-center md:text-left space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-2xl md:text-[var(--font-xl)] font-bold text-text-primary tracking-tight">
                  Vedanshu Srivastava
                </h1>
                <span className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-xs font-bold text-accent tracking-wider uppercase">
                  Identity_Prism
                </span>
              </div>
              <p className="text-base text-text-secondary font-normal max-w-2xl leading-relaxed">
                Systems Architect &amp; Founder. Building the intersection of{' '}
                <strong className="text-text-primary font-semibold">Human Spirit</strong> and{' '}
                <strong className="text-text-primary font-semibold">Machine Logic</strong>.
              </p>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
              <div className="flex items-center gap-2 text-text-tertiary">
                <MapPin size={14} className="text-accent" aria-hidden="true" />
                <span className="text-xs font-mono uppercase tracking-widest">GLOBAL_DEPLOYMENT</span>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <Globe size={14} aria-hidden="true" />
                <span className="text-xs font-mono uppercase tracking-widest">WUGWEB.COM</span>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <Cpu size={14} aria-hidden="true" />
                <span className="text-xs font-mono uppercase tracking-widest">RAG_ACTIVE</span>
              </div>
            </div>

            {/* Socials */}
            <div className="pt-4 border-t border-primary flex flex-wrap items-center justify-center md:justify-start gap-3">
              {socials.map(social => (
                <a 
                  key={social.label} 
                  href={social.href}
                  aria-label={social.ariaLabel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-primary text-xs font-semibold text-text-tertiary uppercase tracking-wide transition-all hover:bg-tertiary hover:text-text-primary hover:border-primary focus-ring"
                >
                  <social.icon size={14} aria-hidden="true" /> {social.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right Stats */}
          <div className="hidden lg:flex flex-col gap-4 justify-center pl-8 border-l border-primary min-w-[11rem]">
            {stats.map(stat => (
              <div key={stat.label} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase">{stat.label}</span>
                  <span className="text-xs font-mono font-bold text-text-secondary">{stat.val}</span>
                </div>
                <div className="h-1 w-full bg-tertiary rounded-full overflow-hidden border border-primary">
                  <div className="h-full bg-accent opacity-60 rounded-full transition-all duration-1000" style={{ width: `${stat.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
