"use client";

import { useState, useEffect } from "react";
export interface DashboardStats {
  memoryPackets: string;
  syncStatus: string;
  bufferQueue: string;
  uplink: string;
}

export interface DashboardData {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
}

const DEFAULTS: DashboardData = {
  stats: {
    memoryPackets: "—",
    syncStatus: "Unknown",
    bufferQueue: "—",
    uplink: "—",
  },
  loading: true,
  error: null,
};

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Fetch from existing admin health endpoints
        const [memRes, sysRes, blobRes] = await Promise.allSettled([
          fetch("/api/memory/stats"),
          fetch("/api/health/system"),
          fetch("/api/blob/stats"),
        ]);

        if (cancelled) return;

        let memoryPackets = DEFAULTS.stats.memoryPackets;
        let syncStatus = DEFAULTS.stats.syncStatus;
        let bufferQueue = DEFAULTS.stats.bufferQueue;
        let uplink = DEFAULTS.stats.uplink;

        if (memRes.status === "fulfilled" && memRes.value.ok) {
          const memJson = await memRes.value.json();
          memoryPackets = memJson.total_packets?.toLocaleString() || DEFAULTS.stats.memoryPackets;
        }

        if (sysRes.status === "fulfilled" && sysRes.value.ok) {
          const sysJson = await sysRes.value.json();
          syncStatus = sysJson.status || DEFAULTS.stats.syncStatus;
          const stability = sysJson.metrics?.logic_stability_pct;
          uplink =
            stability != null
              ? `${stability}%`
              : sysJson.core_integrity === "PASSED"
                ? "100%"
                : DEFAULTS.stats.uplink;
        }

        // Signed-out (401) or failed responses leave the placeholder; the console shows "Signed out" separately.
        if (blobRes.status === "fulfilled" && blobRes.value.ok) {
          const blobJson = await blobRes.value.json().catch(() => null);
          if (blobJson && typeof blobJson.item_count === "number") {
            bufferQueue = blobJson.item_count.toLocaleString();
          }
        }

        setData({
          stats: { memoryPackets, syncStatus, bufferQueue, uplink },
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!cancelled) {
          setData({ ...DEFAULTS, loading: false, error: (err as Error).message });
        }
      }
    }

    fetchData();

    return () => { cancelled = true; };
  }, []);

  return data;
}

/**
 * Hook to fetch persona traits from the API.
 */
export function usePersonaTraits() {
  const [traits, setTraits] = useState<Array<{ name: string; score: number; desc: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/persona/traits')
      .then(r => r.ok ? r.json() : [])
      .then(traitList => {
        if (!cancelled) {
          const raw = Array.isArray(traitList) ? traitList : traitList?.traits || [];
          setTraits(
            raw.map((t: Record<string, unknown>) => ({
              name: String(t.traitName ?? t.name ?? 'Trait'),
              score: Number(t.traitValue ?? t.score ?? 0.5),
              desc: String(t.reason ?? t.desc ?? ''),
            })),
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => setTick((n) => n + 1);

  return { traits, loading, refetch };
}