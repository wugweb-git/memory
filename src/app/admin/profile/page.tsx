"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ArrowLeft, Save, Eye, Plus, Trash2, BookOpen, ExternalLink, Loader2,
} from 'lucide-react';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { useProfileEditor } from '@/hooks/useProfileEditor';
import type { ProfileSection } from '@/lib/profile/types';

export default function AdminProfilePage() {
  const {
    profile, sections, loading, saving, saveError,
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
    } catch {
      toast.error(saveError || 'Save failed');
    }
  }

  async function handleAddPost() {
    if (!newTitle.trim()) {
      toast.error('Title required');
      return;
    }
    try {
      await addSection({
        type: newType,
        title: newTitle.trim(),
        content: {
          body: newBody,
          summary: newBody.slice(0, 200),
          source: newType === 'blog' ? 'Blog' : 'Portfolio',
          url: `${IDENTITY_CONFIG.SITE_URL}/p/${IDENTITY_CONFIG.HANDLE}`,
          date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          tags: [],
        },
      });
      toast.success('Post added to profile');
      setNewTitle('');
      setNewBody('');
      refresh();
    } catch {
      toast.error('Could not add post');
    }
  }

  async function handleDeleteSection(id: string) {
    try {
      await removeSection(id);
      toast.success('Removed');
      refresh();
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="text-text-primary">
      <ToastContainer position="bottom-right" theme="light" />
      <header className="border-b border-border-secondary bg-bg-elevated rounded-radius-xl mb-6">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl hover:bg-secondary" aria-label="Back">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-sm font-black  tracking-tight">Profile Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/p/${IDENTITY_CONFIG.HANDLE}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-secondary text-2xs font-bold uppercase"
            >
              <Eye size={14} /> Preview
            </Link>
            <button
              onClick={handleSaveBasic}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-text-primary text-bg-primary text-2xs font-bold uppercase disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex gap-2">
          {(['basic', 'content'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-2xs font-black uppercase tracking-widest border ${
                activeTab === tab
                  ? 'bg-text-primary text-bg-primary border-text-primary'
                  : 'border-border-secondary text-text-tertiary'
              }`}
            >
              {tab === 'basic' ? 'Basic' : 'Blog & Posts'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-text-tertiary" size={32} />
          </div>
        ) : activeTab === 'basic' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="glass-panel rounded-3xl border border-border-secondary p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Identity</h2>
              <label className="block text-2xs font-bold uppercase text-text-tertiary">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-sm"
              />
              <label className="block text-2xs font-bold uppercase text-text-tertiary">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-sm resize-none"
              />
              <label className="block text-2xs font-bold uppercase text-text-tertiary">Avatar URL</label>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-border-secondary bg-bg-primary px-4 py-3 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
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
                alt={displayName}
                className="w-32 h-32 rounded-full object-cover border-4 border-border-secondary mb-4"
              />
              <h2 className="text-2xl font-black ">{displayName}</h2>
              <p className="text-sm text-text-tertiary mt-2 max-w-sm">{bio || 'No bio yet.'}</p>
              <p className="text-2xs text-text-disabled mt-4 font-mono">
                {sections.length} sections · {contentSections.length} posts
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="glass-panel rounded-3xl border border-border-secondary p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary flex items-center gap-2">
                <Plus size={14} /> New post
              </h2>
              <p className="text-xs text-text-tertiary">
                Posts appear on your public profile and in the workspace Published Works feed.
              </p>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'blog' | 'published')}
                className="w-full rounded-2xl border border-border-secondary px-4 py-3 text-sm"
              >
                <option value="blog">Blog</option>
                <option value="published">Published work</option>
              </select>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-2xl border border-border-secondary px-4 py-3 text-sm"
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Body / excerpt"
                rows={6}
                className="w-full rounded-2xl border border-border-secondary px-4 py-3 text-sm resize-none"
              />
              <button
                onClick={handleAddPost}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-text-primary text-bg-primary text-xs font-black uppercase"
              >
                Add to profile
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary flex items-center gap-2">
                <BookOpen size={14} /> On profile ({contentSections.length})
              </h2>
              {contentSections.length === 0 ? (
                <p className="text-sm text-text-tertiary ">No posts yet. Add one above or publish from Output Studio.</p>
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
        <span className="text-2xs font-black uppercase text-accent">{section.type}</span>
        <h3 className="font-bold text-text-primary truncate">{section.title}</h3>
        <p className="text-xs text-text-tertiary line-clamp-2 mt-1">
          {String(c.summary ?? c.body ?? '').slice(0, 120)}
        </p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-2xs text-accent flex items-center gap-1 mt-2">
            <ExternalLink size={10} /> Link
          </a>
        )}
      </div>
      <button
        onClick={onDelete}
        className="p-2 rounded-xl border border-danger/20 text-danger hover:bg-danger/5 shrink-0"
        aria-label="Delete post"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
