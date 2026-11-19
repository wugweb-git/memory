"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreVertical, SendHorizontal, Square } from 'lucide-react';
import type { UIMessage } from 'ai';
import { usePrismChat } from '@/hooks/usePrismChat';
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

/**
 * Starter questions shown on the empty state. Edit this list to change them.
 * Drafted from the public profile (ventures, experience, writing).
 */
const STARTER_QUESTIONS: readonly string[] = [
  'What is Vedanshu working on?',
  'What has he written about?',
  'What kind of projects has he built?',
  'What are his main areas of expertise?',
];

const FIRST_NAME = IDENTITY_CONFIG.DISPLAY_NAME.split(' ')[0];
const LINE_HEIGHT_PX = 24; // matches leading-6 on the textarea
const TEXTAREA_PADDING_PX = 16; // py-2 top and bottom
const FALLBACK_ERROR = 'The answer did not come through. Check your connection, then tap Retry.';

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

function Avatar() {
  const [failed, setFailed] = useState(false);
  const initials = IDENTITY_CONFIG.DISPLAY_NAME.split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-full bg-bg-tertiary text-text-primary text-sm font-semibold flex items-center justify-center"
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarFallbackUrl(96)}
      alt=""
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full bg-bg-tertiary"
    />
  );
}

function TypingDots() {
  return (
    <div role="status" aria-label={`${FIRST_NAME} is replying`} className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border-primary bg-bg-elevated px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map((delay) => (
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

export default function AskPage() {
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const { messages, sendMessage, status, setMessages, stop, regenerate, clearError } = usePrismChat(UI_API.chat);

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

  // Auto-grow the textarea up to four lines.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${clampTextareaHeight(ta.scrollHeight, LINE_HEIGHT_PX, 4, TEXTAREA_PADDING_PX)}px`;
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
      sendMessage({ text });
      setInput('');
      requestAnimationFrame(() => scrollToBottom(true));
    },
    [isLoading, sendMessage, scrollToBottom],
  );

  const retry = () => {
    haptic('tap');
    nearBottomRef.current = true;
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
    stamps.current.clear();
    nearBottomRef.current = true;
    dialogRef.current?.close();
  };

  const openClearDialog = () => {
    setMenuOpen(false);
    dialogRef.current?.showModal();
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
      })),
    [messages],
  );

  const profileHref = `/p/${IDENTITY_CONFIG.HANDLE}`;
  const canSend = input.trim() !== '' && !isLoading;

  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col bg-bg-primary text-text-primary h-screen"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      <header className="shrink-0 flex items-center gap-2 border-b border-border-primary bg-bg-elevated px-2 pt-[env(safe-area-inset-top)]">
        <Link
          href={profileHref}
          aria-label={`Back to ${FIRST_NAME}'s profile`}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <Avatar />
        <div className="min-w-0 flex-1 py-2">
          <h1 className="text-base font-semibold leading-tight truncate">{IDENTITY_CONFIG.DISPLAY_NAME}</h1>
          <p className="text-xs text-text-tertiary leading-tight truncate">{`Ask about ${FIRST_NAME}'s work`}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <MoreVertical size={22} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-xl border border-border-primary bg-bg-elevated py-1 shadow-lg"
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

      <div
        ref={scrollRef}
        onScroll={(e) => {
          nearBottomRef.current = isNearBottom(e.currentTarget);
        }}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation"
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {rows.length === 0 && !hasError ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text-primary">{`Ask about ${FIRST_NAME}'s work`}</h2>
              <p className="max-w-xs text-sm text-text-tertiary">Tap a question to start, or type your own below.</p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="min-h-11 rounded-2xl border border-border-primary bg-bg-elevated px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mx-auto flex w-full max-w-2xl flex-col gap-3">
            {rows.map((r) => {
              const mine = r.role === 'user';
              if (!mine && r.text === '') return null;
              return (
                <li key={r.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-base leading-snug ${
                      mine
                        ? 'rounded-br-md bg-bg-tertiary text-text-primary'
                        : 'rounded-bl-md border border-border-primary bg-bg-elevated text-text-primary'
                    }`}
                  >
                    {r.text}
                  </div>
                  <span className="mt-1 px-1 text-2xs text-text-tertiary">
                    <span className="sr-only">{mine ? 'You, ' : `${FIRST_NAME}, `}</span>
                    {r.time}
                  </span>
                </li>
              );
            })}
            {showTyping && (
              <li>
                <TypingDots />
              </li>
            )}
            {hasError && (
              <li role="alert" className="flex flex-col items-start gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-danger bg-bg-elevated px-3.5 py-2 text-base text-text-primary">
                  {FALLBACK_ERROR}
                </div>
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-11 rounded-full border border-border-primary bg-bg-elevated px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Retry
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-border-primary bg-bg-elevated px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <form
          aria-label={`Ask ${FIRST_NAME}`}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex w-full max-w-2xl items-end gap-2"
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
            className="min-h-11 flex-1 resize-none rounded-2xl border border-border-primary bg-bg-primary px-4 py-2 text-base leading-6 text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {isLoading && stop ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop answer"
              className="h-11 w-11 shrink-0 rounded-full border border-border-primary bg-bg-elevated text-text-primary flex items-center justify-center hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Square size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="h-11 w-11 shrink-0 rounded-full bg-text-primary text-bg-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <SendHorizontal size={20} aria-hidden="true" />
            </button>
          )}
        </form>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-2xs text-text-tertiary">
          {`Answers are generated from ${FIRST_NAME}'s notes and may be wrong.`}
        </p>
      </div>

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
            className="min-h-11 rounded-full border border-border-primary px-4 text-sm font-medium hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={clearChat}
            className="min-h-11 rounded-full bg-danger px-4 text-sm font-medium text-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear chat
          </button>
        </div>
      </dialog>
    </div>
  );
}
