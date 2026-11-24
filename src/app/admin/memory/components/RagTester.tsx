'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { readAiErrorBody } from '@/lib/ai/client-error';
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
  const [error, setError] = useState<{ message: string; limit: boolean } | null>(null);
  const [searched, setSearched] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3 || isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/memory/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, test_run_id: testRunId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        // Show the server's safe message as returned; it never carries provider text.
        const info = readAiErrorBody(data, response.status === 401 ? 'Your session has ended. Sign in again, then retry.' : 'The search could not be completed. Try again.');
        setError({ message: info.message, limit: info.limit });
        setResults([]);
        return;
      }
      setResults(data.results || []);
      setSearched(true);
    } catch {
      // The request never reached the server.
      setError({ message: 'The search did not reach the server. Try again when you are back online.', limit: false });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section aria-labelledby="rag-tester-title" className="bg-bg-elevated rounded-xl border border-border-secondary p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 id="rag-tester-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Zap aria-hidden="true" className="w-5 h-5 text-warning" />
            Retrieval tester
          </h2>
          <p className="text-sm text-text-tertiary mt-1">
            Test semantic retrieval and score re-ranking against stored memory. Enter at least 3 characters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-10" role="search">
        <label htmlFor="rag-query" className="sr-only">Retrieval query</label>
        <input
          id="rag-query"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask your memory anything"
          className="w-full bg-bg-secondary border border-border-secondary rounded-lg py-4 pl-12 pr-28 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
        />
        <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <button
          type="submit"
          disabled={isSearching || query.trim().length < 3}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-bg-elevated font-bold px-4 py-2 rounded-md transition-opacity text-sm"
        >
          {isSearching ? 'Searching…' : 'Run query'}
        </button>
      </form>

      <div className="space-y-6" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              role={error.limit ? 'status' : 'alert'}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 bg-bg-secondary border border-border-primary rounded-lg flex items-center gap-3 ${error.limit ? 'text-text-secondary' : 'text-danger'}`}
            >
              <AlertCircle aria-hidden="true" className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error.message}</span>
            </motion.div>
          )}

          {results.length === 0 && !isSearching && !error && searched && (
            <div className="text-center py-12 border-2 border-dashed border-border-secondary rounded-xl">
              <Database aria-hidden="true" className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-tertiary text-sm">No semantic matches for this query. Try different wording.</p>
            </div>
          )}

          {results.map((result, idx) => (
            <motion.div
              key={`${result.packet_id}-${idx}`}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : idx * 0.05 }}
              className="bg-bg-secondary border border-border-secondary rounded-lg p-4 sm:p-5 hover:border-border-primary transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-secondary rounded-lg">
                    <FileText aria-hidden="true" className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-text-tertiary">Packet: {result.packet_id.slice(-8)}</div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-text-tertiary flex items-center gap-1">
                        <Database aria-hidden="true" className="w-3 h-3" /> {result.source}
                      </span>
                      <span className="text-xs text-text-tertiary flex items-center gap-1">
                        <Clock aria-hidden="true" className="w-3 h-3" /> {Number.isNaN(new Date(result.timestamp).getTime()) ? 'Unknown date' : new Date(result.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary leading-none">
                    {Math.round(result.score * 100)}%
                  </div>
                  <div className="text-xs text-text-secondary mt-1 font-semibold">
                    Weighted score
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Vector score: {Number(result.raw_score ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="text-sm text-text-secondary leading-relaxed bg-bg-primary p-4 rounded border border-border-secondary break-words">
                {result.chunk}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
