"use client";

import { useState, useEffect } from "react";
import { resolveUserId } from "@/config/identity";

export interface DashboardProfile {
  displayName: string;
  handle: string;
  email: string;
  timezone: string;
}

export interface DashboardStats {
  memoryPackets: string;
  syncStatus: string;
  bufferQueue: string;
  uplink: string;
}

export interface DashboardData {
  profile: DashboardProfile;
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
}

const DEFAULTS: DashboardData = {
  profile: {
    displayName: "User",
    handle: "@user",
    email: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
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
        const [memRes, sysRes, personaRes, profileRes] = await Promise.allSettled([
          fetch("/api/memory/stats"),
          fetch("/api/admin/system-health"),
          fetch("/api/persona/profile"),
          fetch("/api/persona/profile"),
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
          uplink = sysJson.core_integrity === "PASSED" ? "98.4%" : DEFAULTS.stats.uplink;
          bufferQueue = String(sysJson.metrics?.stale_locks ?? "—");
        }

        if (personaRes.status === "fulfilled" && personaRes.value.ok) {
          const pJson = await personaRes.value.json();
          // persona health endpoint returns counts
          bufferQueue = pJson.counts?.activeProfiles?.toString() || bufferQueue;
        }

        if (profileRes.status === "fulfilled" && profileRes.value.ok) {
          const profJson = await profileRes.value.json();
          // profile could have displayName etc.
        }

        setData({
          profile: DEFAULTS.profile,
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

  useEffect(() => {
    let cancelled = false;

    fetch("/api/persona/traits")
      .then(r => r.ok ? r.json() : [])
      .then(traitList => {
        if (!cancelled) {
          setTraits(Array.isArray(traitList) ? traitList : traitList.traits || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { traits, loading };
}