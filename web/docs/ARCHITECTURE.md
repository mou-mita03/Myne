# Data architecture

The web client uses a repository boundary between UI and persistence. `lib/domain/models.ts` is the canonical contract for User, Book, Author, Category, Purchase, Library, Review, Rating, ReadingProgress, Recommendation, and Transaction.

## Current storage

- IndexedDB is the offline cache for downloaded books, reading progress, music, local reviews, and recommendations.
- Firebase Authentication identifies users. Firestore stores the account profile, cloud reading metadata, wishlist, purchase entitlements, and eventual role claims.
- Payment creation must remain server-only. A provider webhook verifies the payment and writes Transaction, Purchase, and the user entitlement atomically.

## Relationships

`User → Library, Purchase, Review, ReadingProgress, Recommendation, Transaction`.
`Book ↔ Author` and `Book ↔ Category` are many-to-many through ID arrays.
`Book → Rating` is an aggregate of reviews.
`Purchase → Transaction` is one-to-one for a completed checkout.

## Production migration path

1. Keep IndexedDB as the offline cache, not the source of truth for paid content or public reviews.
2. Add server repositories backed by Firestore or a relational database and swap repository implementations at the composition boundary.
3. Verify Firebase ID tokens in API routes, calculate prices on the server, and only grant a Purchase after a signed webhook.
4. Use Firestore Security Rules to enforce user ownership and server-only writes for transactions, ratings, and entitlement grants.
