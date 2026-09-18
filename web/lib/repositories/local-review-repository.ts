import type { Rating, Review } from "@/lib/domain/models";
import type { ReviewRepository } from "@/lib/repositories/contracts";
import { deleteReviewRecord, listReviewRecords, saveReviewRecord } from "@/lib/storage";

const emptyDistribution = () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Rating["distribution"]);

export const localReviewRepository: ReviewRepository = {
  async delete(reviewId) { await deleteReviewRecord(reviewId); },
  async listForBook(bookId) { return (await listReviewRecords()).filter((review) => review.bookId === bookId); },
  async save(review) { await saveReviewRecord(review); return review; },
  async summary(bookId) {
    const reviews = await localReviewRepository.listForBook(bookId);
    const distribution = emptyDistribution();
    reviews.forEach((review) => { distribution[review.rating] += 1; });
    return { bookId, average: reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0, total: reviews.length, distribution, updatedAt: new Date().toISOString() };
  },
};
