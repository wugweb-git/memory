"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AppToastContainer } from "@/app/component/AppToastContainer";
import 'react-toastify/dist/ReactToastify.css';
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
      toast.success('Post added to profile');
      setNewTitle('');
      setNewBody('');
      refresh();
    } catch {
      toast.error('Could not add the post. Check your connection and try again.');
    }
  }

  async function handleDeleteSection(id: string) {
    if (!window.confirm('Remove this post from your public profile?')) return;
    try {
      await removeSection(id);
      toast.success('Removed');
      refresh();
    } catch {
      toast.error('Could not remove the post. Try again.');
    }
  }

  return (
    <div className="text-text-primary">
      <AppToastContainer position="bottom-right" theme="light" />
      <header className="border-b border-border-secondary bg-bg-elevated rounded-radius-xl mb-6">
        <div className="max-w-5xl mx-auto px-4 min-h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl hover:bg-bg-secondary" aria-label="Back to admin console">
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <h1 className="text-sm font-black tracking-tight">Profile editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/p/${IDENTITY_CONFIG.HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-xl border border-border-secondary text-xs font-bold"
            >
              <Eye size={14} aria-hidden="true" /> Preview profile<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            <button
              onClick={handleSaveBasic}
              disabled={saving || loading}
              type="button"
              className="flex items-center gap-1.5 min-h-11 px-4 py-1.5 rounded-xl bg-text-primary text-bg-primary text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Save size={14} aria-hidden="true" />}
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
              className={`min-h-11 px-4 py-2 rounded-full text-xs font-bold border ${
                activeTab === tab
                  ? 'bg-text-primary text-bg-primary border-text-primary'
                  : 'border-border-secondary text-text-tertiary'
              }`}
            >
              {tab === 'basic' ? 'Basic' : 'Blog and posts'}
            </button>
          ))}
        </div>

        {loadError && !loading ? (
          <div role="alert" className="rounded-2xl border border-danger p-4 text-sm text-danger flex items-center justify-between gap-3">
            <span>Could not load the profile: {String(loadError)}</span>
            <button type="button" onClick={() => refresh()} className="min-h-11 px-3 text-xs font-bold text-accent">Retry</button>
          </div>
        ) : loading ? (
          <div role="status" className="flex flex-col items-center gap-2 py-20">
            <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none text-text-tertiary" size={32} />
            <span className="text-sm text-text-tertiary">Loading profile…</span>
          </div>
        ) : activeTab === 'basic' ? (
          <div role="tabpanel" id="ap-panel-basic" aria-labelledby="ap-tab-basic" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="glass-panel rounded-3xl border border-border-secondary p-6 space-y-4">
              <h2 className="text-sm font-bold text-text-secondary">Identity</h2>
              <label htmlFor="ap-name" className="block text-xs font-bold text-text-secondary">Display name</label>
              <input
                id="ap-name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm"
              />
              <label htmlFor="ap-bio" className="block text-xs font-bold text-text-secondary">Bio</label>
              <textarea
                id="ap-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm resize-none"
              />
              <label htmlFor="ap-avatar" className="block text-xs font-bold text-text-secondary">Avatar URL</label>
              <input
                id="ap-avatar"
                type="url"
                inputMode="url"
                autoComplete="photo"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm"
              />
              <label className="flex items-center gap-3 text-sm min-h-11">
                <input
                  className="w-5 h-5"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>Public profile visible at /p/{IDENTITY_CONFIG.HANDLE}</span>
              </label>
            </section>

            <section className="glass-panel rounded-3xl border border-border-secondary p-6 flex flex-col items-center text-center">
              <img
                src={avatarUrl || avatarFallbackUrl(200)}
                alt={`Avatar preview for ${displayName}`}
                className="w-32 h-32 rounded-full object-cover border-4 border-border-secondary mb-4"
              />
              <h2 className="text-2xl font-black">{displayName}</h2>
              <p className="text-sm text-text-tertiary mt-2 max-w-sm">{bio || 'No bio yet.'}</p>
              <p className="text-2xs text-text-tertiary mt-4 font-mono">
                {sections.length} sections, {contentSections.length} posts
              </p>
            </section>
          </div>
        ) : (
          <div role="tabpanel" id="ap-panel-content" aria-labelledby="ap-tab-content" className="space-y-8">
            <section className="glass-panel rounded-3xl border border-border-secondary p-6 space-y-4">
              <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2">
                <Plus size={14} aria-hidden="true" /> New post
              </h2>
              <p className="text-xs text-text-tertiary">
                Posts appear on your public profile and in the workspace Published Works feed.
              </p>
              <select
                aria-label="Post type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'blog' | 'published')}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm"
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
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm"
              />
              {titleError ? <p id="ap-title-error" role="alert" className="text-xs text-danger -mt-2">{titleError}</p> : null}
              <textarea
                aria-label="Body or excerpt"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Body or excerpt"
                rows={6}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-base sm:text-sm resize-none"
              />
              <button
                type="button"
                onClick={handleAddPost}
                disabled={saving}
                className="min-h-11 px-6 py-3 rounded-xl bg-text-primary text-bg-primary text-xs font-bold disabled:opacity-50"
              >
                Add to profile
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-text-secondary flex items-center gap-2">
                <BookOpen size={14} aria-hidden="true" /> On profile ({contentSections.length})
              </h2>
              {contentSections.length === 0 ? (
                <p className="text-sm text-text-tertiary">No posts yet. Add one above or publish from Output Studio.</p>
              ) : (
                contentSections.map((s) => (
                  <PostRow key={s.id} section={s} onDelete={() => handleDeleteSection(s.id)} />
                ))
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function PostRow({ section, onDelete }: { section: ProfileSection; onDelete: () => void }) {
  const c = section.content ?? {};
  const url = String(c.url ?? '');
  return (
    <div className="glass-panel rounded-2xl border border-border-secondary p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-2xs font-bold uppercase text-accent">{section.type}</span>
        <h3 className="font-bold text-text-primary truncate">{section.title}</h3>
        <p className="text-xs text-text-tertiary line-clamp-2 mt-1">
          {String(c.summary ?? c.body ?? '').slice(0, 120)}
        </p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent inline-flex items-center gap-1 mt-2 min-h-6">
            <ExternalLink size={12} aria-hidden="true" /> View link<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-danger/20 text-danger hover:bg-danger/5 shrink-0"
        aria-label={`Delete post: ${section.title}`}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
