/**
 * Demo-grade client-side auth helpers.
 * Stores the session in localStorage (no server round-trip).
 * Replace this module with a real auth provider (Supabase, NextAuth, etc.)
 * without touching any component — all auth calls go through these exports.
 */

import { DEMO_USERS } from "./demo-users";
import { findCaregiverAccount } from "./caregivers";

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

/** First-letter initials from a full name (max two). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function persist(session: SessionUser): SessionUser {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

/**
 * Attempt a login against (1) the seeded demo users, then (2) caregiver
 * accounts created from within a patient's profile. Returns the session on
 * success, null on failure, and persists the session to localStorage.
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

  // 2. Patient-created caregiver accounts.
  const caregiver = findCaregiverAccount(email, password);
  if (caregiver) {
    return persist({
      id: caregiver.id,
      email: caregiver.email,
      name: caregiver.name,
      role: "caregiver",
      initials: initialsOf(caregiver.name),
      avatarHex: "#8a5530",
      linkedPatientId: caregiver.patientUserId,
      linkedPatientName: caregiver.patientName,
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
