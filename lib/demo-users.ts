/**
 * Seeded demo users for the Qiáo prototype.
 * Demo-grade auth only — passwords are plain strings, never persisted to a server.
 * Real auth (Supabase or similar) is a drop-in replacement for this file.
 */

export interface DemoUser {
  id: string;
  email: string;
  password: string; // plain text — demo only, never sent to a server
  name: string;
  age: number;
  role: "patient" | "caretaker" | "practitioner";
  initials: string;
  avatarHex: string; // background colour for the initials avatar
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u1",
    email: "eleanor@demo.qiao",
    password: "demo123",
    name: "Eleanor Chen",
    age: 72,
    role: "patient",
    initials: "EC",
    avatarHex: "#a3673a",
  },
  {
    id: "u2",
    email: "james@demo.qiao",
    password: "demo123",
    name: "James Wong",
    age: 45,
    role: "caretaker",
    initials: "JW",
    avatarHex: "#cf6326",
  },
  {
    id: "u3",
    email: "dr.liu@demo.qiao",
    password: "demo123",
    name: "Dr. Liu Wei",
    age: 52,
    role: "practitioner",
    initials: "LW",
    avatarHex: "#7d6c59",
  },
];
