import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import type { User } from "firebase/auth";

export type AccountPreferences = {
  language?: string;
  theme?: "light" | "dark";
  reading?: Record<string, boolean | number | string>;
};

export type UserProfile = {
  accountStatus: "active" | "disabled";
  createdAt?: string;
  displayName: string;
  email: string;
  lastLogin?: string;
  photoURL: string;
  preferences: AccountPreferences;
  // This value is supplied by the backend; Firestore never authorizes access.
  role: "admin" | "user";
  uid: string;
  updatedAt?: string;
  // Local-only reading summaries retained for existing UI compatibility. They
  // are never read from or written to the account document.
  favoriteBookIds: number[];
  purchasedBookIds: number[];
  wishlistBookIds: number[];
  readingStats: { favoritesCount: number; readToday: boolean; savedBooksCount: number; streak: number };
  planType?: string;
  currentStreak?: number;
};

function asTimestamp(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  }
  return undefined;
}

function preferences(value: unknown): AccountPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  const result: AccountPreferences = {};
  if (typeof candidate.language === "string") result.language = candidate.language;
  if (candidate.theme === "light" || candidate.theme === "dark") result.theme = candidate.theme;
  if (candidate.reading && typeof candidate.reading === "object" && !Array.isArray(candidate.reading)) {
    result.reading = candidate.reading as Record<string, boolean | number | string>;
  }
  return result;
}

export function fallbackProfile(user: User): UserProfile {
  return {
    accountStatus: "active",
    displayName: user.displayName || user.email?.split("@")[0] || "Reader",
    email: user.email || "",
    photoURL: user.photoURL || "",
    preferences: {},
    role: "user",
    uid: user.uid,
    favoriteBookIds: [],
    purchasedBookIds: [],
    wishlistBookIds: [],
    readingStats: { favoritesCount: 0, readToday: false, savedBooksCount: 0, streak: 0 },
  };
}

/** Creates or refreshes the non-sensitive account record for a Firebase UID. */
export async function syncUserProfile(db: Firestore, user: User): Promise<UserProfile> {
  const reference = doc(db, "users", user.uid);
  const snapshot = await getDoc(reference);
  const existing = snapshot.exists() ? snapshot.data() : {};
  const fallback = fallbackProfile(user);
  const profile: UserProfile = {
    ...fallback,
    accountStatus: existing.accountStatus === "disabled" ? "disabled" : "active",
    createdAt: asTimestamp(existing.createdAt) ?? asTimestamp(user.metadata.creationTime),
    displayName: typeof existing.displayName === "string" ? existing.displayName : fallback.displayName,
    lastLogin: asTimestamp(existing.lastLogin),
    photoURL: typeof existing.photoURL === "string" ? existing.photoURL : fallback.photoURL,
    preferences: preferences(existing.preferences),
    updatedAt: asTimestamp(existing.updatedAt),
  };

  const base = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || fallback.displayName,
    photoURL: user.photoURL || "",
    lastLogin: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(reference, snapshot.exists()
    ? base
    : { ...base, accountStatus: "active", createdAt: serverTimestamp(), preferences: {} }, { merge: true });
  return profile;
}

export async function updateProfileFields(
  db: Firestore,
  user: User,
  input: Pick<UserProfile, "displayName" | "photoURL" | "preferences">,
): Promise<void> {
  await setDoc(doc(db, "users", user.uid), {
    displayName: input.displayName,
    photoURL: input.photoURL,
    preferences: input.preferences,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
