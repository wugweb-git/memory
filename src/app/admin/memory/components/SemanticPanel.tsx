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
    return (
      <div role="status" aria-label="Loading semantic enrichment" className="h-64 bg-bg-secondary animate-pulse motion-reduce:animate-none rounded-lg border border-border-secondary" />
    );
  }

  if (!data) {
    return (
      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border-secondary rounded-lg text-text-tertiary bg-bg-primary px-4 text-center">
        <Layers aria-hidden="true" className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No semantic enrichment yet. It appears after the next processing sweep.</p>
      </div>
    );
  }

  const entities = data.entities ?? [];
  const intents = data.intents ?? [];
  const topics = data.topics ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {data.fallback ? (
            <span className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-warning bg-bg-secondary flex items-center gap-1.5">
              <ShieldAlert aria-hidden="true" className="w-3 h-3" />
              Fallback mode
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded border border-border-primary text-2xs font-bold text-success bg-bg-secondary flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="w-3 h-3" />
              Model extracted
            </span>
          )}
          {data.verification_status === 'unverified' && (
            <span className="px-2 py-0.5 rounded border border-warning text-2xs font-bold text-warning bg-bg-secondary">
              Unverified
            </span>
          )}
        </div>
        <span className="text-2xs text-text-tertiary font-mono font-bold">Confidence {(data.confidence * 100).toFixed(0)}%</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-2">
            <Fingerprint aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
            Extracted entities
          </h4>
          {entities.length === 0 ? (
            <p className="text-sm text-text-tertiary">No entities found in this packet.</p>
          ) : (
            <ul className="space-y-2">
              {entities.map((ent, i) => (
                <li key={`${ent.entity_id}-${i}`} className="px-3 py-2 bg-bg-secondary rounded border border-border-secondary flex items-center justify-between gap-2">
                  <span className="text-xs text-text-primary capitalize font-medium break-words min-w-0">{ent.name}</span>
                  <span className="text-2xs text-text-tertiary font-mono shrink-0">{ent.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-2">
              <Zap aria-hidden="true" className="w-3.5 h-3.5 text-warning" />
              Intents and topics
            </h4>
            {intents.length === 0 && topics.length === 0 ? (
              <p className="text-sm text-text-tertiary">No intents or topics found.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {intents.map((intent, i) => (
                  <li key={`intent-${i}`} className="px-2 py-0.5 rounded border border-border-primary text-accent bg-bg-secondary text-2xs font-bold">
                    <span className="sr-only">Intent: </span>@{intent.intent}
                  </li>
                ))}
                {topics.map((topic, i) => (
                  <li key={`topic-${i}`} className="px-2 py-0.5 rounded border border-border-secondary text-text-secondary bg-bg-secondary text-2xs font-bold">
                    <span className="sr-only">Topic: </span># {topic.topic}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-2">
              <Share2 aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
              Relationships
            </h4>
            <div className="p-3 bg-bg-primary border border-border-secondary rounded-xl min-h-[120px]">
              {data.relationships && data.relationships.length > 0 ? (
                <ul className="space-y-3 pt-1">
                  {data.relationships.map((rel, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                      <span className="text-text-primary font-bold break-words">{rel.from}</span>
                      <span aria-hidden="true">→</span>
                      <span className="text-accent font-semibold">{rel.type}</span>
                      <span aria-hidden="true">→</span>
                      <span className="text-text-primary font-bold break-words">{rel.to}</span>
                      <span className="sr-only">({rel.from} {rel.type} {rel.to})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-[100px] flex flex-col items-center justify-center text-center text-text-tertiary">
                  <p className="text-sm">No relationships mapped.</p>
                  <p className="text-xs mt-1">Relationships need at least two verified entities.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
