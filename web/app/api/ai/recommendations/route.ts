import { NextRequest, NextResponse } from "next/server";
import { askGemini, fallbackRecommendations, type AiBookInput, type AiRecommendation } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const books = Array.isArray(body.books) ? body.books.slice(0, 20) as AiBookInput[] : [];
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 600) : "";
  const fallback = fallbackRecommendations(books, prompt);

  if (!books.length) return NextResponse.json({ recommendations: [], source: "fallback" });

  const aiPrompt = `Return JSON only: an array of up to 4 book recommendations. Each item must contain bookId, title, reason, confidence number 0-100, and tags string array. Avoid spoilers. Reader request: ${prompt || "recommend a balanced reading list"} Available books: ${JSON.stringify(books)}`;
  const { result, source } = await askGemini<AiRecommendation[]>(aiPrompt, fallback);

  return NextResponse.json({ recommendations: Array.isArray(result) ? result.slice(0, 4) : fallback, source });
}
