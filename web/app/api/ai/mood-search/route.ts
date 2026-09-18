import { NextRequest, NextResponse } from "next/server";
import { askGemini, fallbackMoodSearch, type AiBookInput, type AiMoodResult } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const books = Array.isArray(body.books) ? body.books.slice(0, 20) as AiBookInput[] : [];
  const mood = typeof body.mood === "string" ? body.mood.slice(0, 300) : "";
  const fallback = fallbackMoodSearch(books, mood);

  if (!books.length) return NextResponse.json({ results: [], source: "fallback" });

  const prompt = `Return JSON only: an array of up to 4 mood-matched books. Each item must contain bookId, title, tone, reason, confidence number 0-100, and tags string array. Avoid plot spoilers. Mood: ${mood || "thoughtful"} Available books: ${JSON.stringify(books)}`;
  const { result, source } = await askGemini<AiMoodResult[]>(prompt, fallback);

  return NextResponse.json({ results: Array.isArray(result) ? result.slice(0, 4) : fallback, source });
}
