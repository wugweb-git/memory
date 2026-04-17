'use client';

import React, { useEffect, useState } from 'react';
import { SignalTimeline } from './SignalTimeline';
import { SemanticPanel } from './SemanticPanel';
import { IntelPanel } from './IntelPanel';
import { X, FileText, Database, Code, Activity, Layers, Zap } from 'lucide-react';

interface PacketInspectorProps {
  packetId: string;
  onClose: () => void;
}

export default function PacketInspector({ packetId, onClose }: PacketInspectorProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'trace'>('content');

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        const [packetRes, signalsRes, semanticRes] = await Promise.all([
          fetch(`/api/memory/get?id=${packetId}`),
          fetch(`/api/processing/signals?packetId=${packetId}`),
          fetch(`/api/processing/semantic?packetId=${packetId}`)
        ]);

        const packetData = await packetRes.json();
        const signalsData = await signalsRes.json();
        const semanticData = await semanticRes.json();

        setData({
          packet: packetData.packet,
          signals: signalsData.signals,
          semantic: semanticData.semantic
        });
      } catch (err) {
        console.error('Failed to fetch packet details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [packetId]);

  if (!packetId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl h-full bg-[#0d0d0d] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Activity className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Packet Diagnostic</h2>
              <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] mt-1 uppercase">ID: {packetId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white group"
          >
            <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-transparent to-black/40">
          <div className="grid grid-cols-12 gap-10">
            
            {/* Left: Raw Data & Ingestion Trace */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-1 bg-black rounded-lg border border-white/5">
                  {(['content', 'metadata', 'trace'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        activeTab === tab 
                          ? 'bg-white/10 text-white shadow-inner' 
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab === 'content' && <FileText className="w-3 h-3" />}
                      {tab === 'metadata' && <Database className="w-3 h-3" />}
                      {tab === 'trace' && <Code className="w-3 h-3" />}
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="bg-[#050505] rounded-2xl border border-white/5 p-6 font-mono text-[11px] overflow-x-auto min-h-[500px] shadow-inner relative group">
                  <div className="absolute top-4 right-4 text-[9px] text-gray-700 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    ReadOnly.raw
                  </div>
                  {activeTab === 'content' && (
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(data?.packet?.content, null, 2)}
                    </pre>
                  )}
                  {activeTab === 'metadata' && (
                    <pre className="text-gray-400 leading-relaxed">
                      {JSON.stringify(data?.packet?.metadata, null, 2)}
                    </pre>
                  )}
                  {activeTab === 'trace' && (
                    <pre className="text-gray-500 italic leading-relaxed">
                      {JSON.stringify(data?.packet?.trace, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Multi-Layer Intelligence (L2 + L2.5) */}
            <div className="col-span-12 lg:col-span-7 space-y-12">
              
              {/* L2 Pulse */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    Interpretation Pulse (2.0)
                  </h3>
                  <div className="h-px flex-1 mx-6 bg-gradient-to-r from-blue-500/20 to-transparent" />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <SignalTimeline signals={data?.signals} loading={loading} />
                  <IntelPanel 
                    loading={loading}
                    metrics={data?.signals?.length > 0 ? {
                      total_signals: data.signals.length,
                      avg_intensity: data.signals.reduce((acc: number, s: any) => acc + s.intensity_absolute, 0) / data.signals.length,
                      work_load: Math.random(), // Needs actual scoring implementation
                      health_impact: Math.random()
                    } : null} 
                  />
                </div>
              </div>

              {/* L2.5 Enrichment */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    Deep Semantic Layer (2.5)
                  </h3>
                  <div className="h-px flex-1 mx-6 bg-gradient-to-r from-purple-500/20 to-transparent" />
                </div>
                <SemanticPanel data={data?.semantic} loading={loading} />
              </div>

            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="p-4 border-t border-white/5 bg-black flex items-center justify-between text-[9px] text-gray-600 font-bold uppercase tracking-widest px-8">
           <div className="flex items-center gap-6">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Vault Integrity Verified</span>
             <span className="flex items-center gap-2 text-blue-500/80 underline decoration-blue-500/20 cursor-pointer hover:text-blue-400">View Raw Trace Logs</span>
           </div>
           <span>Identity Prism Diagnostic Tool v1.2</span>
        </div>
      </div>
    </div>
  );
}
