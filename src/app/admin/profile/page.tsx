"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowLeft, Upload, Edit3, Settings, 
  ExternalLink, Copy, Share2, Eye,
  ChevronRight, Sparkles, Image as ImageIcon,
  Palette, Shield
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<'Basic' | 'Design' | 'Advanced'>('Design');

  const tabs = [
    { id: 'Basic', label: 'Basic Details' },
    { id: 'Design', label: 'Design' },
    { id: 'Advanced', label: 'Advanced' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] font-sans">
      {/* Top Header */}
      <header className="border-b border-[#F0F0EE] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-[#F5F5F3] rounded-full transition-colors" aria-label="Back to admin">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black tracking-tight uppercase italic">Edit Profile</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F3] rounded-lg border border-[#E0E0DE]">
                <Eye size={14} className="text-[#888886]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#666664]">Hidden from profile</span>
                <button className="ml-1">
                   <ChevronRight size={14} className="rotate-90" />
                </button>
             </div>
             <button className="p-2 hover:bg-[#F5F5F3] rounded-lg border border-[#E0E0DE] transition-colors">
                <Copy size={18} />
             </button>
             <button className="p-2 hover:bg-[#F5F5F3] rounded-lg border border-[#E0E0DE] transition-colors">
                <Share2 size={18} />
             </button>
             <button className="p-2 hover:bg-[#F5F5F3] rounded-lg border border-[#E0E0DE] transition-colors">
                <ExternalLink size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-10">
           {tabs.map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${
                 activeTab === tab.id 
                 ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' 
                 : 'bg-[#F5F5F3] text-[#666664] border-[#E0E0DE] hover:bg-[#EBEBE9]'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           {/* Form Section */}
           <div className="lg:col-span-7 space-y-12">
              <AnimatePresence mode="wait">
                {activeTab === 'Design' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                  >
                    {/* Media Section */}
                    <section className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#888886]">Media</h3>
                       
                       <div className="space-y-4">
                          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-6 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                             <div className="space-y-1">
                                <h4 className="font-bold text-sm">Cover Image(s)</h4>
                                <p className="text-xs text-[#888886]">Visually uplift your service</p>
                                <p className="text-[10px] text-[#A0A09E] mt-2 font-medium">Recommended size 1280×780px</p>
                             </div>
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0DE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3] transition-all">
                                <Upload size={14} /> Upload
                             </button>
                          </div>

                          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-6 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                             <div className="space-y-1">
                                <h4 className="font-bold text-sm">Thumbnail</h4>
                                <p className="text-xs text-[#888886]">Uplift the service presence in profile</p>
                                <p className="text-[10px] text-[#A0A09E] mt-2 font-medium">Recommended size 600×600px</p>
                             </div>
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0DE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3] transition-all">
                                <Upload size={14} /> Upload
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Service Display Section */}
                    <section className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#888886]">Service Display</h3>
                       
                       <div className="space-y-4">
                          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-6 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm">Payment Button Label</h4>
                                  <a href="#" className="text-[10px] text-accent font-bold hover:underline">Learn more</a>
                                </div>
                                <p className="text-[10px] text-[#A0A09E] font-medium">Current: Default</p>
                             </div>
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0DE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3] transition-all">
                                <Edit3 size={14} /> Edit
                             </button>
                          </div>

                          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-6 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm">Service Label</h4>
                                  <a href="#" className="text-[10px] text-accent font-bold hover:underline">Learn more</a>
                                </div>
                                <p className="text-[10px] text-[#A0A09E] font-medium">Current: Default</p>
                             </div>
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0DE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3] transition-all">
                                <Edit3 size={14} /> Edit
                             </button>
                          </div>

                          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-6 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                             <div className="space-y-1">
                                <h4 className="font-bold text-sm">Showcase testimonials</h4>
                                <p className="text-xs text-[#888886]">Select the best testimonials to be displayed on page</p>
                                <p className="text-[10px] text-[#A0A09E] font-medium mt-1">Current: None selected</p>
                             </div>
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0DE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3] transition-all">
                                <Edit3 size={14} /> Edit
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Configuration Section */}
                    <section className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#888886]">Configurations</h3>
                        <div className="bg-[#F5F5F3] border border-[#E0E0DE] rounded-2xl p-8 flex items-center gap-6">
                           <div className="w-16 h-16 rounded-2xl bg-white border border-[#E0E0DE] flex items-center justify-center text-accent">
                              <Shield size={32} />
                           </div>
                           <div className="flex-1 space-y-1">
                              <h4 className="font-bold text-sm">Strict Neural Integration</h4>
                              <p className="text-xs text-[#888886]">Ensure your profile accurately reflects your cognitive data patterns.</p>
                           </div>
                           <div className="px-3 py-1 bg-success/10 text-success text-[10px] font-black rounded-lg uppercase tracking-widest">
                              Enabled
                           </div>
                        </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           {/* Preview Sidebar */}
           <div className="lg:col-span-5 h-fit sticky top-28">
              <section className="bg-white border border-[#E0E0DE] rounded-[2rem] overflow-hidden shadow-2xl">
                 <div className="p-4 border-b border-[#F0F0EE] flex items-center justify-between bg-[#FAFAFA]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#888886]">Live Preview</span>
                    <div className="flex gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                       <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                       <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                    </div>
                 </div>
                 
                 <div className="aspect-[4/5] bg-[#FDFDFB] p-8 overflow-y-auto custom-scrollbar">
                    {/* Visual Preview of the Profile */}
                    <div className="space-y-8">
                       <div className="flex flex-col items-center text-center space-y-4">
                          <div className="w-24 h-24 rounded-full bg-[#E0E0DE] overflow-hidden border-2 border-white shadow-lg">
                             <img src="https://ui-avatars.com/api/?name=VS&size=200&background=F5F5F0&color=1A1A1A&bold=true" alt="User" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase">Vedanshu Srivastava</h2>
                            <p className="text-xs font-bold text-[#888886] uppercase tracking-widest mt-1">Systems Architect</p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="p-6 bg-white border border-[#F0F0EE] rounded-2xl shadow-sm">
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Service</h4>
                                <Sparkles size={12} className="text-accent" />
                             </div>
                             <h3 className="text-lg font-black tracking-tight italic">Breaking into Design</h3>
                             <div className="flex items-center justify-between mt-6">
                                <span className="font-black text-sm">₹500</span>
                                <button className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Book Now</button>
                             </div>
                          </div>

                          <div className="p-6 bg-white border border-[#F0F0EE] rounded-2xl shadow-sm">
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Digital Twin</h4>
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                             </div>
                             <p className="text-xs font-medium text-[#666664] leading-relaxed italic">"Access my cognitive patterns for architectural advice."</p>
                             <button className="w-full mt-6 py-3 border border-[#F0F0EE] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F5F5F3]">Start Neural Chat</button>
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              {/* Sidebar Promo */}
              <div className="mt-8 bg-black rounded-3xl p-8 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-[60px] group-hover:bg-accent/30 transition-all" />
                 <div className="relative z-10 space-y-4">
                    <span className="px-2 py-1 bg-accent text-bg-primary text-[8px] font-black rounded uppercase tracking-widest">Beta</span>
                    <h3 className="text-white text-xl font-black italic tracking-tighter">Create service landing page</h3>
                    <p className="text-[#888886] text-xs font-medium leading-relaxed">Optimized for conversion and a better, more detailed way to present a service.</p>
                    <div className="flex flex-col gap-2 pt-2">
                       <button className="w-full py-4 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">Try Now</button>
                       <button className="w-full py-4 bg-transparent text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Landing pages (1)</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Persistence Bar */}
      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] md:w-auto">
         <div className="bg-white/80 backdrop-blur-3xl border border-[#E0E0DE] rounded-2xl md:rounded-full px-1 py-1 flex items-center justify-between md:justify-start gap-1 shadow-2xl">
            {[
               { icon: <Palette size={18} />, label: 'Theme' },
               { icon: <ImageIcon size={18} />, label: 'Images' },
               { icon: <Settings size={18} />, label: 'Settings' },
            ].map(item => (
              <button key={item.label} className="p-3 hover:bg-[#F5F5F3] rounded-full transition-colors group relative">
                 {item.icon}
                 <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-[10px] font-black rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {item.label}
                 </span>
              </button>
            ))}
            <div className="w-px h-8 bg-[#E0E0DE] mx-1" />
            <button className="px-8 py-3 bg-[#1A1A1A] text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
               Save Changes
            </button>
         </div>
      </div>
    </div>
  );
}
