'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, User, Building, Briefcase, Zap, AlertCircle } from 'lucide-react';

interface SemanticData {
  entities: Array<{
    name: string;
    type: string;
    confidence: number;
    entity_id: string;
  }>;
  intents: Array<{
    intent: string;
    confidence: number;
  }>;
  topics: Array<{
    topic: string;
    confidence: number;
  }>;
  verification_status: 'verified' | 'unverified';
  fallback: boolean;
  model: string;
}

interface SemanticPanelProps {
  data: SemanticData | null;
  loading?: boolean;
}

export function SemanticPanel({ data, loading }: SemanticPanelProps) {
  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800 animate-pulse">
        <CardContent className="h-48 flex items-center justify-center">
          <span className="text-slate-500">Extracting semantics...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-slate-900/50 border-slate-800 dashed">
        <CardContent className="h-32 flex flex-col items-center justify-center text-slate-500">
          <Zap className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">Semantic enrichment pending</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Network className="w-4 h-4 text-purple-400" />
          Semantic Intelligence
        </CardTitle>
        <div className="flex gap-2">
          {data.fallback && (
             <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
               <AlertCircle className="w-3 h-3" />
               Unverified (fallback)
             </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-400 uppercase tracking-tighter">
            {data.model}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Entities */}
        <div>
          <h4 className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Entities Detected</h4>
          <div className="flex flex-wrap gap-2">
            {data.entities.map((entity, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 bg-slate-800/40 rounded-md px-2 py-1 border border-slate-700/50 hover:border-purple-500/30 transition-colors group"
              >
                {entity.type === 'person' ? <User className="w-3 h-3 text-blue-400" /> : 
                 entity.type === 'company' ? <Building className="w-3 h-3 text-emerald-400" /> :
                 <Briefcase className="w-3 h-3 text-slate-400" />}
                <span className="text-xs text-slate-200 font-medium">{entity.name}</span>
                <span className="text-[10px] text-slate-500 group-hover:text-purple-400 transition-colors">
                  {Math.round(entity.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Topics & Intents */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Intents</h4>
            <div className="space-y-1">
              {data.intents.map((intent, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 italic">#{intent.intent}</span>
                  <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: `${intent.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Topics</h4>
            <div className="flex flex-wrap gap-1">
              {data.topics.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                  {topic.topic}
                </Badge>
              ))}
              {data.topics.length === 0 && <span className="text-xs text-slate-600">None detected</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
