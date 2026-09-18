import { NextRequest, NextResponse } from "next/server";
import { curatedOnlineBooks, mapOpenLibraryDoc } from "@/lib/online-books";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120);
  if (!query) return NextResponse.json({ books: curatedOnlineBooks });

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=18`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (!response.ok) throw new Error("OpenLibrary unavailable");
    const data = await response.json();
    const books = Array.isArray(data.docs) ? data.docs.map(mapOpenLibraryDoc).filter(Boolean).slice(0, 18) : [];
    return NextResponse.json({ books: books.length ? books : curatedOnlineBooks });
  } catch {
    return NextResponse.json({ books: curatedOnlineBooks, warning: "OpenLibrary search is temporarily unavailable." });
  }
}
