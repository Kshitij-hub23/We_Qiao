/**
 * Per-user health record helpers — diseases, western medicines, TCM medicines.
 * Persisted in localStorage, namespaced by user ID.
 *
 * Replace the localStorage calls with API calls when a real backend lands;
 * the function signatures stay the same so no component needs to change.
 */

export type RecordKind = "diseases" | "western" | "eastern";

function storageKey(userId: string, kind: RecordKind): string {
  return `qiao:${userId}:${kind}`;
}

function loadList(k: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(k) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveList(k: string, items: string[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(k, JSON.stringify(items));
  }
}

/** Return the full list for a given kind. */
export function getItems(userId: string, kind: RecordKind): string[] {
  return loadList(storageKey(userId, kind));
}

/**
 * Add an item to a list. Silently skips duplicates (case-insensitive).
 * Returns the updated list.
 */
export function addItem(
  userId: string,
  kind: RecordKind,
  item: string,
): string[] {
  const trimmed = item.trim();
  if (!trimmed) return getItems(userId, kind);
  const current = loadList(storageKey(userId, kind));
  if (current.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
    return current;
  }
  const updated = [...current, trimmed];
  saveList(storageKey(userId, kind), updated);
  return updated;
}

/**
 * Remove an item from a list (exact string match).
 * Returns the updated list.
 */
export function removeItem(
  userId: string,
  kind: RecordKind,
  item: string,
): string[] {
  const current = loadList(storageKey(userId, kind));
  const updated = current.filter((i) => i !== item);
  saveList(storageKey(userId, kind), updated);
  return updated;
}

/**
 * Seed a user's lists with starter data if they are completely empty.
 * Used to make the demo feel populated on first login.
 */
export function seedIfEmpty(
  userId: string,
  seed: { diseases: string[]; western: string[]; eastern: string[] },
): void {
  if (getItems(userId, "diseases").length === 0) {
    saveList(storageKey(userId, "diseases"), seed.diseases);
  }
  if (getItems(userId, "western").length === 0) {
    saveList(storageKey(userId, "western"), seed.western);
  }
  if (getItems(userId, "eastern").length === 0) {
    saveList(storageKey(userId, "eastern"), seed.eastern);
  }
}
