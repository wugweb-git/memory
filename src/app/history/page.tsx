'use client';

import { useEffect, useState } from "react";
import { M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API, resolveUserId } from "@/lib/ui/contracts";

export default function HistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${UI_API.outputHistory}?userId=${encodeURIComponent(resolveUserId())}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((e) => setError(e?.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <M3Page title="History" subtitle="Published output and execution trace">
      <M3Card title="Output History">
        {loading ? <M3State state="loading" message="Loading history..." /> : null}
        {error ? <M3State state="error" message={error} /> : null}
        {!loading && !error && rows.length === 0 ? <M3State state="empty" message="No published outputs yet." /> : rows.map((r, i) => (
          <div key={r.id || i} className="rounded-2xl border p-3 text-sm">
            <p className="font-bold">{r.platform || "unknown"}</p>
            <p className="text-text-tertiary text-xs">{r.externalUrl || r.externalId || "local"}</p>
          </div>
        ))}
      </M3Card>
    </M3Page>
  );
}
