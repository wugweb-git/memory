'use client';

import React from 'react';
import { Layers, Fingerprint, Share2, Zap, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Entity {
  name: string;
  type: string;
  confidence: number;
  entity_id: string;
}

interface Relationship {
  from: string;
  to: string;
  type: string;
  weight: number;
}

interface SemanticData {
  entities: Entity[];
  intents: Array<{ intent: string; confidence: number }>;
  topics: Array<{ topic: string; confidence: number }>;
  relationships?: Relationship[];
  verification_status: string;
  fallback: boolean;
  confidence: number;
}

interface SemanticPanelProps {
  data: SemanticData | null;
  loading?: boolean;
}

export function SemanticPanel({ data, loading }: SemanticPanelProps) {
  if (loading) {
    return <div className="h-64 bg-slate-900/50 animate-pulse rounded-lg border border-slate-800" />;
  }

  if (!data) {
    return (
      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 bg-black/40">
        <Layers className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-[10px] uppercase font-bold tracking-widest">Enrichment pending sweep</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & STATUS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.fallback ? (
            <div className="px-2 py-0.5 rounded border border-amber-500/30 text-[9px] font-bold text-amber-500 bg-amber-500/5 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-2.5 h-2.5" />
              Fallback Mode
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] font-bold text-emerald-500 bg-emerald-500/5 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              AI Verified
            </div>
          )}
          {data.verification_status === 'unverified' && (
            <div className="px-2 py-0.5 rounded bg-orange-600 text-[8px] font-bold text-white uppercase tracking-[0.2em]">
              UNVERIFIED
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-600 font-mono font-bold">CONF: {(data.confidence * 100).toFixed(0)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ENTITIES */}
        <div className="space-y-3">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest">
            <Fingerprint className="w-3 h-3 text-purple-400" />
            Extracted Entities
          </h4>
          <div className="space-y-2">
            {data.entities.map((ent, i) => (
              <div key={i} className="px-3 py-2 bg-slate-800/20 rounded border border-slate-700/30 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2">
                  <span className={`w-1 h-1 rounded-full ${
                    ent.type === 'person' ? 'bg-blue-400' :
                    ent.type === 'company' ? 'bg-orange-400' :
                    ent.type === 'project' ? 'bg-emerald-400' : 'bg-slate-400'
                  }`} />
                  <span className="text-xs text-slate-200 group-hover:text-white transition-colors capitalize font-medium">{ent.name}</span>
                </div>
                <span className="text-[8px] text-slate-500 uppercase tracking-tighter font-mono">{ent.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOPICS & INTENTS */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest">
              <Zap className="w-3 h-3 text-amber-400" />
              Intents & Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.intents.map((intent, i) => (
                <div key={i} className="px-2 py-0.5 rounded border border-blue-500/20 text-blue-400 bg-blue-500/5 text-[9px] font-bold tracking-tight uppercase">
                  @{intent.intent}
                </div>
              ))}
              {data.topics.map((topic, i) => (
                <div key={i} className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 bg-white/5 text-[9px] font-bold tracking-tight uppercase">
                  # {topic.topic}
                </div>
              ))}
            </div>
          </div>

          {/* RELATIONSHIP GRAPH (LITE) */}
          <div className="space-y-3">
            <h4 className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2 tracking-widest">
              <Share2 className="w-3 h-3 text-blue-400" />
              Relationship Map
            </h4>
            <div className="p-3 bg-black/40 border border-slate-800/50 rounded-xl min-h-[120px] shadow-inner">
              {data.relationships && data.relationships.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {data.relationships.map((rel, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="text-slate-200 font-bold">{rel.from}</span>
                      <div className="flex-1 border-t border-dashed border-slate-800 relative h-0">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-[#121212] text-[8px] uppercase tracking-tighter text-blue-500 font-black whitespace-nowrap">
                          {rel.type}
                        </span>
                      </div>
                      <span className="text-slate-200 font-bold">{rel.to}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[100px] flex flex-col items-center justify-center opacity-30 italic py-4">
                   <p className="text-[8px] uppercase tracking-[0.2em] font-bold">Graph Isolation Active</p>
                   <p className="text-[7px] mt-1">Verified Nodes Required for Mapping</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
