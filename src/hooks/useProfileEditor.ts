"use client";

import { useCallback, useState } from "react";
import { IDENTITY_CONFIG } from "@/config/identity";
import type { ProfileSection, ProfileRecord } from "@/lib/profile/types";
import { useProfileData } from "./useProfileData";

export function useProfileEditor(username = IDENTITY_CONFIG.HANDLE) {
  const { profile, sections, byType, loading, error, refetch } = useProfileData(username);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const base = `/api/profile/${encodeURIComponent(username)}`;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const saveProfile = useCallback(
    async (patch: Partial<ProfileRecord>) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(base, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Failed to save profile");
        const json = await res.json();
        await refetch();
        return json;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setSaveError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [base, refetch],
  );

  const addSection = useCallback(
    async (section: { type: string; title: string; content?: Record<string, unknown> }) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`${base}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(section),
        });
        if (!res.ok) throw new Error("Failed to add section");
        const json = await res.json();
        await refetch();
        return json;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Add failed";
        setSaveError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [base, refetch],
  );

  const removeSection = useCallback(
    async (sectionId: string) => {
      setSaving(true);
      const res = await fetch(`${base}/sections?sectionId=${encodeURIComponent(sectionId)}`, {
        method: "DELETE",
      });
      setSaving(false);
      if (!res.ok) throw new Error("Failed to remove section");
      const json = await res.json();
      await refetch();
      return json;
    },
    [base, refetch],
  );

  const publishToProfile = useCallback(
    async (body: {
      outputId?: string;
      title?: string;
      body?: string;
      platform?: string;
      url?: string;
    }) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`${base}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, userId: IDENTITY_CONFIG.DEFAULT_USER_ID }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Publish failed");
        return json;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Publish failed";
        setSaveError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  return {
    profile,
    sections: sections as ProfileSection[],
    byType,
    loading,
    error,
    saving,
    saveError,
    saveProfile,
    addSection,
    removeSection,
    publishToProfile,
    refresh,
  };
}
