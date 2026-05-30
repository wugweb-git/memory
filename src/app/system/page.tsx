'use client';

import { useEffect, useState } from "react";
import { M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API } from "@/lib/ui/contracts";
import { AppShell } from "@/app/component/AppShell";

export default function SystemPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(UI_API.healthSystem).then((r) => r.json()),
      fetch(UI_API.healthPersona).then((r) => r.json()),
      fetch(UI_API.healthOutput).then((r) => r.json()),
      fetch(UI_API.healthRecommendation).then((r) => r.json()),
    ])
      .then(([system, persona, output, recommendation]) => setHealth({ system, persona, output, recommendation }))
      .catch((e) => setError(e?.message || "Failed to load health"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="System Health" subtitle="Operational checks and runtime status">
          {loading ? <M3State state="loading" message="Loading health systems..." /> : null}
          {error ? <M3State state="error" message={error} /> : null}
          {Object.entries(health).map(([k, v]) => (
            <M3Card key={k} title={k}>
              <pre className="text-xs overflow-auto">{JSON.stringify(v, null, 2)}</pre>
            </M3Card>
          ))}
        </M3Page>
      </div>
    </AppShell>
  );
}
