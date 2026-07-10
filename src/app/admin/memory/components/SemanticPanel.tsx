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
    return <div className="h-64 bg-bg-secondary animate-pulse rounded-lg border border-border-secondary" />;
  }

  if (!data) {
    return (
      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border-secondary rounded-lg text-text-tertiary bg-bg-primary/40">
        <Layers className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-2xs uppercase font-bold tracking-widest">Enrichment pending sweep</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & STATUS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.fallback ? (
            <div className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-warning bg-bg-secondary uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-2.5 h-2.5" />
              Fallback Mode
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-success bg-bg-secondary uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              AI Verified
            </div>
          )}
          {data.verification_status === 'unverified' && (
            <div className="px-2 py-0.5 rounded bg-orange-600 text-2xs font-bold text-text-primary uppercase tracking-[0.2em]">
              UNVERIFIED
            </div>
          )}
        </div>
        <span className="text-2xs text-text-tertiary font-mono font-bold">CONF: {(data.confidence * 100).toFixed(0)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ENTITIES */}
        <div className="space-y-3">
          <h4 className="text-2xs uppercase font-bold text-text-tertiary flex items-center gap-2 tracking-widest">
            <Fingerprint className="w-3 h-3 text-accent" />
            Extracted Entities
          </h4>
          <div className="space-y-2">
            {data.entities.map((ent, i) => (
              <div key={i} className="px-3 py-2 bg-bg-secondary rounded border border-border-secondary flex items-center justify-between group hover:border-border-primary transition-all">
                <div className="flex items-center gap-2">
                  <span className={`w-1 h-1 rounded-full ${
                    ent.type === 'person' ? 'bg-accent' :
                    ent.type === 'company' ? 'bg-orange-400' :
                    ent.type === 'project' ? 'bg-success' : 'bg-text-disabled'
                  }`} />
                  <span className="text-xs text-text-primary group-hover:text-text-primary transition-colors capitalize font-medium">{ent.name}</span>
                </div>
                <span className="text-2xs text-text-tertiary uppercase tracking-tighter font-mono">{ent.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOPICS & INTENTS */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-2xs uppercase font-bold text-text-tertiary flex items-center gap-2 tracking-widest">
              <Zap className="w-3 h-3 text-warning" />
              Intents & Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.intents.map((intent, i) => (
                <div key={i} className="px-2 py-0.5 rounded border border-border-primary text-accent bg-bg-secondary text-2xs font-bold tracking-tight uppercase">
                  @{intent.intent}
                </div>
              ))}
              {data.topics.map((topic, i) => (
                <div key={i} className="px-2 py-0.5 rounded border border-border-secondary text-text-tertiary bg-secondary text-2xs font-bold tracking-tight uppercase">
                  # {topic.topic}
                </div>
              ))}
            </div>
          </div>

          {/* RELATIONSHIP GRAPH (LITE) */}
          <div className="space-y-3">
            <h4 className="text-2xs uppercase font-bold text-text-tertiary flex items-center gap-2 tracking-widest">
              <Share2 className="w-3 h-3 text-accent" />
              Relationship Map
            </h4>
            <div className="p-3 bg-bg-primary/40 border border-border-secondary rounded-xl min-h-[120px] shadow-inner">
              {data.relationships && data.relationships.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {data.relationships.map((rel, i) => (
                    <div key={i} className="flex items-center gap-2 text-2xs text-text-tertiary">
                      <span className="text-text-primary font-bold">{rel.from}</span>
                      <div className="flex-1 border-t border-dashed border-border-secondary relative h-0">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-[#121212] text-2xs uppercase tracking-tighter text-accent font-black whitespace-nowrap">
                          {rel.type}
                        </span>
                      </div>
                      <span className="text-text-primary font-bold">{rel.to}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[100px] flex flex-col items-center justify-center opacity-30  py-4">
                   <p className="text-2xs uppercase tracking-[0.2em] font-bold">Graph Isolation Active</p>
                   <p className="text-2xs mt-1">Verified Nodes Required for Mapping</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
