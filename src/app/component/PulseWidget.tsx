"use client";
import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { UI_API } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/ui/api-client";

type Checkin = {
  id: string;
  motivation: number;
  energy: number;
  stress: number;
  attention: number;
  burnoutRisk: number;
  flagged: boolean;
  createdAt: string;
};

const FIELDS: { key: "motivation" | "energy" | "stress" | "attention"; label: string }[] = [
  { key: "motivation", label: "Motivation" },
  { key: "energy", label: "Energy" },
  { key: "stress", label: "Stress" },
  { key: "attention", label: "Attention" },
];

/** Wellbeing/momentum check-in — the pulse primitives (src/lib/pulse/*) had no UI. */
export function PulseWidget() {
  const [values, setValues] = useState({ motivation: 0.6, energy: 0.6, stress: 0.4, attention: 0.6 });
  const [recent, setRecent] = useState<Checkin[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<{ checkins: Checkin[] }>(UI_API.pulse);
      setRecent(res.checkins ?? []);
    } catch {
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setSaving(true);
    try {
      const checkin = await apiRequest<Checkin>(UI_API.pulse, { method: "POST", body: values });
      toast[checkin.flagged ? "warn" : "success"](
        checkin.flagged
          ? `Burnout risk elevated (${Math.round(checkin.burnoutRisk * 100)}%) — consider a break.`
          : "Pulse recorded.",
      );
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save check-in");
    } finally {
      setSaving(false);
    }
  }

  const latest = recent[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={15} className="text-accent" />
        <h3 className="text-sm font-bold text-text-primary">Pulse check-in</h3>
      </div>
      <p className="text-xs text-text-tertiary">How are you doing right now?</p>

      <div className="space-y-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
              <span>{label}</span>
              <span className="font-mono">{Math.round(values[key] * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
              className="w-full accent-accent"
            />
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="w-full py-2 rounded-xl bg-text-primary text-bg-primary text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        {saving ? "Saving…" : "Log check-in"}
      </button>

      {loading ? (
        <p className="text-2xs text-text-disabled">Loading recent check-ins…</p>
      ) : latest ? (
        <p className="text-2xs text-text-tertiary">
          Last: {new Date(latest.createdAt).toLocaleString()} · burnout risk{" "}
          <span className={latest.flagged ? "text-warning font-bold" : ""}>
            {Math.round(latest.burnoutRisk * 100)}%
          </span>
        </p>
      ) : (
        <p className="text-2xs text-text-disabled">No check-ins yet.</p>
      )}
    </div>
  );
}
