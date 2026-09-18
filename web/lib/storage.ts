import { openDB } from "idb";
import type { Book } from "@/types/book";
import type { Review } from "@/lib/domain/models";
export type LibraryBook = { key: string; book?: Book; title: string; authors: string; cover?: string; blob: Blob; format?: "epub" | "pdf"; imported: boolean; favorite: boolean; addedAt: number };
export type ReadingProgress = { key: string; chapter: number; cfi?: string; totalChapters?: number; updatedAt: number };
export type LocalMusicTrack = { id: string; title: string; blob: Blob; addedAt: number };
export type RecentlyViewedBook = { authors: string; cover?: string; key: string; title: string; viewedAt: number };

const database = () => openDB("myne-web", 3, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("library")) db.createObjectStore("library", { keyPath: "key" });
    if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "key" });
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    if (!db.objectStoreNames.contains("music")) db.createObjectStore("music", { keyPath: "id" });
    if (!db.objectStoreNames.contains("reviews")) db.createObjectStore("reviews", { keyPath: "id" });
    if (!db.objectStoreNames.contains("recommendations")) db.createObjectStore("recommendations", { keyPath: "id" });
  },
});
export const libraryKey = (id: number) => `gutenberg:${id}`;
export async function listLibrary() { return (await database()).getAll("library") as Promise<LibraryBook[]>; }
export async function getLibrary(key: string) { return (await database()).get("library", key) as Promise<LibraryBook | undefined>; }
export async function saveLibrary(item: LibraryBook) { await (await database()).put("library", item); }
export async function removeLibrary(key: string) { await (await database()).delete("library", key); await (await database()).delete("progress", key); }
export async function saveProgress(progress: ReadingProgress) { await (await database()).put("progress", progress); }
export async function getProgress(key: string) { return (await database()).get("progress", key) as Promise<ReadingProgress | undefined>; }
export async function getSetting<T>(key: string) { return (await database()).get("settings", key) as Promise<T | undefined>; }
export async function saveSetting(key: string, value: unknown) { await (await database()).put("settings", value, key); }
export async function listMusicTracks() { return (await database()).getAll("music") as Promise<LocalMusicTrack[]>; }
export async function saveMusicTrack(track: LocalMusicTrack) { await (await database()).put("music", track); }
export async function removeMusicTrack(id: string) { await (await database()).delete("music", id); }
export async function listReviewRecords() { return (await database()).getAll("reviews") as Promise<Review[]>; }
export async function saveReviewRecord(review: Review) { await (await database()).put("reviews", review); }
export async function deleteReviewRecord(id: string) { await (await database()).delete("reviews", id); }
export async function exportLocalReadingData() {
  const db = await database();
  return {
    exportedAt: new Date().toISOString(),
    library: await db.getAll("library"),
    progress: await db.getAll("progress"),
    recentlyViewed: await db.get("settings", "recently-viewed") || [],
  };
}
export async function clearLocalReadingData() {
  const db = await database();
  await Promise.all([db.clear("library"), db.clear("progress")]);
}
const recentlyViewedKey = "recently-viewed";
export async function saveRecentlyViewed(book: RecentlyViewedBook) {
  const current = await getSetting<RecentlyViewedBook[]>(recentlyViewedKey) || [];
  const next = [book, ...current.filter((item) => item.key !== book.key)].slice(0, 12);
  await saveSetting(recentlyViewedKey, next);
}
export async function listRecentlyViewed() {
  return await getSetting<RecentlyViewedBook[]>(recentlyViewedKey) || [];
}
const readingDaysKey = "reading-days";
const localDay = () => new Date().toLocaleDateString("en-CA");
export async function recordReadingDay() { const today = localDay(); const days = await getSetting<string[]>(readingDaysKey) || []; if (!days.includes(today)) await saveSetting(readingDaysKey, [...days, today].slice(-366)); }
export async function getReadingStreak() { const days = new Set(await getSetting<string[]>(readingDaysKey) || []); const cursor = new Date(); let streak = 0; while (days.has(cursor.toLocaleDateString("en-CA"))) { streak += 1; cursor.setDate(cursor.getDate() - 1); } return { streak, readToday: days.has(localDay()) }; }
