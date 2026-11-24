'use client';

import { ChevronDown } from 'lucide-react';
import { Section } from '@/components/ui/primitives';
import { CameraCaptureButton, DeviceActionsRow, PasteCaptureButton } from '@/components/native/DeviceActions';
import { AskAnotherAi } from '@/components/native/AskAnotherAi';

const SUMMARY =
  'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-text-secondary hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden';

function More({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-card border border-border-primary bg-bg-elevated">
      <summary className={SUMMARY}>
        <span>{summary}</span>
        <ChevronDown size={18} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border-secondary p-3">{children}</div>
    </details>
  );
}

/** Phone capture tools for the buffer: camera and clipboard up front, the rest behind two disclosures. */
export function BufferDeviceTools() {
  return (
    <Section title="Capture from this device" description="Camera, clipboard, share sheet and other apps." headingLevel={3}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <CameraCaptureButton />
          <PasteCaptureButton />
        </div>
        <More summary="Share, calendar, contacts and location">
          <DeviceActionsRow />
        </More>
        <More summary="Ask another AI">
          <AskAnotherAi />
        </More>
      </div>
    </Section>
  );
}
