/**
 * Canonical application data contracts. IDs are stable strings so the same
 * model can be persisted in IndexedDB now and in Firestore/SQL later.
 */
export type EntityId = string;
export type ISODate = string;
export type UserRole = "reader" | "author" | "admin";
export type TransactionStatus = "created" | "pending" | "paid" | "failed" | "refunded";

export interface User { id: EntityId; email: string; displayName: string; photoUrl?: string; role: UserRole; privateProfile: boolean; createdAt: ISODate; updatedAt: ISODate; }
export interface Author { id: EntityId; name: string; biography?: string; createdAt: ISODate; }
export interface Category { id: EntityId; name: string; slug: string; description?: string; }
export interface Book { id: EntityId; title: string; description?: string; authorIds: EntityId[]; categoryIds: EntityId[]; coverUrl?: string; epubUrl?: string; pdfUrl?: string; priceCents: number; currency: "BDT" | "USD"; status: "draft" | "published" | "archived"; createdAt: ISODate; updatedAt: ISODate; }
export interface Purchase { id: EntityId; userId: EntityId; bookId: EntityId; transactionId: EntityId; purchasedAt: ISODate; }
export interface Library { id: EntityId; userId: EntityId; bookId?: EntityId; localKey: string; addedAt: ISODate; favorite: boolean; }
export interface Review { id: EntityId; userId: EntityId; bookId: EntityId; rating: 1 | 2 | 3 | 4 | 5; body: string; verifiedPurchase: boolean; createdAt: ISODate; updatedAt: ISODate; }
export interface Rating { bookId: EntityId; average: number; total: number; distribution: Record<Review["rating"], number>; updatedAt: ISODate; }
export interface ReadingProgress { id: EntityId; userId: EntityId; libraryId: EntityId; chapter: number; location?: string; percentage?: number; updatedAt: ISODate; }
export interface Recommendation { id: EntityId; userId: EntityId; bookId: EntityId; score: number; reason: "genre" | "author" | "popular" | "recently-viewed" | "history" | "ai"; generatedAt: ISODate; }
export interface Transaction { id: EntityId; userId: EntityId; bookId: EntityId; amountCents: number; currency: "BDT"; provider: "bkash" | "nagad" | "card"; providerReference?: string; status: TransactionStatus; createdAt: ISODate; updatedAt: ISODate; }

/** Relationship map: User→Library/Purchase/Review/Recommendation; Book→Author/Category/Rating; Purchase→Transaction. */
export interface DomainSchema { users: User; books: Book; authors: Author; categories: Category; purchases: Purchase; libraries: Library; reviews: Review; ratings: Rating; readingProgress: ReadingProgress; recommendations: Recommendation; transactions: Transaction; }
