/**
 * Demo-grade client-side auth helpers.
 * Stores the session in localStorage (no server round-trip).
 * Replace this module with a real auth provider (Supabase, NextAuth, etc.)
 * without touching any component — all auth calls go through these exports.
 */

import { DEMO_USERS } from "./demo-users";
import { findAccount } from "./accounts";

const SESSION_KEY = "qiao:session";

export type Role = "patient" | "caretaker" | "practitioner" | "caregiver";

/** The shape stored in localStorage and passed to components. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  age?: number;
  role: Role;
  initials: string;
  avatarHex: string;
  /** For caregivers: the *user id* of the patient they may view. */
  linkedPatientId?: string;
  linkedPatientName?: string;
}

/**
 * The home/landing route for a role — where login lands the user and where the
 * Qiáo logo should return them. Keep this the single source of truth so the nav
 * logo and the post-login redirect never drift apart.
 */
export function landingFor(user: Pick<SessionUser, "role">): string {
  if (user.role === "caretaker" || user.role === "caregiver") return "/caregiver";
  if (user.role === "practitioner") return "/doctor";
  return "/dashboard";
}

function persist(session: SessionUser): SessionUser {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

/**
 * Attempt a login against (1) the seeded demo users, then (2) self-registered
 * accounts (lib/accounts.ts). Returns the session on success, null on failure,
 * and persists the session to localStorage.
 */
export function login(email: string, password: string): SessionUser | null {
  // 1. Seeded demo users.
  const demo = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password,
  );
  if (demo) {
    return persist({
      id: demo.id,
      email: demo.email,
      name: demo.name,
      age: demo.age,
      role: demo.role,
      initials: demo.initials,
      avatarHex: demo.avatarHex,
    });
  }

  // 2. Self-registered accounts (patient / practitioner / caretaker).
  const account = findAccount(email, password);
  if (account) {
    return persist({
      id: account.id,
      email: account.email,
      name: account.name,
      age: account.age,
      role: account.role,
      initials: account.initials,
      avatarHex: account.avatarHex,
    });
  }

  return null;
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
