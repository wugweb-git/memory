'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Database, Clock, Zap, AlertCircle, FileText } from 'lucide-react';

interface RetrievalResult {
  packet_id: string;
  chunk: string;
  score: number;
  raw_score: number;
  source: string;
  timestamp: string;
}

interface RagTesterProps {
  testRunId?: string;
}

export default function RagTester({ testRunId = 'PROD' }: RagTesterProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/memory/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, test_run_id: testRunId }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Retrieval failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-border-secondary p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            Retrieval Engine Tester
          </h2>
          <p className="text-sm text-text-tertiary mt-1">
            Debug semantic retrieval and score re-ranking in real-time.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-3 py-1 rounded-full bg-bg-secondary border border-border-primary text-2xs text-accent uppercase tracking-wider font-bold">
            text-embedding-3-small
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-10">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask your memory anything..."
          className="w-full bg-secondary border border-border-secondary rounded-lg py-4 pl-12 pr-24 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-active transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <button
          type="submit"
          disabled={isSearching || query.length < 3}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-md transition-opacity text-sm"
        >
          {isSearching ? 'Searching…' : 'Run query'}
        </button>
      </form>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-bg-secondary border border-border-primary rounded-lg flex items-center gap-3 text-danger"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {results.length === 0 && !isSearching && !error && query.length >= 3 && (
            <div className="text-center py-12 border-2 border-dashed border-border-secondary rounded-xl">
              <Database className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-tertiary text-sm">No semantic matches found for this query.</p>
            </div>
          )}

          {results.map((result, idx) => (
            <motion.div
              key={`${result.packet_id}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-secondary border border-border-secondary rounded-lg p-5 group hover:border-border-primary transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <FileText className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-text-tertiary">Packet: {result.packet_id.slice(-8)}</div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-2xs text-text-tertiary flex items-center gap-1">
                        <Database className="w-3 h-3" /> {result.source}
                      </span>
                      <span className="text-2xs text-text-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(result.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary leading-none">
                    {Math.round(result.score * 100)}%
                  </div>
                  <div className="text-2xs text-warning/80 uppercase tracking-tighter mt-1 font-bold">
                    Weighted Score
                  </div>
                  <div className="text-2xs text-text-tertiary mt-1">
                    vScore: {result.raw_score.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="text-sm text-text-secondary leading-relaxed font-serif bg-bg-primary/30 p-4 rounded border border-border-secondary">
                &quot;{result.chunk}&quot;
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
