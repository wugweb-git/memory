"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, MapPin, Globe, 
  Linkedin, Twitter, Github, ExternalLink,
  Zap, Star, Sparkles, MessageSquare,
  ArrowUpRight, ArrowRight, Brain, User, Settings
} from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SERVICES = [
  {
    title: 'Priority DM',
    description: '2 days reply guaranteed',
    price: 'FREE',
    icon: <MessageSquare size={20} className="text-accent" />,
    popular: false,
  },
  {
    title: 'Cognitive Architecture Review',
    description: 'Video meeting • 45 mins',
    price: '₹2,500',
    icon: <Zap size={20} className="text-warning" />,
    popular: true,
  },
];

const TESTIMONIALS = [
  {
    content: "The Prism OS has completely redefined how I manage my cognitive load. It's not just a portfolio; it's an extension of my intellect.",
    author: "Recommended by d on LinkedIn",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=d"
  },
  {
    content: "Vedanshu's insights into systems architecture are unparalleled. The Digital Twin integration is a game-changer.",
    author: "swz // developer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=swz"
  }
];

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const tabs = ['All_Nodes', '1:1_Neural_Sync', 'Priority_Uplink', 'Digital_Twin'] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All_Nodes');

  const filteredServices = SERVICES.filter((service) => {
    if (activeTab === 'All_Nodes') return true;
    if (activeTab === '1:1_Neural_Sync') return service.title.includes('Review');
    if (activeTab === 'Priority_Uplink') return service.title.includes('Priority');
    if (activeTab === 'Digital_Twin') return service.title.includes('Cognitive');
    return true;
  });

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col selection:bg-accent/30 transition-colors duration-1000">
      <ToastContainer position="bottom-right" theme="light" />
      
      {/* Background Interactivity */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vh] bg-accent/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vh] bg-accent/3 rounded-full blur-[120px]" />
        <div className="scanline" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto w-full px-[var(--space-page)] py-10 md:py-20 space-y-20 md:space-y-32">
        
        {/* Profile Genesis Section */}
        <div className="flex flex-col xl:flex-row gap-20 xl:gap-32">
           {/* Left Column: Portrait & Identity Synthesis */}
           <div className="xl:w-[480px] space-y-16">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square w-full rounded-[4.5rem] bg-accent/5 overflow-hidden shadow-3xl border-4 border-white group"
              >
                 <img 
                    src={`https://api.dicebear.com/7.x/micah/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                    alt={username}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="absolute bottom-12 left-12 right-12">
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                      className="glass-panel p-8 rounded-[2.5rem] border-white/20 backdrop-blur-3xl shadow-3xl"
                    >
                       <h1 className="text-5xl font-black italic tracking-[calc(-0.05em)] uppercase leading-[0.85] text-text-primary kinetic-text">
                          {username === 'vedanshu' ? 'Vedanshu Srivastava' : username}
                       </h1>
                       <div className="mt-6 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] opacity-60">Digital Twin Active</p>
                       </div>
                    </motion.div>
                 </div>
              </motion.div>

              <div className="space-y-10">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-text-primary flex items-center justify-center text-bg-primary shadow-2xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                       <Brain size={28} className="relative z-10" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <button className="w-full py-5 bg-text-primary text-bg-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-accent transition-all active:scale-95 group relative overflow-hidden">
                          <span className="relative z-10">Initiate Neural Sync</span>
                          <div className="absolute inset-0 bg-accent translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                       </button>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between px-4 border-t border-border-primary pt-10">
                    <div className="flex gap-6">
                       <Linkedin className="text-text-disabled hover:text-accent transition-all hover:scale-110 cursor-pointer" size={22} />
                       <Twitter className="text-text-disabled hover:text-text-primary transition-all hover:scale-110 cursor-pointer" size={22} />
                       <Globe className="text-text-disabled hover:text-success transition-all hover:scale-110 cursor-pointer" size={22} />
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-tertiary opacity-40">UPLINK_STATUS</span>
                       <span className="text-[10px] font-black text-success uppercase tracking-widest italic">NOMINAL_SYNC</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Interaction Layers & Synthesis */}
           <div className="flex-1 space-y-24">
              {/* Testimonials Bento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {TESTIMONIALS.map((t, i) => (
                   <motion.div 
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                    key={i} 
                    className="p-12 glass-panel border border-border-secondary rounded-[3.5rem] shadow-xl relative overflow-hidden group hover:shadow-3xl transition-all duration-700"
                   >
                     <div className="absolute top-10 right-10 text-border-primary group-hover:text-accent/10 transition-colors duration-700">
                        <MessageSquare size={60} strokeWidth={3} />
                     </div>
                     <div className="relative z-10 space-y-8 pt-4">
                        <p className="text-xl font-bold tracking-tight italic text-text-secondary leading-relaxed kinetic-text">
                          "{t.content}"
                        </p>
                        <div className="flex items-center gap-5 pt-4">
                           <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-primary overflow-hidden shadow-inner p-1">
                              <img src={t.avatar} alt="Author" className="w-full h-full rounded-xl opacity-80" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase tracking-widest text-text-primary">{t.author}</span>
                              <div className="flex items-center gap-1.5 opacity-30 mt-1 grayscale">
                                 <Star size={10} className="fill-warning text-warning" />
                                 <Star size={10} className="fill-warning text-warning" />
                                 <Star size={10} className="fill-warning text-warning" />
                                 <Star size={10} className="fill-warning text-warning" />
                                 <Star size={10} className="fill-warning text-warning" />
                              </div>
                           </div>
                        </div>
                     </div>
                   </motion.div>
                 ))}
              </div>

              {/* Interaction Matrix */}
              <div className="space-y-10">
                 <div className="flex items-center justify-between px-2">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-text-tertiary ml-2 kinetic-text italic">Interaction_Modes</h2>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-0.5 bg-border-primary" />
                       <span className="text-[10px] font-black text-accent uppercase tracking-widest">Active Services</span>
                    </div>
                 </div>

                 {/* Filter Tabs */}
                 <div className="flex flex-wrap gap-4 px-2">
                    {tabs.map((tab) => (
                      <button 
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                         activeTab === tab 
                         ? 'bg-text-primary text-bg-primary border-text-primary shadow-2xl scale-105' 
                         : 'bg-bg-secondary/40 text-text-tertiary border-border-primary/50 hover:bg-bg-elevated hover:text-text-primary hover:border-border-primary'
                       }`}
                      >
                        {tab}
                      </button>
                    ))}
                 </div>

                 {/* Services Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                    {filteredServices.map((service, i) => (
                      <motion.div 
                       initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                       key={service.title}
                       className="glass-panel border-2 border-border-secondary p-10 rounded-[3.5rem] flex flex-col justify-between group hover:border-accent/40 transition-all cursor-pointer shadow-xl hover:shadow-3xl relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none group-hover:bg-accent/10" />
                         
                         <div className="space-y-6 relative z-10">
                            <div className="flex items-center justify-between">
                               <div className="p-3 rounded-2xl bg-bg-secondary border border-border-primary shadow-inner group-hover:scale-110 transition-transform">
                                  {service.icon}
                               </div>
                               {service.popular && (
                                  <span className="px-4 py-1.5 bg-accent text-bg-primary text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-accent/20">Popular</span>
                               )}
                            </div>
                            <div className="space-y-4">
                               <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-[0.9] text-text-primary group-hover:text-accent transition-colors">
                                  {service.title}
                               </h3>
                               <p className="text-[11px] font-black text-text-tertiary uppercase tracking-widest opacity-60">
                                  {service.description}
                               </p>
                            </div>
                         </div>

                         <div className="flex items-center justify-between mt-16 pt-10 border-t border-border-primary/40 relative z-10">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black text-text-primary tracking-tighter">{service.price}</span>
                              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>
                            <div className="w-14 h-14 rounded-[1.5rem] bg-text-primary flex items-center justify-center text-bg-primary group-hover:bg-accent group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
                               <ArrowRight size={24} />
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>
              </div>

              {/* About Section / Profile Genesis */}
              <section className="glass-panel p-16 rounded-[4rem] border border-border-secondary relative overflow-hidden">
                 <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent/5 blur-[120px] pointer-events-none" />
                 
                 <div className="flex flex-col xl:flex-row gap-16 relative z-10 items-center xl:items-start">
                    <div className="xl:w-1/3 space-y-6">
                       <h2 className="text-[11px] font-black tracking-[0.5em] text-accent uppercase flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                            <User size={16} />
                          </div>
                          Profile_Genesis
                       </h2>
                       <h3 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.85] text-text-primary kinetic-text">About_The_Mirror</h3>
                    </div>
                    
                    <div className="xl:w-2/3 space-y-10">
                       <p className="text-2xl font-bold text-text-secondary leading-snug italic tracking-tight">
                          "Passionate about bridging the gap between human intuition and machine intelligence. I specialize in building <span className="text-accent underline decoration-4 underline-offset-8">Identity Prisms</span> that act as cognitive extensions of the self."
                       </p>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-6">
                          {[
                            { label: 'Neural Density', val: '4.2k Nodes' },
                            { label: 'Alignment', val: '98.2%' },
                            { label: 'Uplink Delay', val: '14ms' },
                          ].map(stat => (
                            <div key={stat.label} className="space-y-1">
                               <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block opacity-40">{stat.label}</span>
                               <span className="text-sm font-black text-text-primary uppercase font-mono italic">{stat.val}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      </div>

      {/* Persistent Call to Action */}
      <motion.div 
        initial={{ y: 200 }} animate={{ y: 0 }}
        className="fixed bottom-6 right-4 md:bottom-12 md:right-12 z-[100]"
      >
         <div className="relative group">
            <div className="absolute -inset-6 bg-accent/20 rounded-full blur-3xl group-hover:bg-accent/40 transition-all duration-500" />
            <button className="relative px-6 md:px-12 py-4 md:py-6 bg-text-primary text-bg-primary rounded-[1.25rem] md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 md:gap-6 hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-500">
               Build Your Prism
               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <ArrowUpRight size={20} />
               </div>
            </button>
         </div>
      </motion.div>
    </div>
  );
}
