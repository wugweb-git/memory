'use client';

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Card, M3Page, M3State } from "@/components/ui/m3";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";
import { PasskeyCard } from "./PasskeyCard";

const MODULE_LABELS: Record<string, string> = {
  ask: "Ask / chat",
  memory: "Memory vault",
  buffer: "Buffer (intake queue)",
  history: "History",
  cognitive: "Cognitive engine",
  persona: "Persona",
  career: "Career",
  system: "System page",
  admin: "Admin",
};

export default function SystemPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [featuresError, setFeaturesError] = useState<string | null>(null);

  useEffect(() => {
    const sources: Record<string, string> = {
      system: UI_API.healthSystem,
      persona: UI_API.healthPersona,
      output: UI_API.healthOutput,
      recommendation: UI_API.healthRecommendation,
    };
    // allSettled: one failing health endpoint must not blank the other cards
    Promise.allSettled(Object.values(sources).map((u) => apiRequest<Record<string, unknown>>(u, { retries: 0 })))
      .then((results) => {
        const next: Record<string, any> = {};
        const failed: string[] = [];
        Object.keys(sources).forEach((k, i) => {
          const r = results[i];
          if (r.status === "fulfilled") next[k] = r.value;
          else failed.push(k);
        });
        setHealth(next);
        if (failed.length) setError(`Could not load: ${failed.join(", ")}`);
      })
      .finally(() => setLoading(false));

    apiRequest<{ features: Record<string, boolean> }>(UI_API.systemFeatures)
      .then((j) => setFeatures(j.features))
      .catch((e) => setFeaturesError(e instanceof Error ? e.message : "Failed to load module flags"));
  }, []);

  async function toggle(key: string) {
    if (!features) return;
    const next = !features[key];
    setSavingKey(key);
    try {
      const j = await apiRequest<{ features: Record<string, boolean> }>(UI_API.systemFeatures, {
        method: "PATCH",
        body: { features: { [key]: next } },
      });
      setFeatures(j.features);
      toast.success(`${MODULE_LABELS[key] ?? key} ${next ? "enabled" : "disabled"} — nav updates on next page load`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(/admin|auth/i.test(msg) ? "Log in as admin to change modules" : msg);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="System" subtitle="Module switches, operational checks and runtime status">
          <M3Card title="Modules">
            {features === null ? (
              featuresError ? (
                <M3State state="error" message={`Module flags unavailable: ${featuresError}`} />
              ) : (
                <M3State state="loading" message="Loading module flags…" />
              )
            ) : (
              <ul className="divide-y divide-border-secondary">
                {Object.entries(MODULE_LABELS).map(([key, label]) => {
                  const on = features[key] !== false;
                  return (
                    <li key={key} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{label}</p>
                        <p className="text-2xs text-text-tertiary">{on ? "Visible in the app" : "Hidden from navigation"}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(key)}
                        disabled={savingKey === key}
                        aria-label={label}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-accent" : "bg-border-primary"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg-primary shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-2xs text-text-tertiary mt-2">
              Toggles are stored in Neon and apply app-wide. Admin login required to change them.
            </p>
          </M3Card>

          <PasskeyCard />

          {loading ? <M3State state="loading" message="Loading health systems..." /> : null}
          {error ? <M3State state="error" message={error} /> : null}
          {Object.entries(health).map(([k, v]) => (
            <M3Card key={k} title={k}>
              <pre className="text-xs text-text-secondary overflow-auto">{JSON.stringify(v, null, 2)}</pre>
            </M3Card>
          ))}
        </M3Page>
      </div>
    </AppShell>
  );
}
