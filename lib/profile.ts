/**
 * Patient profile data layer — the complete patient record behind "My Profile".
 * Persisted in localStorage, namespaced by user ID. Swap the storage calls for
 * real API calls later without changing any component.
 */

export interface PatientProfile {
  /** System-generated, permanent, immutable unique identifier (e.g. PAT-2026-000123). */
  patientId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  email: string;
  phone: string;
  address: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  insuranceProvider: string;
  insurancePolicyNo: string;
  registrationDate: string; // YYYY-MM-DD — set once, never edited
}

/** Fields the user is allowed to edit (everything except the immutable identifiers). */
export type EditableProfile = Omit<
  PatientProfile,
  "patientId" | "registrationDate"
>;

const PROFILE_KEY = (userId: string) => `qiao:${userId}:profile`;
const COUNTER_KEY = "qiao:patient-counter";

/* ── Seeded demo profiles ─────────────────────────────────────────── */
const SEED: Record<string, PatientProfile> = {
  u1: {
    patientId: "PAT-2026-000001",
    fullName: "Eleanor Chen",
    dateOfBirth: "1953-09-14",
    gender: "Female",
    email: "eleanor@demo.qiao",
    phone: "+852 9123 4567",
    address: "Flat 12B, Sunrise Court, North Point, Hong Kong",
    bloodGroup: "O+",
    emergencyContactName: "James Wong",
    emergencyContactPhone: "+852 9876 5432",
    emergencyContactRelation: "Son-in-law / caretaker",
    insuranceProvider: "Bupa HK",
    insurancePolicyNo: "BUPA-HK-77421900",
    registrationDate: "2026-01-12",
  },
  u2: {
    patientId: "PAT-2026-000002",
    fullName: "James Wong",
    dateOfBirth: "1981-03-22",
    gender: "Male",
    email: "james@demo.qiao",
    phone: "+852 9876 5432",
    address: "Flat 5A, Harbour Heights, Quarry Bay, Hong Kong",
    bloodGroup: "A+",
    emergencyContactName: "Eleanor Chen",
    emergencyContactPhone: "+852 9123 4567",
    emergencyContactRelation: "Mother-in-law",
    insuranceProvider: "AIA",
    insurancePolicyNo: "AIA-HK-30551204",
    registrationDate: "2026-01-12",
  },
  u3: {
    patientId: "PAT-2026-000003",
    fullName: "Dr. Liu Wei",
    dateOfBirth: "1974-06-08",
    gender: "Male",
    email: "dr.liu@demo.qiao",
    phone: "+852 9000 1122",
    address: "Hong Kong Chinese Medicine Hospital, Tseung Kwan O",
    bloodGroup: "B+",
    emergencyContactName: "-",
    emergencyContactPhone: "-",
    emergencyContactRelation: "-",
    insuranceProvider: "-",
    insurancePolicyNo: "-",
    registrationDate: "2026-01-10",
  },
  // Additional patients managed by Dr. Liu (doctor portal demo roster).
  p2: {
    patientId: "PAT-2026-000004",
    fullName: "Tan Wei-Ming",
    dateOfBirth: "1957-11-02",
    gender: "Male",
    email: "tan@demo.qiao",
    phone: "+852 9211 0044",
    address: "Flat 9C, Garden Estate, Sha Tin, Hong Kong",
    bloodGroup: "B+",
    emergencyContactName: "Tan Siu-Ling",
    emergencyContactPhone: "+852 9211 0055",
    emergencyContactRelation: "Daughter",
    insuranceProvider: "Bupa HK",
    insurancePolicyNo: "BUPA-HK-55120388",
    registrationDate: "2026-01-15",
  },
  p3: {
    patientId: "PAT-2026-000005",
    fullName: "Lai Mei-Fong",
    dateOfBirth: "1950-04-19",
    gender: "Female",
    email: "lai@demo.qiao",
    phone: "+852 9330 7788",
    address: "Flat 2B, Phoenix Court, Kowloon City, Hong Kong",
    bloodGroup: "A+",
    emergencyContactName: "Lai Chun-Hei",
    emergencyContactPhone: "+852 9330 7799",
    emergencyContactRelation: "Son",
    insuranceProvider: "AIA",
    insurancePolicyNo: "AIA-HK-77451209",
    registrationDate: "2026-01-18",
  },
  p4: {
    patientId: "PAT-2026-000006",
    fullName: "Cheung Kwok-Wah",
    dateOfBirth: "1944-08-30",
    gender: "Male",
    email: "cheung@demo.qiao",
    phone: "+852 9456 1122",
    address: "Flat 14A, Seaview Mansion, Aberdeen, Hong Kong",
    bloodGroup: "O+",
    emergencyContactName: "Cheung Lai-Yee",
    emergencyContactPhone: "+852 9456 1133",
    emergencyContactRelation: "Spouse",
    insuranceProvider: "-",
    insurancePolicyNo: "-",
    registrationDate: "2026-01-20",
  },
};

/** Next sequential Patient ID for users without a seeded one. */
function nextPatientId(): string {
  if (typeof window === "undefined") return "PAT-2026-000000";
  const n = parseInt(localStorage.getItem(COUNTER_KEY) ?? "100", 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  return `PAT-2026-${String(n).padStart(6, "0")}`;
}

/** A blank profile for a brand-new user (Patient ID generated once). */
function blankProfile(email: string, name: string): PatientProfile {
  return {
    patientId: nextPatientId(),
    fullName: name,
    dateOfBirth: "",
    gender: "",
    email,
    phone: "",
    address: "",
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    insuranceProvider: "",
    insurancePolicyNo: "",
    registrationDate: "2026-01-01",
  };
}

/**
 * Load a user's profile. Seeds demo users / generates a Patient ID on first
 * access, then persists so the ID stays immutable forever after.
 */
export function getProfile(
  userId: string,
  fallback?: { email: string; name: string },
): PatientProfile {
  if (typeof window === "undefined") {
    return SEED[userId] ?? blankProfile(fallback?.email ?? "", fallback?.name ?? "");
  }
  const raw = localStorage.getItem(PROFILE_KEY(userId));
  if (raw) {
    try {
      return JSON.parse(raw) as PatientProfile;
    } catch {
      /* fall through to (re)seed */
    }
  }
  const seeded =
    SEED[userId] ?? blankProfile(fallback?.email ?? "", fallback?.name ?? "");
  localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(seeded));
  return seeded;
}

/**
 * Persist edits to the mutable fields. The Patient ID and registration date are
 * always carried over from the stored record — they can never be changed here.
 */
export function updateProfile(
  userId: string,
  edits: Partial<EditableProfile>,
): PatientProfile {
  const current = getProfile(userId);
  const updated: PatientProfile = {
    ...current,
    ...edits,
    patientId: current.patientId, // immutable
    registrationDate: current.registrationDate, // immutable
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(updated));
  }
  return updated;
}
