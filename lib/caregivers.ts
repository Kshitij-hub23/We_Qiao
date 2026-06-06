/**
 * Caregiver management — lets a patient grant trusted people permission-based
 * access to their record. Demo-grade: caregiver accounts + credentials live in
 * localStorage. The permission flags are the seam for future role restrictions.
 */

export interface CaregiverPermissions {
  profile: boolean; // demographics & contact details
  prescriptions: boolean; // attached prescriptions
  medications: boolean; // current medication schedule (WM + TCM)
  history: boolean; // conditions, allergies, treatment history
}

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  relationship: string;
  password: string; // generated demo credential, shown once on creation
  permissions: CaregiverPermissions;
  patientUserId: string; // the patient's *user* id this caregiver is linked to
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
const ACCOUNTS_KEY = "qiao:caregiver-accounts"; // email(lower) -> Caregiver

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

function readAccounts(): Record<string, Caregiver> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, Caregiver>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

/* ── helpers ──────────────────────────────────────────────────────── */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cg-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** A readable temporary password the patient can hand to the caregiver. */
function makePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `care-${out}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── public API ───────────────────────────────────────────────────── */

/** All caregivers linked to a patient. */
export function getCaregivers(patientUserId: string): Caregiver[] {
  return readList(patientUserId);
}

export interface NewCaregiverInput {
  name: string;
  email: string;
  relationship: string;
  permissions: CaregiverPermissions;
}

/**
 * Invite + link a caregiver: generates a credential, registers the account so
 * the caregiver can log in, and links it to the patient. Returns the created
 * record (including the one-time password to show the patient).
 */
export function addCaregiver(
  patientUserId: string,
  patientName: string,
  input: NewCaregiverInput,
): Caregiver {
  const caregiver: Caregiver = {
    id: makeId(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    relationship: input.relationship.trim(),
    password: makePassword(),
    permissions: input.permissions,
    patientUserId,
    patientName,
    addedAt: today(),
  };

  writeList(patientUserId, [...readList(patientUserId), caregiver]);

  const accounts = readAccounts();
  accounts[caregiver.email] = caregiver;
  writeAccounts(accounts);

  return caregiver;
}

/** Update a caregiver's permission flags. Returns the updated list. */
export function updateCaregiverPermissions(
  patientUserId: string,
  caregiverId: string,
  permissions: CaregiverPermissions,
): Caregiver[] {
  const list = readList(patientUserId).map((c) =>
    c.id === caregiverId ? { ...c, permissions } : c,
  );
  writeList(patientUserId, list);

  // Keep the login account record in sync.
  const target = list.find((c) => c.id === caregiverId);
  if (target) {
    const accounts = readAccounts();
    accounts[target.email] = target;
    writeAccounts(accounts);
  }
  return list;
}

/** Revoke a caregiver: removes the link and the login account. */
export function removeCaregiver(
  patientUserId: string,
  caregiverId: string,
): Caregiver[] {
  const list = readList(patientUserId);
  const target = list.find((c) => c.id === caregiverId);
  const remaining = list.filter((c) => c.id !== caregiverId);
  writeList(patientUserId, remaining);

  if (target) {
    const accounts = readAccounts();
    delete accounts[target.email];
    writeAccounts(accounts);
  }
  return remaining;
}

/** Match a caregiver login. Returns the account or null. */
export function findCaregiverAccount(
  email: string,
  password: string,
): Caregiver | null {
  const accounts = readAccounts();
  const match = accounts[email.trim().toLowerCase()];
  return match && match.password === password ? match : null;
}
