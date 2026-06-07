/**
 * Registered-account store — self sign-up for all three roles
 * (patient, practitioner, caretaker). Demo-grade: accounts live in
 * localStorage keyed by lowercased email. Swap this module for a real auth
 * provider (Supabase, NextAuth, …) without touching any component.
 *
 * These accounts are separate from the seeded DEMO_USERS in lib/demo-users.ts.
 * lib/auth.ts checks the demo users first, then this store, on login.
 */

export type AccountRole = "patient" | "practitioner" | "caretaker";

export interface Account {
  id: string;
  email: string; // stored lowercased
  password: string; // plain text — demo only, never sent to a server
  name: string;
  role: AccountRole;
  age?: number;
  initials: string;
  avatarHex: string;
}

const ACCOUNTS_KEY = "qiao:accounts"; // email(lower) -> Account

/** Warm avatar colours, cycled deterministically by account count. */
const AVATAR_COLOURS = ["#a3673a", "#b04f1d", "#7d6c59", "#8a5530", "#c98a2b", "#cf6326"];

/* ── low-level storage ────────────────────────────────────────────── */
function readAccounts(): Record<string, Account> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, Account>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

/* ── helpers ──────────────────────────────────────────────────────── */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `acct-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── public API ───────────────────────────────────────────────────── */

export interface NewAccountInput {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  age?: number;
}

export type RegisterResult =
  | { ok: true; account: Account }
  | { ok: false; error: "email_taken" };

/**
 * Register a new account. Fails if the email is already used by an existing
 * registered account (callers should also guard against seeded demo emails).
 */
export function registerAccount(input: NewAccountInput): RegisterResult {
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts[email]) return { ok: false, error: "email_taken" };

  const account: Account = {
    id: makeId(),
    email,
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    age: input.age,
    initials: initialsOf(input.name),
    avatarHex: AVATAR_COLOURS[Object.keys(accounts).length % AVATAR_COLOURS.length],
  };
  accounts[email] = account;
  writeAccounts(accounts);
  return { ok: true, account };
}

/** Look up an account by email (case-insensitive). */
export function findAccountByEmail(email: string): Account | null {
  return readAccounts()[email.trim().toLowerCase()] ?? null;
}

/** Match a login against the registered accounts. */
export function findAccount(email: string, password: string): Account | null {
  const match = findAccountByEmail(email);
  return match && match.password === password ? match : null;
}
