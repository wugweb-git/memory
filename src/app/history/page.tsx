'use client';

import { useCallback, useEffect, useState } from "react";
import { M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";

type OutputRow = {
  id?: string;
  platform?: string | null;
  externalUrl?: string | null;
  externalId?: string | null;
  createdAt?: string | null;
};

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

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
      .catch((e) => { if (active) setError(e?.message || "Failed to load history"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="History" subtitle="Published output and execution trace">
          <M3Card title="Output history">
            {loading ? <M3State state="loading" message="Loading history..." /> : null}
            {error ? (
              <div className="space-y-2">
                <M3State state="error" message={error} />
                <button
                  type="button"
                  onClick={() => load()}
                  className="min-h-11 rounded-xl border border-border-secondary px-4 text-sm font-medium text-text-secondary hover:bg-secondary"
                >
                  Try again
                </button>
              </div>
            ) : null}
            {!loading && !error && rows.length === 0 ? <M3State state="empty" message="No published outputs yet." /> : null}
            {!error && rows.map((r, i) => {
              const link = r.externalUrl || "";
              return (
                <div key={r.id || i} className="rounded-2xl border border-border-secondary p-3 text-sm">
                  <p className="font-bold text-text-primary">{r.platform || "unknown"}</p>
                  <p className="text-text-tertiary text-xs break-all">
                    {link && isSafeUrl(link) ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">{link}</a>
                    ) : (link || r.externalId || "local")}
                  </p>
                  {r.createdAt ? (
                    <p className="text-text-disabled text-2xs mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  ) : null}
                </div>
              );
            })}
          </M3Card>
        </M3Page>
      </div>
    </AppShell>
  );
}
