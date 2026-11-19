'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";
import { describeDelivery } from "@/lib/publishing/delivery";

type OutputRow = {
  id?: string;
  platform?: string | null;
  externalUrl?: string | null;
  externalId?: string | null;
  createdAt?: string | null;
  delivery?: { platform: string; status: string; delivered: boolean; error?: string | null } | null;
};

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function platformLabel(p?: string | null): string {
  if (!p) return "Unknown platform";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url;
  }
}

const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-primary bg-bg-elevated px-4 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function HistoryPage() {
  const [rows, setRows] = useState<OutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<unknown>(UI_API.outputHistory)
      .then((d) => { if (active) setRows(Array.isArray(d) ? (d as OutputRow[]) : []); })
      .catch((e) => { if (active) setError(e?.message || "The history request failed."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">History</h1>
            <p className="mt-1 text-sm text-text-tertiary">Everything you have published, newest first</p>
          </div>
          {!error && (loading || rows.length > 0) ? (
            <button type="button" onClick={() => load()} disabled={loading} aria-label="Refresh history" className={`${BUTTON} w-11 shrink-0 px-0 disabled:opacity-40`}>
              <RefreshCw size={16} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} />
            </button>
          ) : null}
        </header>

        {loading ? (
          <div role="status" aria-label="Loading history" className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : null}

        {!loading && error ? (
          <Card role="alert" className="space-y-3 border-danger/30">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-text-primary">Could not load your history</p>
                <p className="break-words text-sm text-text-tertiary">{error}. Check your connection and try again.</p>
              </div>
            </div>
            <button type="button" onClick={() => load()} className={`${BUTTON} w-full sm:w-auto`}>
              Try again
            </button>
          </Card>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            hint="When you publish content, each post shows up here with a link to the live version."
            action={
              <Link href="/content" className={`${BUTTON} mt-2`}>
                Go to content
              </Link>
            }
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const link = r.externalUrl || "";
              const safe = link && isSafeUrl(link);
              const deliveryLabel = r.delivery ? describeDelivery(r.delivery as Parameters<typeof describeDelivery>[0]) : null;
              return (
                <li key={r.id || i}>
                  <Card className="space-y-1.5 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{platformLabel(r.platform)}</p>
                      {r.createdAt ? (
                        <time dateTime={r.createdAt} className="shrink-0 text-xs text-text-tertiary">
                          {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      ) : null}
                    </div>
                    {deliveryLabel ? <p className="text-sm text-text-secondary">{deliveryLabel}</p> : null}
                    {safe ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 max-w-full items-center gap-1.5 break-all text-sm text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span className="min-w-0">{shortUrl(link)}</span>
                        <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <p className="break-all text-sm text-text-tertiary">{link || r.externalId || "Saved locally, not published to a platform"}</p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </AppShell>
  );
}
