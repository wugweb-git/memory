"use client";

import { useEffect, useState } from "react";
import { IDENTITY_CONFIG } from "@/config/identity";

export type ProfileSection = {
  id?: string;
  type?: string;
  title?: string;
  content?: unknown;
  settings?: Record<string, unknown>;
};

type ProfilePayload = {
  displayName?: string;
  bio?: string;
  socialLinks?: Array<{ platform?: string; url?: string }>;
  sections?: ProfileSection[];
};

export function useProfileData(username = IDENTITY_CONFIG.HANDLE) {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("profile fetch failed");
        const data = await res.json();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) {
          setError(true);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const sections = profile?.sections ?? [];
  const byType = (type: string) =>
    sections.filter((s) => (s.type || "").toLowerCase() === type.toLowerCase());

  return { profile, sections, byType, loading, error };
}
