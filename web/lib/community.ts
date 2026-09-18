import { getSetting, saveSetting } from "@/lib/storage";
import type { Review } from "@/lib/domain/models";
import { localReviewRepository } from "@/lib/repositories/local-review-repository";

export type LocalReview = {
  bookId: number;
  createdAt: number;
  id: string;
  note: string;
  rating: number;
};

export type ReadingChallenge = {
  goalBooks: number;
  completedBooks: number;
};

const reviewKey = (bookId: number) => `reviews:${bookId}`;
const challengeKey = "reading-challenge";

export async function listReviews(bookId: number) {
  const reviews = await localReviewRepository.listForBook(String(bookId));
  if (reviews.length) return reviews.map((review) => ({ bookId, createdAt: new Date(review.createdAt).getTime(), id: review.id, note: review.body, rating: review.rating }));
  // Preserve reviews saved before the v3 IndexedDB migration.
  return (await getSetting<LocalReview[]>(reviewKey(bookId))) || [];
}

export async function saveReview(bookId: number, rating: number, note: string) {
  const current = await listReviews(bookId);
  const existing = current[0];
  const now = new Date().toISOString();
  const review: Review = { id: existing?.id || crypto.randomUUID(), userId: "local-reader", bookId: String(bookId), rating: Math.max(1, Math.min(5, rating)) as Review["rating"], body: note.trim(), verifiedPurchase: false, createdAt: existing ? new Date(existing.createdAt).toISOString() : now, updatedAt: now };
  await localReviewRepository.save(review);
  return { bookId, createdAt: new Date(review.createdAt).getTime(), id: review.id, note: review.body, rating: review.rating };
}

export async function removeReview(bookId: number, id: string) {
  await localReviewRepository.delete(id);
}

export async function getReadingChallenge() {
  return (await getSetting<ReadingChallenge>(challengeKey)) || { completedBooks: 0, goalBooks: 12 };
}

export async function saveReadingChallenge(challenge: ReadingChallenge) {
  await saveSetting(challengeKey, {
    completedBooks: Math.max(0, challenge.completedBooks),
    goalBooks: Math.max(1, challenge.goalBooks),
  });
}
