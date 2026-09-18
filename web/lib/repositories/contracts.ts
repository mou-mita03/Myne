import type { Rating, Recommendation, Review } from "@/lib/domain/models";

/** UI depends on these contracts, allowing IndexedDB to be replaced by an API. */
export interface ReviewRepository {
  delete(reviewId: string): Promise<void>;
  listForBook(bookId: string): Promise<Review[]>;
  save(review: Review): Promise<Review>;
  summary(bookId: string): Promise<Rating>;
}

export interface RecommendationRepository {
  listForUser(userId: string): Promise<Recommendation[]>;
  replaceForUser(userId: string, items: Recommendation[]): Promise<void>;
}
