# Myne Web

Myne Web is a browser version of the Android project: browse Project Gutenberg books, save EPUB files locally, import personal EPUBs, and read them in the browser.

## Windows: run locally

1. Open PowerShell in the `web` folder:
   ```powershell
   cd D:\Project\Myne-main\web
   ```
2. Install dependencies once:
   ```powershell
   pnpm install
   ```
3. Copy `.env.example` to `.env.local`. Firebase is optional for local reading. For login, fill all `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console > Project settings > Your apps > Web app.
4. In Firebase Console, enable **Authentication > Email/Password** and optionally **Google** and **Facebook** providers. Facebook requires app credentials configured inside Firebase Console; do not put Facebook secrets in frontend environment variables.
5. Create a Firestore database with rules that only let a signed-in user access `users/{uid}` where `request.auth.uid == uid`.
6. Start the site:
   ```powershell
   pnpm dev
   ```
7. Open the URL printed by Next.js, normally [http://localhost:3000](http://localhost:3000).

## Data model and safety

- Books are read through `/api/books`, a narrow server route that forwards only the query fields used by the Android app to `https://myne.abyx.in/books`.
- EPUB downloads use `/api/epub`, which only permits HTTPS Project Gutenberg EPUB URLs. This avoids browser CORS problems without becoming an open proxy.
- EPUB blobs, imported titles, favorites and positions are stored in IndexedDB (`myne-web`) on this device. `epubjs` is rendered with `allowScriptedContent: false`, so imported EPUB scripts do not run.
- Firebase is not required for local use. Once configured, email/password and enabled social providers work through Firebase Auth. Profile metadata, favorite Gutenberg IDs, saved book keys, wishlist IDs and reading statistics are merged into the existing `users/{uid}` document; this app does not store passwords, replace user documents or alter Firestore rules.

## Included now

- Browse, search and paginate books; categories and book details
- Mood Match matching rule from the Android app
- AI-powered recommendations, mood matching and reader assistance through server-side Next.js routes, with local fallbacks when Gemini is unavailable
- Separate OpenLibrary/Internet Archive discovery page with an allowlisted PDF preview route
- Local library, favorites, EPUB import/remove and responsive EPUB reader
- Chapter controls, reader font size/theme/spacing/focus preferences, saved reading position and Continue Reading
- Site light/dark setting, profile dashboard, Firebase email/password sign-in, Google sign-in and Facebook provider architecture when configured
- Conservative PWA install/offline shell support; API responses and EPUB blobs are not broadly cached by the service worker

## AI configuration

- AI routes live under `app/api/ai/*` and call Gemini only from the server. Add `GEMINI_API_KEY` to `.env.local`; do not prefix it with `NEXT_PUBLIC_`.
- If Gemini is missing or unavailable, Myne returns local catalogue-based recommendations instead of breaking the UI.
- Reader assistance is spoiler-free by default and only sends the current chapter excerpt plus the user's question.

## Online discovery security

- OpenLibrary/Internet Archive discovery is separate from the existing Myne/Gutenberg catalogue API.
- PDF preview uses `/api/online-books/pdf`, which accepts only HTTPS URLs from allowlisted Archive hosts. Arbitrary external URLs, localhost and private URLs are not accepted.
- The existing `/api/books` and `/api/epub` behavior remains unchanged.

## Reading Music

- The bundled playlist is defined in [`lib/music-tracks.ts`](./lib/music-tracks.ts). Each entry must point to a local file under `public/audio`; external audio URLs are intentionally not supported.
- `public/audio/quiet-drift.wav` and `public/audio/lantern-rain.wav` are original synthesized ambient loops. Their source generator is [`scripts/generate-ambient-audio.mjs`](./scripts/generate-ambient-audio.mjs). Run `node scripts/generate-ambient-audio.mjs` from `web` to recreate them.
- To add another legally owned or royalty-free bundled track, put its audio file in `public/audio`, then add its title, artist, description, and `/audio/...` path to `lib/music-tracks.ts`. Do not add commercial copyrighted music unless the project owns the required rights.
- The Settings > Reading Music panel accepts selected local MP3, WAV, OGG, AAC, M4A, FLAC, Opus, and WebM audio files up to 30 MB. Those files are saved only in this browser's IndexedDB, are never uploaded to Firebase, and are not visible to other users or browsers.
- Browsers require a user click on Play before music can begin. Closing the browser or tab does not keep playback running.

## Security note

Token/premium access needs server-side enforcement (for example Cloud Functions with verified purchase/webhook state); it must not be enforced from browser state or Firestore writes alone.

## Commerce and protected books

Myne keeps free public-domain EPUB delivery separate from paid delivery. The prepared payment contract supports `bkash`, `nagad`, and `card` providers, but `/api/payments/session` intentionally returns a fail-closed configuration error until a server integration is supplied.

For a production provider integration, use this sequence:

1. Verify the Firebase ID token on the server and look up the price by book ID; never accept a client price.
2. Create a pending transaction record server-side, then create the provider checkout/session.
3. Verify the provider's signed webhook server-side; only then write the immutable transaction record and entitlement.
4. Make `/api/ebooks/protected/[id]` verify the ID token and entitlement before streaming a private object-store file. Never return protected storage URLs, files, provider secrets, or entitlement decisions to unauthenticated clients.
