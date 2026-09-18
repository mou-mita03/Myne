const key = "myne-recent-searches";
const limit = 6;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const values = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  } catch { return []; }
}

export function rememberSearch(query: string): string[] {
  const cleaned = query.trim();
  if (!cleaned) return getRecentSearches();
  const next = [cleaned, ...getRecentSearches().filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, limit);
  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function clearRecentSearches() {
  window.localStorage.removeItem(key);
}
