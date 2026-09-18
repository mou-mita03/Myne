import { NextResponse } from "next/server";
import { curatedOnlineBooks } from "@/lib/online-books";

export async function GET() {
  return NextResponse.json({ books: curatedOnlineBooks }, { headers: { "Cache-Control": "public, max-age=300" } });
}
