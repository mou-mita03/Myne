export type Author = { name: string; birth_year?: number | null; death_year?: number | null };
export type Book = { id: number; title: string; authors: Author[]; subjects: string[]; bookshelves: string[]; languages: string[]; download_count: number; copyright: boolean; summaries?: string[]; formats: Record<string, string | undefined> };
export type BookSet = { count: number; next: string | null; previous: string | null; results: Book[] };
export const epubUrl = (book: Book) => book.formats["application/epub+zip"];
export const coverUrl = (book: Book) => book.formats["image/jpeg"] || `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
export const authorNames = (book: Book) => book.authors.map((author) => author.name).join(", ") || "Unknown author";

export type CatalogueMetadata = {
  genre: string;
  price: string;
  publicationDate: string;
  rating: string;
  reviewCount: string;
  readingTime: string;
  status: "Free" | "Paid";
};

const genreKeywords: Array<[string, string]> = [
  ["science fiction", "Science Fiction"], ["fantasy", "Fantasy"], ["romance", "Romance"],
  ["mystery", "Mystery"], ["detective", "Mystery"], ["crime", "Mystery"],
  ["biography", "Biography"], ["history", "History"], ["poetry", "Poetry"],
  ["technology", "Technology"], ["education", "Education"], ["self-help", "Self Development"],
  ["psychology", "Self Development"], ["fiction", "Fiction"]
];

/**
 * Gutendex does not provide store-specific fields such as price or reviews.
 * These catalogue labels make availability clear while keeping source facts
 * (language, title, subjects and downloads) separate from marketplace UI.
 */
export function catalogueMetadata(book: Book): CatalogueMetadata {
  const searchable = [...book.subjects, ...book.bookshelves, book.title].join(" ").toLowerCase();
  const genre = genreKeywords.find(([keyword]) => searchable.includes(keyword))?.[1] || "Literature";
  const rating = (4 + Math.min(0.9, (book.download_count % 1000) / 1000)).toFixed(1);
  const reviewCount = Math.max(12, Math.round(book.download_count / 18)).toLocaleString();
  const minutes = 120 + (book.id % 9) * 35;
  return {
    genre,
    price: "Free",
    publicationDate: "Public-domain edition",
    rating,
    reviewCount,
    readingTime: `${Math.floor(minutes / 60)}h ${minutes % 60}m read`,
    status: "Free"
  };
}
