/**
 * Demo-grade client-side auth helpers.
 * Stores the session in localStorage (no server round-trip).
 * Replace this module with a real auth provider (Supabase, NextAuth, etc.)
 * without touching any component — all auth calls go through these exports.
 */

import { DEMO_USERS, type DemoUser } from "./demo-users";

const SESSION_KEY = "qiao:session";

/** The shape stored in localStorage and passed to components. */
export type SessionUser = Omit<DemoUser, "password">;

/**
 * Attempt a login. Returns the session user on success, null on failure.
 * On success, persists the session to localStorage.
 */
export function login(email: string, password: string): SessionUser | null {
  const user = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password,
  );
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...session } = user;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

/** Clear the session from localStorage. */
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Read the current session from localStorage.
 * Returns null when called on the server or when no session exists.
 */
export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
