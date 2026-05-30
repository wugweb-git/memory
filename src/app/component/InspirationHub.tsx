"use client";
import React, { useEffect, useState } from 'react';
import { Heart, Sparkles, ExternalLink, Globe, MousePointer2, Bookmark, Loader2, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDENTITY_CONFIG } from '@/config/identity';
import { parseBlobItems } from '@/lib/ui/blob';

interface InspirationItem {
  id: string;
  title: string;
  platform: string;
  whyLiked: string;
  industry: string;
  tags: string[];
  date: string;
  url?: string;
}

export const InspirationHub = () => {
  const [items, setItems]   = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      /* Fetch curated/bookmarked items from blob buffer */
      const res = await fetch('/api/blob?type=inspiration&status=reviewed');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = parseBlobItems(data);

      const apiItems: InspirationItem[] = rows
        .slice(0, 6)
        .map((b: Record<string, unknown>) => {
          const meta = (b.metadata && typeof b.metadata === 'object' ? b.metadata : {}) as Record<string, unknown>;
          const raw = typeof b.raw_payload === 'string' ? b.raw_payload : '';
          return {
            id: String(b.id ?? ''),
            title: String(meta.title ?? (raw.slice(0, 60) || 'Untitled')),
            platform: String(b.source_origin ?? 'External'),
            whyLiked: String(meta.why ?? (raw.slice(0, 120) || '—')),
            industry: String(b.type_tag ?? 'General'),
            tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
            date: b.created_at ? new Date(String(b.created_at)).toLocaleDateString() : '—',
            url: meta.url ? String(meta.url) : undefined,
          };
        });

      setItems(apiItems);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="space-y-10 w-full" aria-label="Inspiration hub">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
            <Bookmark size={22} className="text-danger" /> Inspiration_Nexus
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">
            Curated External Activity — Global Collector
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl border border-border-secondary text-text-disabled hover:text-accent hover:border-accent/30 transition-colors"
            aria-label="Refresh inspiration feed">
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className={`px-5 py-2 rounded-full border text-[10px] font-black flex items-center gap-3 uppercase tracking-widest shadow-sm transition-colors ${
            error ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-danger/5 border-danger/20 text-danger'
          }`}>
            <Heart size={14} fill="currentColor" className={error ? '' : 'animate-pulse'} />
            {error ? 'Collector: Offline' : loading ? 'Loading…' : 'Collector: Active'}
          </div>
        </div>
      </div>

      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && items.length === 0 ? (
          <li className="col-span-full flex items-center justify-center py-20 gap-3 text-text-disabled">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-sm font-medium">Loading inspirations…</span>
          </li>
        ) : items.length === 0 ? (
          <li className="col-span-full text-sm text-text-tertiary italic py-12 px-2">
            No inspiration items yet. Save links to the buffer with type <code className="text-accent">inspiration</code> and mark them reviewed.
          </li>
        ) : (
          items.map((item, idx) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              role="listitem"
            >
              <article className="glass-panel rounded-[2rem] p-8 border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-700 group flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                <header className="flex items-center justify-between mb-8">
                  <span className="text-[10px] font-black text-text-tertiary tracking-[0.2em] uppercase flex items-center gap-3 italic">
                    <Globe size={14} className="text-text-disabled" /> {item.platform}
                  </span>
                  <time className="text-[10px] text-text-disabled font-mono font-bold uppercase tracking-widest">{item.date}</time>
                </header>

                <h3 className="text-lg font-black text-text-primary mb-6 group-hover:text-danger transition-colors leading-none tracking-tight kinetic-text">
                  {item.title}
                </h3>

                <div className="p-5 rounded-xl bg-bg-secondary/40 border-l-2 border-danger/40 mb-6 flex-1 shadow-inner">
                  <div className="flex items-center gap-3 mb-3 text-[9px] font-black text-danger tracking-[0.3em] uppercase">
                    <Sparkles size={12} className="opacity-60" /> THE_WHY
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium italic">
                    &ldquo;{item.whyLiked}&rdquo;
                  </p>
                </div>

                <footer className="flex items-center justify-between mt-auto pt-6 border-t border-border-secondary/50">
                  <div className="flex gap-2">
                    {(item.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] px-3 py-1 rounded-lg bg-bg-secondary border border-border-secondary text-text-tertiary font-black font-mono uppercase italic">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {/* Open real URL if available, else disabled */}
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-bg-primary hover:bg-black transition-all flex items-center justify-center shadow-lg active:scale-90"
                      aria-label={`Open ${item.title}`}>
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <span className="w-10 h-10 rounded-2xl bg-bg-secondary border border-border-secondary text-text-disabled flex items-center justify-center opacity-40 cursor-not-allowed">
                      <ExternalLink size={16} />
                    </span>
                  )}
                </footer>
              </article>
            </motion.li>
          ))
        )}

        {/* Collector extension node */}
        <li role="listitem">
          <div className="glass-panel rounded-[2.5rem] p-8 border-2 border-dashed border-border-secondary flex flex-col items-center justify-center text-center min-h-[320px] hover:border-danger/30 hover:shadow-2xl transition-all duration-700 group cursor-pointer"
            onClick={() => window.open(`${IDENTITY_CONFIG.SITE_URL}/extension`, '_blank')}>
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-bg-secondary border border-border-secondary flex items-center justify-center mb-6 text-text-disabled shadow-inner group-hover:bg-bg-primary group-hover:border-danger/30 transition-all overflow-hidden">
              <MousePointer2 size={28} className="group-hover:text-danger transition-colors" />
            </motion.div>
            <div className="space-y-4">
              <p className="text-xs font-black text-text-tertiary uppercase tracking-[0.3em]">Collector_Node_Inactive</p>
              <p className="text-[10px] text-text-disabled max-w-[180px] leading-relaxed font-bold uppercase tracking-widest opacity-40">
                Install browser extension to map web-likes to the prism.
              </p>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
};
