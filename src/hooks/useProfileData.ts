"use client";

import React, { useEffect, useState } from "react";
import { IDENTITY_CONFIG } from "@/config/identity";
import type { ProfileRecord, ProfileSection } from "@/lib/profile/types";

export type { ProfileSection };
export type ProfilePayload = ProfileRecord;

export function useProfileData(username?: string) {
  const handle = username ?? IDENTITY_CONFIG.HANDLE;
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchProfile = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(handle)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("profile fetch failed");
      const data = await res.json();
      setProfile(data as ProfilePayload);
    } catch {
      setError(true);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const sections = profile?.sections ?? [];
  const byType = (type: string) =>
    sections.filter((s) => (s.type || "").toLowerCase() === type.toLowerCase());

  return { profile, sections, byType, loading, error, refetch: fetchProfile };
}
