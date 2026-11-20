"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AppToastContainer } from "@/app/component/AppToastContainer";
import 'react-toastify/dist/ReactToastify.css';
import { Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import {
  ArrowLeft, Save, Eye, Plus, Trash2, BookOpen, ExternalLink, Loader2,
} from 'lucide-react';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { useProfileEditor } from '@/hooks/useProfileEditor';
import type { ProfileSection } from '@/lib/profile/types';

export default function AdminProfilePage() {
  const {
    profile, sections, loading, saving, error: loadError,
    saveProfile, addSection, removeSection, refresh,
  } = useProfileEditor();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState<'blog' | 'published'>('blog');
  const [activeTab, setActiveTab] = useState<'basic' | 'content'>('basic');
  const [titleError, setTitleError] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const TABS = ['basic', 'content'] as const;

  // Reflect the active tab in the URL (?tab=content) so it survives reload and can be linked.
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'content' || t === 'basic') setActiveTab(t);
    } catch { /* ignore */ }
  }, []);

  function selectTab(tab: 'basic' | 'content', focus = false) {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }
    if (focus) tabRefs.current[tab]?.focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      selectTab(TABS[next], true);
    }
  }

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? IDENTITY_CONFIG.DISPLAY_NAME);
    setBio(profile.bio ?? '');
    setIsPublished(profile.isPublished ?? true);
    setAvatarUrl(profile.avatarUrl ?? '');
  }, [profile]);

  const contentSections = sections.filter((s) =>
    ['blog', 'published'].includes(String(s.type).toLowerCase()),
  );

  async function handleSaveBasic() {
    try {
      await saveProfile({ displayName, bio, isPublished, avatarUrl: avatarUrl || null });
      toast.success('Profile saved');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the profile. Try again.');
    }
  }

  async function handleAddPost() {
    if (!newTitle.trim()) {
      setTitleError('Enter a title before adding the post.');
      return;
    }
    setTitleError(null);
    try {
      await addSection({
        type: newType,
        title: newTitle.trim(),
        content: {
          body: newBody,
          summary: newBody.slice(0, 200),
          source: newType === 'blog' ? 'Blog' : 'Portfolio',
          date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          tags: [],
        },
      });
      toast.success('Post added to your profile');
      setNewTitle('');
      setNewBody('');
      refresh();
    } catch {
      toast.error('Could not add the post. Check your connection and try again.');
    }
  }

  async function handleDeleteSection(id: string) {
    try {
      await removeSection(id);
      toast.success('Post removed from your profile');
      refresh();
    } catch {
      toast.error('Could not remove the post. Try again.');
    }
  }

  return (
    <div className="text-text-primary">
      <AppToastContainer position="bottom-right" theme="light" />
      <div className="max-w-5xl mx-auto mb-4 space-y-2">
        <Link href="/admin" className="hidden min-h-11 items-center gap-1 rounded-xl pr-3 text-sm font-medium text-accent-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:inline-flex">
          <ArrowLeft size={18} aria-hidden="true" /> Admin console
        </Link>
        <PageHeader
          title="Profile editor"
          subtitle="Edit the public profile and the posts shown on it."
          actions={
            <>
              <Link
                href={`/p/${IDENTITY_CONFIG.HANDLE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-xl border border-border-primary px-4 text-sm font-semibold hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Eye size={16} aria-hidden="true" /> Preview<span className="sr-only"> profile (opens in a new tab)</span>
              </Link>
              <button
                type="button"
                onClick={handleSaveBasic}
                disabled={saving || loading || !!loadError}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-text-primary px-4 text-sm font-semibold text-bg-primary hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {saving ? <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Save size={16} aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </>
          }
        />
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex gap-2" role="tablist" aria-label="Profile sections">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`ap-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`ap-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              ref={(el) => { tabRefs.current[tab] = el; }}
              onClick={() => selectTab(tab)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-text-primary text-bg-primary border-text-primary'
                  : 'border-border-primary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {tab === 'basic' ? 'Basics' : 'Blog and posts'}
            </button>
          ))}
        </div>

        {loadError && !loading ? (
          <div role="alert" className="rounded-2xl border border-danger p-4 text-sm text-danger flex items-center justify-between gap-3">
            <span>{typeof loadError === 'string' && loadError ? `Could not load the profile: ${loadError}` : 'Could not load the profile. Check your connection and try again.'}</span>
            <button type="button" onClick={() => refresh()} className="min-h-11 shrink-0 px-3 text-sm font-semibold text-accent-ink">Try again</button>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading profile" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : activeTab === 'basic' ? (
          <div role="tabpanel" id="ap-panel-basic" aria-labelledby="ap-tab-basic" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="rounded-2xl border border-border-primary bg-bg-elevated p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold text-text-primary">Identity</h2>
              <label htmlFor="ap-name" className="block text-sm font-medium text-text-primary">Display name</label>
              <input
                id="ap-name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <label htmlFor="ap-bio" className="block text-sm font-medium text-text-primary">Bio</label>
              <textarea
                id="ap-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <label htmlFor="ap-avatar" className="block text-sm font-medium text-text-primary">Avatar URL</label>
              <input
                id="ap-avatar"
                type="url"
                inputMode="url"
                autoComplete="photo"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="min-h-12 w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--accent)]"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>Show my public profile at /p/{IDENTITY_CONFIG.HANDLE}</span>
              </label>
              <button
                type="button"
                onClick={handleSaveBasic}
                disabled={saving}
                className="min-h-11 w-full rounded-xl bg-text-primary px-6 text-sm font-semibold text-bg-primary hover:bg-accent disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </section>

            <section className="rounded-2xl border border-border-primary bg-bg-elevated p-5 sm:p-6 flex flex-col items-center text-center">
              <img
                src={avatarUrl || avatarFallbackUrl(200)}
                alt={`Avatar preview for ${displayName}`}
                onError={(e) => { e.currentTarget.src = avatarFallbackUrl(200); }}
                className="w-32 h-32 rounded-full object-cover border-4 border-border-secondary mb-4"
              />
              <p className="text-xs font-medium text-text-tertiary mb-1">How your profile looks</p>
              <h2 className="text-2xl font-semibold">{displayName}</h2>
              <p className="text-sm text-text-tertiary mt-2 max-w-sm">{bio || 'No bio yet.'}</p>
              <p className="text-xs text-text-tertiary mt-4 font-mono">
                {sections.length} sections, {contentSections.length} posts
              </p>
            </section>
          </div>
        ) : (
          <div role="tabpanel" id="ap-panel-content" aria-labelledby="ap-tab-content" className="space-y-8">
            <section className="rounded-2xl border border-border-primary bg-bg-elevated p-5 sm:p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <Plus size={16} aria-hidden="true" /> New post
              </h2>
              <p className="text-sm text-text-tertiary">
                Posts appear on your public profile and in the Published works feed.
              </p>
              <select
                aria-label="Post type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'blog' | 'published')}
                className="min-h-12 w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="blog">Blog</option>
                <option value="published">Published work</option>
              </select>
              <input
                aria-label="Title"
                autoComplete="off"
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (titleError) setTitleError(null); }}
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? 'ap-title-error' : undefined}
                placeholder="Title"
                className="min-h-12 w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {titleError ? <p id="ap-title-error" role="alert" className="text-sm text-danger -mt-2">{titleError}</p> : null}
              <textarea
                aria-label="Body or excerpt"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Body or excerpt"
                rows={6}
                className="w-full rounded-xl border border-border-primary bg-bg-primary px-4 py-2.5 text-base text-text-primary resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <button
                type="button"
                onClick={handleAddPost}
                disabled={saving}
                className="min-h-11 w-full rounded-xl bg-text-primary px-6 text-sm font-semibold text-bg-primary hover:bg-accent disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Adding…' : 'Add to profile'}
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <BookOpen size={16} aria-hidden="true" /> On your profile ({contentSections.length})
              </h2>
              {contentSections.length === 0 ? (
                <EmptyState title="No posts on your profile yet" hint="Add one with the form above, or publish from Output Studio." />
              ) : (
                contentSections.map((s) => (
                  <PostRow key={s.id} section={s} onDelete={() => handleDeleteSection(s.id)} />
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function PostRow({ section, onDelete }: { section: ProfileSection; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const c = section.content ?? {};
  const url = String(c.url ?? '');
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <span className="text-sm font-medium capitalize text-accent-ink">{section.type}</span>
        <h3 className="text-base font-semibold text-text-primary break-words">{section.title}</h3>
        <p className="text-sm text-text-tertiary line-clamp-2 mt-1">
          {String(c.summary ?? c.body ?? '').slice(0, 120)}
        </p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm text-accent-ink underline underline-offset-2">
            <ExternalLink size={12} aria-hidden="true" /> Open link<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      {confirming ? (
        <div role="group" aria-label={`Confirm removing ${section.title}`} className="flex shrink-0 flex-wrap items-center gap-2">
          <p className="w-full text-sm text-text-secondary sm:text-right">Remove from your public profile?</p>
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-xl border border-border-primary px-4 text-sm font-semibold text-text-primary hover:bg-bg-secondary"
          >
            Keep post
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-bg-primary hover:opacity-90"
          >
            Remove post
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 text-sm font-semibold text-danger hover:bg-danger/5"
          aria-label={`Remove post ${section.title}`}
        >
          <Trash2 size={16} aria-hidden="true" /> Remove
        </button>
      )}
    </Card>
  );
}
