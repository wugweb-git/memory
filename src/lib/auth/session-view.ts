export type SessionUser = { email: string; role: string };
export type SessionView =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; email: string; role: string; initial: string };

/** Pure mapping from the /api/auth/me result to what the shell may display. */
export function toSessionView(checked: boolean, user: unknown): SessionView {
  if (!checked) return { state: 'loading' };
  const u = user as Partial<SessionUser> | null;
  if (!u || typeof u.email !== 'string' || !u.email.trim()) return { state: 'signed-out' };
  const email = u.email.trim();
  const role = typeof u.role === 'string' && u.role ? u.role : 'user';
  return { state: 'signed-in', email, role, initial: email.charAt(0).toUpperCase() };
}
