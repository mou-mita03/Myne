export type OnlineBook = {
  author: string;
  coverUrl?: string;
  description?: string;
  id: string;
  pdfUrl?: string;
  readUrl: string;
  source: "archive" | "openlibrary";
  title: string;
  year?: number;
};

export const curatedOnlineBooks: OnlineBook[] = [
  {
    author: "Arthur Conan Doyle",
    coverUrl: "https://covers.openlibrary.org/b/id/12836262-M.jpg",
    description: "Classic detective fiction from Internet Archive.",
    id: "archive-sherlock-holmes",
    pdfUrl: "https://archive.org/download/adventuresofsher00doyluoft/adventuresofsher00doyluoft.pdf",
    readUrl: "https://archive.org/details/adventuresofsher00doyluoft",
    source: "archive",
    title: "The Adventures of Sherlock Holmes",
    year: 1892,
  },
  {
    author: "Rabindranath Tagore",
    coverUrl: "https://covers.openlibrary.org/b/id/8381534-M.jpg",
    description: "Poetry collection available from open archives.",
    id: "archive-gitanjali-tagore",
    pdfUrl: "https://archive.org/download/gitanjalisongoff00tagouoft/gitanjalisongoff00tagouoft.pdf",
    readUrl: "https://archive.org/details/gitanjalisongoff00tagouoft",
    source: "archive",
    title: "Gitanjali",
    year: 1912,
  },
  {
    author: "Jane Austen",
    coverUrl: "https://covers.openlibrary.org/b/id/8231856-M.jpg",
    description: "A public-domain social comedy and romance classic.",
    id: "archive-pride-prejudice",
    pdfUrl: "https://archive.org/download/prideprejudice00aust/prideprejudice00aust.pdf",
    readUrl: "https://archive.org/details/prideprejudice00aust",
    source: "archive",
    title: "Pride and Prejudice",
    year: 1813,
  },
];

const archiveHosts = new Set(["archive.org", "www.archive.org"]);

export function isAllowedOnlineBookUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (archiveHosts.has(url.hostname)) return true;
  return /^ia\d+\.us\.archive\.org$/i.test(url.hostname);
}

export function mapOpenLibraryDoc(doc: {
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ia?: string[];
  key?: string;
  subject?: string[];
  title?: string;
}): OnlineBook | null {
  if (!doc.title || !doc.key) return null;
  const ia = doc.ia?.[0];
  return {
    author: doc.author_name?.slice(0, 2).join(", ") || "Unknown author",
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    description: doc.subject?.slice(0, 4).join(", "),
    id: ia ? `archive-${ia}` : `openlibrary-${doc.key.replace(/\W+/g, "-")}`,
    pdfUrl: ia ? `https://archive.org/download/${ia}/${ia}.pdf` : undefined,
    readUrl: ia ? `https://archive.org/details/${ia}` : `https://openlibrary.org${doc.key}`,
    source: ia ? "archive" : "openlibrary",
    title: doc.title,
    year: doc.first_publish_year,
  };
}
