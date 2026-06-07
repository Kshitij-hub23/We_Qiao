/**
 * Doctor → patients roster for the practitioner portal (demo).
 *
 * A doctor manages many patients. The patients' clinical data lives in the same
 * localStorage layer the patient portal uses (lib/profile.ts + lib/user-records.ts),
 * keyed by the patient's user id — so when a doctor edits a record here it is the
 * SAME data the patient sees when they log in.
 */

import { getProfile } from "./profile";
import { getItems, addItem } from "./user-records";
import { getCaretakerPatientIds } from "./caregivers";

/** Which patient user-ids each doctor manages. Demo: Dr. Liu (u3) sees everyone. */
const ROSTER: Record<string, string[]> = {
  u3: ["u1", "p2", "p3", "p4"],
};

/** Starter clinical records per patient (seeded once if their lists are empty). */
const RECORD_SEED: Record<
  string,
  { diseases: string[]; western: string[]; eastern: string[]; allergies: string[] }
> = {
  u1: {
    diseases: ["Atrial fibrillation", "Type 2 diabetes", "Hypertension"],
    western: ["Warfarin", "Metformin", "Amlodipine"],
    eastern: ["Danshen", "Dong quai"],
    allergies: ["Penicillin", "Sulfa drugs"],
  },
  p2: {
    diseases: ["Hypertension", "Chronic kidney disease"],
    western: ["Lisinopril", "Furosemide"],
    eastern: ["Huang qi", "Ginseng"],
    allergies: [],
  },
  p3: {
    diseases: ["Osteoarthritis", "High cholesterol"],
    western: ["Atorvastatin", "Ibuprofen"],
    eastern: ["Ginkgo", "Gan cao"],
    allergies: ["Aspirin"],
  },
  p4: {
    diseases: ["Atrial fibrillation", "Type 2 diabetes"],
    western: ["Aspirin", "Metformin"],
    eastern: ["Danshen", "Ginkgo"],
    allergies: [],
  },
};

/** Warm avatar colours, assigned per patient for the roster UI. */
const AVATAR_COLOURS = ["#a3673a", "#b04f1d", "#7d6c59", "#8a5530", "#c98a2b"];

export interface RosterPatient {
  userId: string;
  name: string;
  patientId: string;
  age: number;
  initials: string;
  avatarHex: string;
  conditionCount: number;
  medicineCount: number;
}

function ageFromDob(dob: string): number {
  if (!dob) return 0;
  // Demo "today" anchor (avoids depending on the real clock for a stable number).
  const today = new Date("2026-06-06T00:00:00");
  const born = new Date(dob + "T00:00:00");
  if (isNaN(born.getTime())) return 0;
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Seed a patient's clinical lists once (no-op if they already have data). */
export function ensurePatientSeeded(userId: string): void {
  const seed = RECORD_SEED[userId];
  if (!seed) return;
  if (getItems(userId, "diseases").length === 0) seed.diseases.forEach((d) => addItem(userId, "diseases", d));
  if (getItems(userId, "western").length === 0) seed.western.forEach((d) => addItem(userId, "western", d));
  if (getItems(userId, "eastern").length === 0) seed.eastern.forEach((d) => addItem(userId, "eastern", d));
  if (getItems(userId, "allergies").length === 0) seed.allergies.forEach((d) => addItem(userId, "allergies", d));
}

/** Is this patient managed by this doctor? (used to authorize the detail page) */
export function isPatientOfDoctor(doctorId: string, patientUserId: string): boolean {
  return (ROSTER[doctorId] ?? []).includes(patientUserId);
}

/** Summarize a list of patient user-ids into roster cards. */
function summarizePatients(ids: string[]): RosterPatient[] {
  return ids.map((userId, i) => {
    ensurePatientSeeded(userId);
    const p = getProfile(userId);
    return {
      userId,
      name: p.fullName,
      patientId: p.patientId,
      age: ageFromDob(p.dateOfBirth),
      initials: initialsOf(p.fullName),
      avatarHex: AVATAR_COLOURS[i % AVATAR_COLOURS.length],
      conditionCount: getItems(userId, "diseases").length,
      medicineCount: getItems(userId, "western").length + getItems(userId, "eastern").length,
    };
  });
}

/**
 * The doctor's patient list, seeded and summarized for the roster UI.
 * Reads each patient's profile + record counts from localStorage.
 */
export function getDoctorPatients(doctorId: string): RosterPatient[] {
  return summarizePatients(ROSTER[doctorId] ?? []);
}

/** Is this patient linked to this caretaker? (authorizes the detail page) */
export function isPatientOfCaretaker(email: string, patientUserId: string): boolean {
  return getCaretakerPatientIds(email).includes(patientUserId);
}

/**
 * The caretaker's patient list, summarized for the roster UI. Driven by the
 * patient→caretaker links (lib/caregivers.ts), keyed by the caretaker's email.
 */
export function getCaretakerPatients(email: string): RosterPatient[] {
  return summarizePatients(getCaretakerPatientIds(email));
}
