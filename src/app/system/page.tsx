'use client';

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AppToastContainer } from "@/app/component/AppToastContainer";
import "react-toastify/dist/ReactToastify.css";
import { M3Button, M3Card, M3Page, M3State } from "@/components/ui/m3";
import { Skeleton } from "@/components/ui/primitives";
import { UI_API } from "@/lib/ui/contracts";
import { apiRequest } from "@/lib/ui/api-client";
import { AppShell } from "@/app/component/AppShell";
import { PasskeyCard } from "./PasskeyCard";
import { CostCard } from "./CostCard";
import { CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";

const HEALTH_LABELS: Record<string, string> = {
  system: "System health",
  persona: "Persona health",
  output: "Output health",
  recommendation: "Recommendation health",
};

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

  const loadHealth = useCallback(() => {
    setLoading(true);
    setError(null);
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
        if (failed.length) setError(`Could not load these health checks: ${failed.map((k) => HEALTH_LABELS[k] ?? k).join(", ")}.`);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadFeatures = useCallback(() => {
    setFeaturesError(null);
    apiRequest<{ features: Record<string, boolean> }>(UI_API.systemFeatures)
      .then((j) => setFeatures(j.features))
      .catch((e) => setFeaturesError(e instanceof Error ? e.message : "Check your connection"));
  }, []);

  useEffect(() => {
    loadHealth();
    loadFeatures();
  }, [loadHealth, loadFeatures]);

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
      toast.success(`${MODULE_LABELS[key] ?? key} ${next ? "turned on" : "turned off"}. The menu updates on the next page load.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(/admin|auth/i.test(msg) ? "Sign in as the owner to change modules" : msg);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AppShell>
      <AppToastContainer position="bottom-right" theme="light" />
      <M3Page title="System" subtitle="Module switches, operational checks and runtime status">
          <M3Card title="Modules">
            {features === null ? (
              featuresError ? (
                <div className="space-y-3">
                  <M3State state="error" message={`Module switches could not load (${featuresError}). Try again, or sign in as the owner.`} />
                  <M3Button tone="secondary" onClick={loadFeatures}>Try again</M3Button>
                </div>
              ) : (
                <div className="space-y-2" role="status" aria-label="Loading module switches">
                  <Skeleton className="h-12 w-full motion-reduce:animate-none" />
                  <Skeleton className="h-12 w-full motion-reduce:animate-none" />
                  <Skeleton className="h-12 w-full motion-reduce:animate-none" />
                </div>
              )
            ) : (
              <ul className="divide-y divide-border-secondary">
                {Object.entries(MODULE_LABELS).map(([key, label]) => {
                  const on = features[key] !== false;
                  return (
                    <li key={key} className="flex min-h-14 items-center justify-between gap-3 py-2">
                      <div id={`mod-${key}-desc`}>
                        <p className="text-sm font-medium text-text-primary">{label}</p>
                        <p className="text-xs text-text-tertiary">{on ? "On: shown in the menu" : "Off: hidden from the menu"}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(key)}
                        disabled={savingKey === key}
                        aria-label={label}
                        aria-describedby={`mod-${key}-desc`}
                        className="group inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                      >
                        <span className={`relative block h-6 w-11 rounded-full border border-border-primary transition-colors motion-reduce:transition-none ${on ? "bg-accent" : "bg-bg-tertiary"}`}>
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg-elevated shadow transition-transform motion-reduce:transition-none ${on ? "translate-x-5" : "translate-x-0.5"}`}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-2xs text-text-tertiary mt-2">
              Switches are saved and apply across the whole app. Only the owner can change them.
            </p>
          </M3Card>

          <M3Card title="Scheduled jobs">
            {Array.isArray(health.system?.jobs_last_run) ? (
              <ul className="divide-y divide-border-secondary">
                {(health.system.jobs_last_run as Array<{ job: string; label: string; last_run_at: string | null; status: "ok" | "failed" | "never" }>).map((j) => {
                  const Icon = j.status === "ok" ? CheckCircle2 : j.status === "failed" ? AlertCircle : CircleDashed;
                  const tone = j.status === "ok" ? "text-success" : j.status === "failed" ? "text-danger" : "text-text-tertiary";
                  const when = j.last_run_at ? new Date(j.last_run_at).toLocaleString() : null;
                  return (
                    <li key={j.job} className="flex min-h-12 items-center justify-between gap-3 py-2">
                      <p className="text-sm font-medium text-text-primary">{j.label}</p>
                      <p className={`flex shrink-0 items-center gap-1.5 text-xs ${tone}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{j.status === "never" ? "Never run" : `Last run ${when}${j.status === "failed" ? " (failed)" : ""}`}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-text-tertiary">{loading ? "Loading last run times." : "Last run times are not available right now."}</p>
            )}
          </M3Card>

          <PasskeyCard />

          <CostCard />

          {loading ? <div className="space-y-2" role="status" aria-label="Loading health checks"><Skeleton className="h-24 w-full motion-reduce:animate-none" /></div> : null}
          {error ? (
            <div className="space-y-3">
              <M3State state="error" message={error} />
              <M3Button tone="secondary" onClick={loadHealth}>Try again</M3Button>
            </div>
          ) : null}
          {Object.entries(health).map(([k, v]) => (
            <M3Card key={k} title={HEALTH_LABELS[k] ?? k}>
              <pre tabIndex={0} aria-label={`${HEALTH_LABELS[k] ?? k} details`} className="text-xs text-text-secondary overflow-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{JSON.stringify(v, null, 2)}</pre>
            </M3Card>
          ))}
      </M3Page>
    </AppShell>
  );
}
