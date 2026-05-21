"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as LinkIcon, Globe, Linkedin, Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { IDENTITY_CONFIG } from '@/config/identity';
import { parseBlobItems } from '@/lib/ui/blob';

function siteHost(): string {
  try {
    return new URL(IDENTITY_CONFIG.SITE_URL).host;
  } catch {
    return IDENTITY_CONFIG.SITE_URL.replace(/^https?:\/\//, '').split('/')[0];
  }
}

function parseBridgeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol);
}

function formatRelative(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type BridgeItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  lastSync: string;
};

const DEFAULT_BRIDGES: BridgeItem[] = [
  { id: 'default-li', type: 'LinkedIn', title: `${IDENTITY_CONFIG.DISPLAY_NAME} // ${IDENTITY_CONFIG.ROLE}`, status: 'Bridged', lastSync: '—' },
  { id: 'default-site', type: 'External', title: `${siteHost()}/neural-papers`, status: 'Bridged', lastSync: '—' },
];

export const UniversalSync = () => {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedItems, setSyncedItems] = useState<BridgeItem[]>(DEFAULT_BRIDGES);

  const loadBridges = useCallback(async () => {
    try {
      const res = await fetch('/api/blob?type=external_link&limit=20', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const items = parseBlobItems<{ id: string; raw_payload?: string; created_at?: string; metadata?: { url?: string; title?: string } }>(data);
      if (items.length === 0) return;
      setSyncedItems(
        items.map((b) => {
          const bridgeUrl = b.metadata?.url || b.raw_payload || '';
          let host = bridgeUrl;
          try {
            host = new URL(bridgeUrl.startsWith('http') ? bridgeUrl : `https://${bridgeUrl}`).hostname;
          } catch { /* keep raw */ }
          return {
            id: b.id,
            type: host.includes('linkedin') ? 'LinkedIn' : 'External',
            title: b.metadata?.title || `${host} // Core Fragment`,
            status: 'Bridged',
            lastSync: b.created_at ? formatRelative(new Date(b.created_at)) : '—',
          };
        }),
      );
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    loadBridges();
  }, [loadBridges]);

  const handleSync = async () => {
    if (!url.trim() || isSyncing) return;
    setIsSyncing(true);
    try {
      const parsed = parseBridgeUrl(url);
      const host = parsed.hostname;
      const type = host.includes('linkedin') ? 'LinkedIn' : 'External';
      const pathLabel = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
      const title = `${host}${pathLabel} // Core Fragment`;

      const res = await fetch('/api/blob', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'external_link',
          source: 'universal_sync',
          source_id: parsed.href,
          raw_payload: parsed.href,
          trace_json: { bridge: true, host },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Bridge rejected');
      }

      setSyncedItems((prev) => [
        {
          id: crypto.randomUUID(),
          type,
          title,
          status: 'Bridged',
          lastSync: 'Just now',
        },
        ...prev.filter((p) => !p.id.startsWith('default-')),
      ]);
      toast.success('Fragment bridged to Genesis stream.');
      setUrl('');
      await loadBridges();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bridge failure';
      if (msg.includes('URL') || msg.includes('Invalid')) {
        toast.error('Bridge failure: URL syntax error.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="glass-panel p-10 rounded-[2.5rem] border border-border-secondary relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] pointer-events-none transition-all group-hover:bg-accent/10" />

      <div className="space-y-8 relative z-10">
        <div className="flex items-start justify-between">
          <div className="kinetic-text">
            <h3 className="text-[11px] font-black tracking-[0.5em] text-text-primary uppercase flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <LinkIcon size={16} className="text-accent" />
              </div>
              Neural_Uplink_Bridge
            </h3>
            <p className="text-[9px] text-text-tertiary font-black tracking-[0.3em] mt-3 uppercase opacity-40 italic">
              Syncing LinkedIn, Blogs, and External Intelligence
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSync()}
              placeholder="Paste resource URL (LinkedIn / Web)..."
              className="w-full bg-bg-secondary/30 border-2 border-border-primary/50 rounded-2xl px-6 py-5 text-sm font-black text-text-primary focus:border-accent/40 outline-none transition-all italic shadow-inner pr-14 tracking-tight"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 transition-all">
              {url.includes('linkedin') ? (
                <Linkedin size={18} className="text-accent animate-pulse" />
              ) : (
                <Globe size={18} className="text-text-disabled group-focus-within:text-accent" />
              )}
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing || !url.trim()}
            className="px-8 rounded-2xl bg-text-primary text-bg-primary hover:bg-accent transition-all disabled:opacity-20 flex items-center justify-center shadow-2xl relative overflow-hidden group/btn"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
            {isSyncing ? <RefreshCw size={20} className="animate-spin relative z-10" /> : <Send size={20} className="relative z-10" />}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-text-tertiary tracking-[0.3em] uppercase">Active_Bridges</span>
            <span className="text-[10px] font-black text-accent uppercase tracking-widest">{syncedItems.length} Nodes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[180px] overflow-y-auto custom-scrollbar pr-3">
            <AnimatePresence initial={false}>
              {syncedItems.map((item) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-bg-secondary/40 border border-border-secondary group/node hover:border-accent/40 hover:bg-accent/[0.02] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-bg-primary border border-border-primary shadow-inner group-hover/node:scale-110 transition-transform">
                      {item.type === 'LinkedIn' ? (
                        <Linkedin size={16} className="text-accent" />
                      ) : (
                        <LinkIcon size={16} className="text-text-tertiary" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black text-text-primary truncate max-w-[140px] block tracking-tight">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-bold text-text-disabled uppercase tracking-widest block opacity-60">
                        {item.lastSync}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[8px] font-black text-success uppercase tracking-widest">Bridged</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
