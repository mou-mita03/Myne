import { listLibrary } from "@/lib/storage";

export async function syncFavoriteBookIds() {
  // Favorites remain browser-local until the trusted account backend owns
  // library data. They must not be stored in the client-writable profile.
  const items = await listLibrary();
  const favoriteBookIds = items
    .filter((item) => item.favorite && item.book?.id)
    .map((item) => item.book!.id);
  return favoriteBookIds.length >= 0;
}
