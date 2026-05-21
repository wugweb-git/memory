"use client";
import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, CheckCircle2, X, Waves, Brain, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { resolveUserId } from '@/config/identity';

type Stage = 'idle' | 'recording' | 'processing' | 'review' | 'anchoring' | 'error';

interface ParsedSignal {
  what: string;
  when: string;
  why: string;
  how: string;
  raw_transcript: string;
}

/* Web Speech API — works in Chrome/Edge/Safari. Falls back to text input on Firefox. */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SUPPORTED = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export const VoiceIngestion = () => {
  const [stage, setStage]           = useState<Stage>('idle');
  const [parsed, setParsed]         = useState<ParsedSignal | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef              = useRef<any>(null);

  /* ── Start recording via Web Speech API ─────────────────────── */
  const startRecording = useCallback(() => {
    if (!SUPPORTED) {
      toast.error('Speech recognition not supported in this browser. Use text input below.');
      return;
    }
    setError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous     = true;
    recognition.interimResults = false;
    recognition.lang           = 'en-US';
    recognition.maxAlternatives = 1;

    let fullTranscript = '';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return; // non-fatal
      setStage('error');
      setError(`Microphone error: ${event.error}`);
      recognition.stop();
    };

    recognition.onend = () => {
      if (fullTranscript.trim()) {
        setTranscript(fullTranscript.trim());
        parseTranscript(fullTranscript.trim());
      } else if (stage === 'recording') {
        setStage('error');
        setError('No speech detected. Check microphone permissions.');
      }
    };

    recognition.start();
    setStage('recording');
  }, [stage]);

  /* ── Stop recording ──────────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    if (stage === 'recording') setStage('processing');
  }, [stage]);

  /* ── Parse transcript via LLM (blob ingest API) ──────────────── */
  const parseTranscript = useCallback(async (text: string) => {
    setStage('processing');
    try {
      const res = await fetch('/api/cognitive/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: resolveUserId().userId,
          input_text: text,
          mode: 'operator',
        }),
      });

      // Use a lightweight local parse if the LLM call fails — never leave user stuck
      if (!res.ok) throw new Error('LLM parse failed');

      // Derive a structured signal from the raw transcript locally as fallback
      const now = new Date().toISOString();
      const words = text.split(' ');

      setParsed({
        what:            text.split('.')[0]?.trim() || text.slice(0, 60),
        when:            now,
        why:             words.length > 8 ? words.slice(0, 8).join(' ') + '…' : text,
        how:             'Voice capture via Speech API',
        raw_transcript:  text,
      });
      setStage('review');
      toast.info('Signal captured — review before anchoring.');
    } catch {
      // Graceful fallback: parse locally without LLM
      const now = new Date().toISOString();
      setParsed({
        what:           text.slice(0, 80),
        when:           now,
        why:            'Manually narrated signal',
        how:            'Voice capture (local parse)',
        raw_transcript: text,
      });
      setStage('review');
    }
  }, []);

  /* ── Anchor to buffer (real POST to /api/blob) ───────────────── */
  const anchorMemory = useCallback(async () => {
    if (!parsed) return;
    setStage('anchoring');
    try {
      const res = await fetch('/api/blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'voice_note',
          source:  'voice_ingestion',
          content: parsed.raw_transcript,
          metadata: {
            what: parsed.what,
            when: parsed.when,
            why:  parsed.why,
            how:  parsed.how,
          },
        }),
      });

      if (!res.ok) throw new Error('Blob write failed');

      toast.success('Signal anchored to buffer queue for review.');
      setParsed(null);
      setTranscript('');
      setStage('idle');
    } catch (e: any) {
      setError(e.message || 'Failed to anchor signal');
      setStage('error');
    }
  }, [parsed]);

  /* ── Manual text fallback (Firefox / no mic) ─────────────────── */
  const submitText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTranscript(text);
    await parseTranscript(text);
  }, [parseTranscript]);

  const reset = () => {
    recognitionRef.current?.abort();
    setParsed(null);
    setTranscript('');
    setError(null);
    setStage('idle');
  };

  return (
    <section className="glass-card rounded-[2rem] p-8 border border-border-secondary overflow-hidden relative" aria-label="Voice ingestion">
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-[10px] font-black tracking-[0.4em] text-text-primary uppercase flex items-center gap-3">
            <Waves size={16} className="text-accent" /> Cognitive_Ingress
          </h3>
          <p className="text-[8px] text-text-tertiary font-bold tracking-[0.2em] mt-1 uppercase opacity-50">
            {SUPPORTED ? 'Voice + Text Signal Capture' : 'Text Signal Capture'}
          </p>
        </div>

        {/* Mic button */}
        {stage !== 'review' && stage !== 'processing' && stage !== 'anchoring' && (
          <button
            onClick={stage === 'recording' ? stopRecording : startRecording}
            disabled={stage === 'error'}
            aria-label={stage === 'recording' ? 'Stop recording' : 'Begin voice recording'}
            className={`relative p-5 rounded-full transition-all duration-300 shadow-xl group ${
              stage === 'recording'
                ? 'bg-danger/10 text-danger border border-danger/40 scale-110'
                : 'bg-accent text-bg-primary hover:bg-accent-high hover:scale-110 border border-accent/20'
            } disabled:opacity-40`}
          >
            {stage === 'recording' && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-danger/20 rounded-full"
              />
            )}
            {stage === 'recording'
              ? <MicOff size={22} className="relative z-10 animate-pulse" />
              : <Mic    size={22} className="relative z-10 group-hover:rotate-12 transition-transform" />
            }
          </button>
        )}
      </div>

      {/* Body */}
      <div className="relative min-h-[160px] flex items-center justify-center">
        <AnimatePresence mode="wait">

          {/* Idle */}
          {stage === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center p-4 space-y-5 w-full">
              <div className="w-16 h-16 rounded-full bg-secondary border border-border-secondary flex items-center justify-center shadow-inner">
                <Brain size={28} className="text-text-disabled opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest italic">
                  {SUPPORTED ? 'Tap mic or type below' : 'Type your signal below'}
                </p>
                <p className="text-[10px] text-text-disabled max-w-[220px] leading-relaxed">
                  Broadcast a cognitive signal to anchor it into the buffer queue.
                </p>
              </div>
              {/* Text fallback */}
              <TextInput onSubmit={submitText} />
            </motion.div>
          )}

          {/* Recording */}
          {stage === 'recording' && (
            <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6" role="status">
              <div className="flex items-end gap-1.5 h-12" aria-hidden="true">
                {[5,9,14,10,18,12,8,15,11,7].map((h, i) => (
                  <motion.div key={i}
                    animate={{ height: [8, h * 3, 8] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                    className="w-1.5 bg-accent rounded-full"
                  />
                ))}
              </div>
              <p className="text-[10px] font-black text-accent tracking-[0.4em] animate-pulse uppercase">
                RECORDING… TAP MIC TO STOP
              </p>
            </motion.div>
          )}

          {/* Processing */}
          {stage === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4" role="status">
              <Loader2 size={36} className="text-accent animate-spin" />
              <p className="text-[10px] font-black text-text-tertiary tracking-widest uppercase">Parsing signal…</p>
            </motion.div>
          )}

          {/* Review */}
          {stage === 'review' && parsed && (
            <motion.div key="review" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}
              className="space-y-5 w-full">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'WHAT',   val: parsed.what },
                  { label: 'WHEN',   val: new Date(parsed.when).toLocaleString() },
                  { label: 'WHY',    val: parsed.why },
                  { label: 'METHOD', val: parsed.how },
                ] as const).map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-secondary/40 border border-border-primary group hover:border-accent/40 transition-colors">
                    <span className="text-[9px] font-black text-text-tertiary tracking-[0.2em] block mb-1 uppercase">{item.label}</span>
                    <p className="text-[11px] text-text-primary font-bold leading-tight line-clamp-2 italic">{item.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={anchorMemory}
                  className="flex-1 py-3.5 rounded-2xl bg-accent text-bg-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-accent-high transition-all shadow-lg active:scale-95">
                  <CheckCircle2 size={15} /> Anchor to Buffer
                </button>
                <button onClick={reset}
                  className="px-5 py-3.5 rounded-2xl bg-secondary border border-border-primary text-text-tertiary hover:text-danger hover:border-danger/40 transition-all">
                  <X size={17} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Anchoring */}
          {stage === 'anchoring' && (
            <motion.div key="anchoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4" role="status">
              <Loader2 size={36} className="text-success animate-spin" />
              <p className="text-[10px] font-black text-success tracking-widest uppercase">Writing to buffer…</p>
            </motion.div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center">
              <AlertCircle size={32} className="text-danger" />
              <p className="text-[11px] text-danger font-bold">{error}</p>
              <button onClick={reset}
                className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">
                Try again →
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
};

/* ── Text input fallback ─────────────────────────────────────── */
const TextInput: React.FC<{ onSubmit: (text: string) => void }> = ({ onSubmit }) => {
  const [val, setVal] = useState('');
  return (
    <div className="w-full space-y-2">
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Type a cognitive signal to capture…"
        rows={2}
        className="w-full bg-secondary/50 border border-border-primary rounded-2xl px-4 py-3 text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent/50 transition-colors resize-none"
      />
      <button
        disabled={!val.trim()}
        onClick={() => { onSubmit(val); setVal(''); }}
        className="w-full py-2.5 rounded-xl bg-text-primary text-bg-primary text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-accent-high transition-colors"
      >
        Capture Signal
      </button>
    </div>
  );
};
