"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  MoreVertical,
  PenLine,
  Rocket,
  SendHorizontal,
  Square,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UIMessage } from 'ai';
import { useAskChat } from '@/lib/chat/useAskChat';
import type { AskSource } from '@/lib/chat/sources';
import { UI_API } from '@/lib/api/endpoints';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { haptic, prefersReducedMotion } from '@/lib/pwa/browser';
import {
  clampTextareaHeight,
  createTimestampStore,
  enterKeyAction,
  formatMessageTime,
  isNearBottom,
} from '@/lib/chat/ask-helpers';

type Starter = { question: string; hint: string; Icon: LucideIcon };

/**
 * Starter questions shown on the empty state. Edit this list to change them.
 * Drafted from the public profile (ventures, experience, writing).
 */
const STARTERS: readonly Starter[] = [
  { question: 'What is Vedanshu working on?', hint: 'Current focus', Icon: Rocket },
  { question: 'What has he written about?', hint: 'Notes and writing', Icon: PenLine },
  { question: 'What kind of projects has he built?', hint: 'Shipped work', Icon: Wrench },
  { question: 'What are his main areas of expertise?', hint: 'Skills and depth', Icon: Layers },
];

const FIRST_NAME = IDENTITY_CONFIG.DISPLAY_NAME.split(' ')[0];
const LINE_HEIGHT_PX = 24; // matches leading-6 on the textarea
const TEXTAREA_PADDING_PX = 20; // py-2.5 top and bottom
const MAX_LINES = 5;
const FALLBACK_ERROR = 'The answer did not come through. Check your connection, then tap Retry.';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function isCoarsePointer(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function Avatar({ size = 40 }: { size?: 28 | 40 | 56 }) {
  const [failed, setFailed] = useState(false);
  const initials = IDENTITY_CONFIG.DISPLAY_NAME.split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  const box = size === 56 ? 'h-14 w-14 text-md' : size === 40 ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-2xs';
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`${box} shrink-0 rounded-full bg-bg-tertiary font-semibold text-text-primary flex items-center justify-center`}
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarFallbackUrl(size * 2)}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`${box} shrink-0 rounded-full bg-bg-tertiary`}
    />
  );
}

function SourceList({ sources }: { sources: AskSource[] }) {
  const headingId = useId();
  return (
    <div className="mt-1.5 max-w-prose">
      <p id={headingId} className="text-2xs font-medium text-text-secondary">
        Sources
      </p>
      <ul aria-labelledby={headingId} className="mt-1 flex flex-wrap gap-1.5">
        {sources.map((src) => (
          <li
            key={src.packet_id}
            className="max-w-full break-words rounded-lg border border-border-primary bg-bg-secondary px-2.5 py-0.5 text-2xs text-text-secondary"
          >
            {src.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingDots() {
  return (
    <div role="status" aria-label={`${FIRST_NAME} is replying`} className="flex items-start gap-2.5">
      <Avatar size={28} />
      <div className="flex h-7 items-center gap-1.5 px-1">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-text-tertiary motion-safe:animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      haptic('tap');
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy answer"
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary ${FOCUS_RING}`}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export default function AskPage() {
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const { messages, sendMessage, status, setMessages, stop, regenerate, clearError, sourcesById, clearSources } = useAskChat(UI_API.chat);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const stamps = useRef(createTimestampStore());

  const isLoading = status === 'submitted' || status === 'streaming';
  const hasError = status === 'error';
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    status === 'submitted' ||
    (status === 'streaming' && lastMessage?.role === 'assistant' && messageText(lastMessage as UIMessage) === '');

  const lastText = lastMessage ? messageText(lastMessage as UIMessage) : '';

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el || (!force && !nearBottomRef.current)) return;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() || force ? 'auto' : 'smooth' });
  }, []);

  // Follow new content only while the reader is already near the bottom.
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, lastText, showTyping, hasError, scrollToBottom]);

  // Keep the composer above the on-screen keyboard (installed PWAs do not resize dvh).
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      setViewportHeight(vv.height);
      window.scrollTo(0, 0);
      scrollToBottom();
    };
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, [scrollToBottom]);

  // Auto-grow the textarea up to five lines.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${clampTextareaHeight(ta.scrollHeight, LINE_HEIGHT_PX, MAX_LINES, TEXTAREA_PADDING_PX)}px`;
  }, [input]);

  // Close the overflow menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isLoading) return;
      haptic('tap');
      nearBottomRef.current = true;
      setShowJump(false);
      sendMessage({ text });
      setInput('');
      requestAnimationFrame(() => scrollToBottom(true));
    },
    [isLoading, sendMessage, scrollToBottom],
  );

  const retry = () => {
    haptic('tap');
    nearBottomRef.current = true;
    setShowJump(false);
    if (regenerate) {
      regenerate();
      return;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) sendMessage({ text: messageText(lastUser as UIMessage) });
  };

  const clearChat = () => {
    stop?.();
    clearError?.();
    setMessages([]);
    clearSources();
    stamps.current.clear();
    nearBottomRef.current = true;
    setShowJump(false);
    dialogRef.current?.close();
  };

  const openClearDialog = () => {
    setMenuOpen(false);
    dialogRef.current?.showModal();
  };

  const jumpToLatest = () => {
    nearBottomRef.current = true;
    setShowJump(false);
    scrollToBottom(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const action = enterKeyAction({
      key: e.key,
      shiftKey: e.shiftKey,
      isComposing: e.nativeEvent.isComposing,
      coarsePointer: isCoarsePointer(),
    });
    if (e.key === 'Enter' && action === 'send') {
      e.preventDefault();
      send(input);
    }
  };

  const rows = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: messageText(m as UIMessage),
        time: formatMessageTime(stamps.current.stamp(m.id)),
        sources: sourcesById[m.id] ?? [],
      })),
    [messages, sourcesById],
  );

  const profileHref = `/p/${IDENTITY_CONFIG.HANDLE}`;
  const canSend = input.trim() !== '' && !isLoading;
  const isEmpty = rows.length === 0 && !hasError;
  const streamingId = status === 'streaming' && lastMessage?.role === 'assistant' ? lastMessage.id : null;

  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col bg-bg-primary text-text-primary h-screen"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      <header className="shrink-0 flex items-center gap-1 border-b border-border-primary bg-bg-elevated px-2 pt-[env(safe-area-inset-top)]">
        <Link
          href={profileHref}
          aria-label={`Back to ${FIRST_NAME}'s profile`}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary hover:text-text-primary ${FOCUS_RING}`}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <Avatar size={40} />
        <div className="min-w-0 flex-1 px-2 py-2">
          <h1 className="truncate text-base font-semibold leading-tight">{IDENTITY_CONFIG.DISPLAY_NAME}</h1>
          <p className="text-xs leading-snug text-text-tertiary">Answers come from published notes</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary hover:text-text-primary ${FOCUS_RING}`}
          >
            <MoreVertical size={22} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-xl border border-border-primary bg-bg-elevated py-1 shadow-elev-2"
            >
              <button
                type="button"
                role="menuitem"
                disabled={messages.length === 0}
                onClick={openClearDialog}
                className="min-h-11 w-full px-4 text-left text-sm text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset disabled:text-text-tertiary disabled:hover:bg-transparent"
              >
                Clear chat
              </button>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col focus:outline-none">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const near = isNearBottom(e.currentTarget);
              nearBottomRef.current = near;
              setShowJump(!near);
            }}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversation"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {isEmpty ? (
              <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center gap-6 pb-6">
                <div className="space-y-3">
                  <Avatar size={56} />
                  <h2 className="max-w-sm text-xl font-semibold text-text-primary">
                    {`What would you like to know about ${FIRST_NAME}'s work?`}
                  </h2>
                  <p className="max-w-sm text-base leading-relaxed text-text-tertiary">
                    {`We answer from ${FIRST_NAME}'s published notes: his projects, writing and experience. Pick a place to start, or ask your own question below.`}
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {STARTERS.map(({ question, hint, Icon }) => (
                    <li key={question} className="flex">
                      <button
                        type="button"
                        onClick={() => send(question)}
                        className={`group flex min-h-28 w-full flex-col items-start gap-3 rounded-2xl border border-border-primary bg-bg-elevated p-3.5 text-left shadow-elev-1 transition-[transform,box-shadow,border-color,background-color] duration-150 hover:border-border-primary hover:shadow-elev-2 motion-safe:active:scale-[0.97] active:bg-bg-secondary ${FOCUS_RING}`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-secondary text-text-primary">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium leading-snug text-text-primary">{question}</span>
                          <span className="block text-xs text-text-tertiary">{hint}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                {rows.map((r) => {
                  const mine = r.role === 'user';
                  if (!mine && r.text === '') return null;
                  if (mine) {
                    return (
                      <li key={r.id} className="flex flex-col items-end">
                        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-bg-tertiary px-4 py-2.5 text-base leading-normal text-text-primary">
                          {r.text}
                        </div>
                        <span className="mt-1 px-1 text-2xs text-text-tertiary">
                          <span className="sr-only">You, </span>
                          {r.time}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={r.id} className="flex items-start gap-2.5">
                      <Avatar size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="max-w-prose whitespace-pre-wrap break-words pt-0.5 text-base leading-relaxed text-text-primary">
                          {r.text}
                        </div>
                        {r.id !== streamingId && r.sources.length > 0 && <SourceList sources={r.sources} />}
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-2xs text-text-tertiary">
                            <span className="sr-only">{`${FIRST_NAME}, `}</span>
                            {r.time}
                          </span>
                          {r.id !== streamingId && <CopyButton text={r.text} />}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {showTyping && (
                  <li>
                    <TypingDots />
                  </li>
                )}
                {hasError && (
                  <li role="alert" className="flex items-start gap-2.5">
                    <Avatar size={28} />
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                      <div className="max-w-prose rounded-2xl rounded-bl-md border border-danger bg-bg-elevated px-4 py-2.5 text-base leading-normal text-text-primary">
                        {FALLBACK_ERROR}
                      </div>
                      <button
                        type="button"
                        onClick={retry}
                        className={`min-h-11 rounded-full border border-border-primary bg-bg-elevated px-5 text-sm font-medium text-text-primary hover:bg-bg-secondary motion-safe:active:scale-[0.97] ${FOCUS_RING}`}
                      >
                        Retry
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>

          {showJump && !isEmpty && (
            <button
              type="button"
              onClick={jumpToLatest}
              className={`absolute bottom-3 left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-primary bg-bg-elevated px-4 text-sm font-medium text-text-primary shadow-elev-2 hover:bg-bg-secondary ${FOCUS_RING}`}
            >
              <ArrowDown size={16} aria-hidden="true" />
              Jump to latest
            </button>
          )}
        </div>

        <div className="shrink-0 border-t border-border-primary bg-bg-elevated px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <form
            aria-label={`Ask ${FIRST_NAME}`}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-border-primary bg-bg-primary p-1.5 focus-within:ring-2 focus-within:ring-accent"
          >
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <textarea
              ref={textareaRef}
              id="ask-input"
              rows={1}
              enterKeyHint="send"
              autoComplete="off"
              autoCapitalize="sentences"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask ${FIRST_NAME} a question`}
              className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-md leading-6 text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:shadow-none focus-visible:ring-0"
            />
            {isLoading && stop ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label="Stop answer"
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border-primary bg-bg-elevated px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary ${FOCUS_RING}`}
              >
                <Square size={14} fill="currentColor" aria-hidden="true" />
                Stop
              </button>
            ) : (
              <button
                type="submit"
                aria-disabled={!canSend}
                aria-label="Send"
                onClick={(e) => {
                  if (!canSend) e.preventDefault();
                }}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${FOCUS_RING} ${
                  canSend
                    ? 'bg-text-primary text-bg-primary motion-safe:active:scale-95'
                    : 'cursor-not-allowed bg-text-primary text-bg-primary opacity-40'
                }`}
              >
                <SendHorizontal size={20} aria-hidden="true" />
              </button>
            )}
          </form>
          <p className="mx-auto mt-2.5 max-w-2xl px-1 text-center text-xs text-text-tertiary">
            Answers are generated from published notes and may be wrong.
          </p>
        </div>
      </main>

      <dialog
        ref={dialogRef}
        aria-labelledby="clear-title"
        className="m-auto w-[min(90vw,22rem)] rounded-2xl border border-border-primary bg-bg-elevated p-5 text-text-primary backdrop:bg-text-primary/40"
      >
        <h2 id="clear-title" className="text-lg font-semibold">
          Clear this chat?
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">This removes every message from this screen.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`min-h-11 rounded-full border border-border-primary px-4 text-sm font-medium hover:bg-bg-secondary ${FOCUS_RING}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={clearChat}
            className={`min-h-11 rounded-full bg-danger px-4 text-sm font-medium text-bg-elevated ${FOCUS_RING}`}
          >
            Clear chat
          </button>
        </div>
      </dialog>
    </div>
  );
}
