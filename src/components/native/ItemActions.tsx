'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { ShareButton, AddToCalendarButton } from './DeviceActions';
import { OpenInApp } from './OpenInApp';
import { AskAnotherAi } from './AskAnotherAi';

export interface ItemActionsProps {
  title?: string;
  text?: string;
  url?: string;
  /** Collapse everything behind one disclosure (use in dense lists). */
  compact?: boolean;
  label?: string;
}

const SUMMARY =
  'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-text-secondary hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden';

function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-card border border-border-primary bg-bg-elevated">
      <summary className={SUMMARY}>
        <span>{summary}</span>
        <ChevronDown size={18} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="space-y-4 border-t border-border-secondary p-3">{children}</div>
    </details>
  );
}

/**
 * Device actions for one memory or content item: Share and Add to calendar up front,
 * Open in app and Ask another AI behind a disclosure. All secondary (outline) buttons.
 */
export function ItemActions({ title, text, url, compact = false, label = 'Share and open' }: ItemActionsProps) {
  const id = useId();
  const context = [title, text].filter(Boolean).join('\n\n');
  const more = (
    <>
      <OpenInApp context={{ title, text, url }} />
      <AskAnotherAi context={context} />
    </>
  );

  const primary = (
    <div className="flex flex-wrap items-start gap-2">
      <ShareButton title={title} text={text} url={url} />
      <AddToCalendarButton title={title} description={text} url={url} />
    </div>
  );

  if (compact) {
    return (
      <div className="mt-2" role="group" aria-labelledby={id}>
        <span id={id} className="sr-only">Actions for {title || 'this item'}</span>
        <Disclosure summary={label}>
          {primary}
          {more}
        </Disclosure>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="group" aria-labelledby={id}>
      <span id={id} className="sr-only">Share and open {title || 'this item'}</span>
      {primary}
      <Disclosure summary="Open in an app or ask another AI">{more}</Disclosure>
    </div>
  );
}
