"use client";

import React, { useEffect, useState } from 'react';
import { Lock, LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { IDENTITY_CONFIG } from '@/config/identity';
import { toast } from 'react-toastify';

type SessionUser = {
  id: string;
  email: string;
  role: string;
};

export const AuthPanel = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem(IDENTITY_CONFIG.STORAGE_KEY_USER_ID, data.user.id);
      setUser(data.user);
      toast.success('Session linked.');
      setPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      localStorage.setItem(IDENTITY_CONFIG.STORAGE_KEY_USER_ID, data.user.id);
      setUser(data.user);
      toast.success('Account created.');
      setPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem(IDENTITY_CONFIG.STORAGE_KEY_USER_ID);
    setUser(null);
    toast.info('Signed out.');
  };

  if (checking) {
    return (
      <div className="glass-panel rounded-[2rem] border border-border-secondary p-8 flex justify-center">
        <Loader2 className="animate-spin text-text-tertiary" size={24} />
      </div>
    );
  }

  if (user) {
    return (
      <div className="glass-panel rounded-[2rem] border border-border-secondary p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
            <User size={18} className="text-success" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">{user.email}</p>
            <p className="text-2xs text-text-tertiary uppercase tracking-widest">Role: {user.role}</p>
          </div>
        </div>
        {user.role === 'admin' && (
          <a
            href="/admin"
            className="block text-center text-2xs font-black uppercase tracking-widest text-accent hover:underline"
          >
            Open Admin Console
          </a>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border-secondary text-text-tertiary hover:text-danger hover:border-danger/30 transition-colors text-2xs font-black uppercase tracking-widest"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={login} className="glass-panel rounded-[2rem] border border-border-secondary p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Lock size={18} className="text-accent" />
        <p className="text-sm font-bold text-text-primary">Sign in to sync your identity</p>
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full px-4 py-3 rounded-xl border border-border-secondary bg-bg-secondary text-sm text-text-primary focus:border-accent/40 outline-none"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (8+ characters)"
        required
        minLength={8}
        className="w-full px-4 py-3 rounded-xl border border-border-secondary bg-bg-secondary text-sm text-text-primary focus:border-accent/40 outline-none"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-text-primary text-bg-primary text-2xs font-black uppercase tracking-widest disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
          Sign in
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={signup}
          className="flex-1 py-3 rounded-xl border border-border-secondary text-2xs font-black uppercase tracking-widest text-text-tertiary hover:border-accent/30 transition-colors"
        >
          Sign up
        </button>
      </div>
    </form>
  );
};
