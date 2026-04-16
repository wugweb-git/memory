"use client";
import React from 'react';
import { 
  ShieldCheck, MapPin, Globe, Cpu,
  Twitter, Github, Linkedin, ExternalLink,
  Zap, Star
} from 'lucide-react';
import { motion } from 'framer-motion';

export const ProfileHeader = () => {
  const socials = [
    { label: 'LinkedIn', icon: Linkedin, href: '#', ariaLabel: 'Visit LinkedIn profile' },
    { label: 'GitHub', icon: Github, href: '#', ariaLabel: 'Visit GitHub profile' },
    { label: 'Twitter', icon: Twitter, href: '#', ariaLabel: 'Visit Twitter/X profile' },
    { label: 'Portfolio', icon: ExternalLink, href: '#', ariaLabel: 'Visit portfolio website' },
  ];

  const stats = [
    { label: 'Neural_Density', val: '4.2k Nodes', pct: 92 },
    { label: 'Logic_Stability', val: '98%', pct: 98 },
    { label: 'Experience_Matrix', val: 'Level_4', pct: 75 },
  ];

  const skills = ['Systems Arch', 'RAG Neural', 'Venture Mapping', 'Digital Twin'];

  return (
    <section aria-label="Profile overview" className="w-full">
      <div className="glass-panel p-10 rounded-[2.5rem] border border-border-primary relative overflow-hidden shadow-2xl">
        {/* Subtle background texture */}
        <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 relative z-10">
          
          {/* Avatar / Portrait */}
          <div className="relative shrink-0">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] bg-secondary border border-border-secondary flex items-center justify-center overflow-hidden shadow-inner p-2 bg-gradient-to-tr from-secondary to-bg-primary"
            >
              <img 
                src="/user.png" 
                alt="Vedanshu Srivastava – Systems Architect & Founder"
                className="w-full h-full object-cover rounded-[1.5rem]"
                onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=VS&size=512&background=F5F5F0&color=00AAFF&bold=true')} 
              />
            </motion.div>
            {/* Verified badge: Tactile style */}
            <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-accent-high text-bg-primary border border-white flex items-center justify-center shadow-xl shadow-black/10" aria-label="Verified identity">
              <ShieldCheck size={24} strokeWidth={2.5} aria-hidden="true" />
            </div>
          </div>

          {/* Identity Matrix */}
          <div className="flex-1 text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-1 kinetic-text">
                <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tighter uppercase italic">
                  Vedanshu Srivastava
                </h1>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-[10px] font-black text-bg-primary tracking-[0.2em] uppercase shadow-lg shadow-accent/20">
                  <Star size={10} fill="currentColor" /> Master_Prism
                </div>
              </div>
              <p className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed italic tracking-tight">
                Systems Architect &amp; Founder. Building the intersection of{' '}
                <span className="text-text-primary font-black uppercase tracking-tighter decoration-accent/30 decoration-4 underline-offset-4 underline">Human Spirit</span> and{' '}
                <span className="text-text-primary font-black uppercase tracking-tighter decoration-accent/30 decoration-4 underline-offset-4 underline">Machine Logic</span>.
              </p>
            </div>

            {/* Neural Meta Nodes */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary/50 border border-border-secondary group hover:border-accent/40 transition-colors">
                <MapPin size={14} className="text-accent group-hover:scale-125 transition-transform" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-text-tertiary">Global_Matrix_Deploy</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary/50 border border-border-secondary group hover:border-accent/40 transition-colors">
                <Globe size={14} className="text-text-tertiary group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-text-tertiary">wugweb.com/nexus</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-success/5 border border-success/20 group">
                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-success">LLM_Anchor_Active</span>
              </div>
            </div>

            {/* Social Signal Linklets */}
            <div className="pt-6 border-t border-border-secondary flex flex-wrap items-center justify-center lg:justify-start gap-3">
              {socials.map(social => (
                <a 
                  key={social.label} 
                  href={social.href}
                  aria-label={social.ariaLabel}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-bg-elevated border border-border-primary text-[10px] font-black text-text-tertiary uppercase tracking-widest transition-all hover:bg-black hover:text-bg-primary hover:scale-105 active:scale-95 shadow-sm"
                >
                  <social.icon size={14} /> {social.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right Core Stats */}
          <div className="hidden xl:flex flex-col gap-8 justify-center pl-12 border-l border-border-secondary min-w-[15rem]">
            {stats.map(stat => (
              <div key={stat.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-black text-text-tertiary tracking-[0.3em] uppercase">{stat.label}</span>
                  <span className="text-[10px] font-black font-mono text-accent">{stat.val}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden p-[1px] border border-border-secondary shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${stat.pct}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-accent-high opacity-80 rounded-full" 
                  />
                </div>
              </div>
            ))}
            
            <div className="pt-4 space-y-3">
               <span className="text-[9px] font-black text-text-tertiary tracking-[0.3em] uppercase block">Skill_Nodes</span>
               <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-secondary rounded border border-border-secondary text-[8px] font-bold text-text-secondary uppercase tracking-widest">{s}</span>
                  ))}
               </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
