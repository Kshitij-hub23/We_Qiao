/**
 * Caretaker links — lets a patient grant a trusted caretaker permission-based,
 * read-only access to their record. Demo-grade: links live in localStorage.
 *
 * A caretaker is an independent account (lib/accounts.ts or a seeded demo user).
 * Patients LINK to an existing caretaker by their account email — no credentials
 * are generated here. One caretaker can be linked to many patients (the reverse
 * index powers the caretaker's patient roster).
 */

import { findAccountByEmail } from "./accounts";
import { DEMO_USERS } from "./demo-users";

export interface CaregiverPermissions {
  profile: boolean; // demographics & contact details
  prescriptions: boolean; // attached prescriptions
  medications: boolean; // current medication schedule (WM + TCM)
  history: boolean; // conditions, allergies, treatment history
}

/** One caretaker's link to one patient (their permissions for THIS patient). */
export interface Caregiver {
  id: string; // link id
  name: string; // caretaker's name (from their account)
  email: string; // caretaker's account email (the link key)
  relationship: string;
  permissions: CaregiverPermissions;
  patientUserId: string; // the patient this link belongs to
  patientName: string;
  addedAt: string; // YYYY-MM-DD
}

export const DEFAULT_PERMISSIONS: CaregiverPermissions = {
  profile: true,
  prescriptions: true,
  medications: true,
  history: true,
};

export const PERMISSION_LABELS: Record<keyof CaregiverPermissions, string> = {
  profile: "Profile & contact details",
  prescriptions: "Prescriptions",
  medications: "Medication schedule",
  history: "Medical history",
};

const LIST_KEY = (patientUserId: string) => `qiao:${patientUserId}:caregivers`;
const REVERSE_KEY = "qiao:caretaker-links"; // email(lower) -> patientUserId[]

/* ── low-level storage ────────────────────────────────────────────── */
function readList(patientUserId: string): Caregiver[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY(patientUserId)) ?? "[]");
  } catch {
    return [];
  }
}

function writeList(patientUserId: string, list: Caregiver[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LIST_KEY(patientUserId), JSON.stringify(list));
  }
}

function readReverse(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(REVERSE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeReverse(index: Record<string, string[]>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REVERSE_KEY, JSON.stringify(index));
  }
}

function addReverse(email: string, patientUserId: string): void {
  const index = readReverse();
  const ids = new Set(index[email] ?? []);
  ids.add(patientUserId);
  index[email] = [...ids];
  writeReverse(index);
}

function removeReverse(email: string, patientUserId: string): void {
  const index = readReverse();
  index[email] = (index[email] ?? []).filter((id) => id !== patientUserId);
  if (index[email].length === 0) delete index[email];
  writeReverse(index);
}

/* ── helpers ──────────────────────────────────────────────────────── */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lnk-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Resolve a caretaker account by email: registered accounts, then demo users. */
export function resolveCaretaker(
  email: string,
): { id: string; name: string; email: string } | null {
  const lower = email.trim().toLowerCase();
  const account = findAccountByEmail(lower);
  if (account && account.role === "caretaker") {
    return { id: account.id, name: account.name, email: account.email };
  }
  const demo = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === lower && u.role === "caretaker",
  );
  if (demo) return { id: demo.id, name: demo.name, email: demo.email.toLowerCase() };
  return null;
}

/* ── demo seed ────────────────────────────────────────────────────── */
const SEED_FLAG = "qiao:caretaker-links-seeded";

/**
 * Seed one demo link so the caretaker roster isn't empty on first load:
 * James Wong (u2, james@demo.qiao) is a linked caretaker for Eleanor Chen (u1).
 * Idempotent — runs once, then a flag short-circuits it.
 */
function ensureSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_FLAG)) return;
  localStorage.setItem(SEED_FLAG, "1");

  const email = "james@demo.qiao";
  if (readList("u1").some((c) => c.email === email)) return;

  const link: Caregiver = {
    id: makeId(),
    name: "James Wong",
    email,
    relationship: "Son-in-law / caretaker",
    permissions: { ...DEFAULT_PERMISSIONS },
    patientUserId: "u1",
    patientName: "Eleanor Chen",
    addedAt: "2026-01-12",
  };
  writeList("u1", [...readList("u1"), link]);
  addReverse(email, "u1");
}

/* ── public API ───────────────────────────────────────────────────── */

/** All caretakers linked to a patient. */
export function getCaregivers(patientUserId: string): Caregiver[] {
  ensureSeed();
  return readList(patientUserId);
}

export interface LinkCaregiverInput {
  email: string;
  relationship: string;
  permissions: CaregiverPermissions;
}

export type LinkResult =
  | { ok: true; caregiver: Caregiver }
  | { ok: false; error: "not_found" | "already_linked" };

/**
 * Link an EXISTING caretaker account to a patient by the caretaker's email.
 * No credentials are generated — the caretaker must already have an account.
 */
export function linkCaregiver(
  patientUserId: string,
  patientName: string,
  input: LinkCaregiverInput,
): LinkResult {
  const caretaker = resolveCaretaker(input.email);
  if (!caretaker) return { ok: false, error: "not_found" };

  const list = readList(patientUserId);
  if (list.some((c) => c.email === caretaker.email)) {
    return { ok: false, error: "already_linked" };
  }

  const caregiver: Caregiver = {
    id: makeId(),
    name: caretaker.name,
    email: caretaker.email,
    relationship: input.relationship.trim(),
    permissions: input.permissions,
    patientUserId,
    patientName,
    addedAt: today(),
  };

  writeList(patientUserId, [...list, caregiver]);
  addReverse(caretaker.email, patientUserId);
  return { ok: true, caregiver };
}

/** Update a caretaker's permission flags for this patient. Returns the list. */
export function updateCaregiverPermissions(
  patientUserId: string,
  caregiverId: string,
  permissions: CaregiverPermissions,
): Caregiver[] {
  const list = readList(patientUserId).map((c) =>
    c.id === caregiverId ? { ...c, permissions } : c,
  );
  writeList(patientUserId, list);
  return list;
}

/** Unlink a caretaker from this patient (the caretaker account is untouched). */
export function removeCaregiver(
  patientUserId: string,
  caregiverId: string,
): Caregiver[] {
  const list = readList(patientUserId);
  const target = list.find((c) => c.id === caregiverId);
  const remaining = list.filter((c) => c.id !== caregiverId);
  writeList(patientUserId, remaining);
  if (target) removeReverse(target.email, patientUserId);
  return remaining;
}

/** The patient user-ids a caretaker is linked to (their roster). */
export function getCaretakerPatientIds(email: string): string[] {
  ensureSeed();
  return readReverse()[email.trim().toLowerCase()] ?? [];
}

/** This caretaker's permissions for a specific patient, or null if not linked. */
export function getCaretakerPermissions(
  patientUserId: string,
  email: string,
): CaregiverPermissions | null {
  const lower = email.trim().toLowerCase();
  return readList(patientUserId).find((c) => c.email === lower)?.permissions ?? null;
}
