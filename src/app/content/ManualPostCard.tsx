"use client";

import { useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { M3Button, M3Card } from "@/components/ui/m3";
import { Field, Input, StatusPill } from "@/components/ui/primitives";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { MANUAL_PLATFORMS, validatePostUrl, type ManualPlatform } from "@/lib/platforms/manual";

const LINK_BTN =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-primary bg-bg-elevated px-5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export type ManualPrep = { outputId: string; platform: ManualPlatform; text: string };

/** Post-it-yourself card: formatted text, copy, open the site, then confirm it was posted. */
export function ManualPostCard({
  prep,
  onDone,
  idSuffix = "",
  itemTitle,
}: {
  prep: ManualPrep;
  onDone: (message: string) => void;
  /** Keeps element ids unique when several cards are on one page (history). */
  idSuffix?: string;
  /** Optional title of the item, shown above the text when several cards are listed. */
  itemTitle?: string;
}) {
  const textId = `manual-post-text${idSuffix}`;
  const urlId = `manual-post-url${idSuffix}`;
  const meta = MANUAL_PLATFORMS[prep.platform];
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(prep.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      textRef.current?.select();
      setCopied(false);
      setCopyFailed(true);
    }
  }

  async function confirm() {
    const check = validatePostUrl(url);
    if (!check.ok) { setUrlError(check.error); return; }
    setUrlError(null);
    setSaveError(null);
    setSaving(true);
    try {
      await apiRequest(UI_API.outputPublishManualConfirm, {
        method: "POST",
        body: { outputId: prep.outputId, url: check.url ?? undefined },
      });
      onDone(`Marked as posted on ${meta.label}`);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not record the post. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <M3Card
      title={`Ready to post on ${meta.label}`}
      description={`${meta.label} cannot be posted to from here. Copy the text, post it yourself, then mark it as posted.`}
      action={<StatusPill tone="warning">Waiting for you to post</StatusPill>}
    >
      {itemTitle ? <p className="break-words text-sm font-semibold text-text-primary">{itemTitle}</p> : null}
      <label htmlFor={textId} className="sr-only">{`Formatted text for ${meta.label}`}</label>
      <textarea
        id={textId}
        ref={textRef}
        readOnly
        value={prep.text}
        className="min-h-44 w-full rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        <M3Button tone="secondary" onClick={copy}>
          {copied ? <Check size={16} aria-hidden="true" className="mr-2" /> : <Copy size={16} aria-hidden="true" className="mr-2" />}
          Copy text
        </M3Button>
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className={LINK_BTN}>
          {meta.openLabel}
          <ExternalLink size={14} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-text-secondary">
        {copied ? "Copied" : copyFailed ? "Could not copy. The text is selected, press Ctrl+C or Cmd+C." : ""}
      </p>

      <div className="space-y-3 border-t border-border-secondary pt-3">
        {asking ? (
          <>
            <Field
              id={urlId}
              label="Link to your post (optional)"
              hint="Paste the https link so history can point to it."
              error={urlError ?? undefined}
            >
              <Input
                id={urlId}
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://"
                value={url}
                invalid={Boolean(urlError)}
                aria-describedby={urlError ? `${urlId}-error` : `${urlId}-hint`}
                onChange={(e) => { setUrl(e.target.value); if (urlError) setUrlError(null); }}
              />
            </Field>
            {saveError ? <p role="alert" className="text-sm text-danger">{saveError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <M3Button onClick={confirm} disabled={saving} loading={saving}>Save as posted</M3Button>
              <M3Button tone="secondary" onClick={() => { setAsking(false); setUrlError(null); }} disabled={saving}>Cancel</M3Button>
            </div>
          </>
        ) : (
          <M3Button onClick={() => setAsking(true)}>Mark as posted</M3Button>
        )}
      </div>
    </M3Card>
  );
}
