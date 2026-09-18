import { NextRequest, NextResponse } from "next/server";
import { askGemini, fallbackChatAnswer, type AiChatResult } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.slice(0, 800) : "";
  const context = {
    author: typeof body.author === "string" ? body.author.slice(0, 160) : "",
    bookTitle: typeof body.bookTitle === "string" ? body.bookTitle.slice(0, 220) : "",
    chapterText: typeof body.chapterText === "string" ? body.chapterText.slice(0, 7000) : "",
    chapterTitle: typeof body.chapterTitle === "string" ? body.chapterTitle.slice(0, 220) : "",
    noSpoilers: body.noSpoilers !== false,
  };

  if (!question.trim()) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  const fallback = fallbackChatAnswer(question, context);
  const spoilerRule = context.noSpoilers
    ? "Do not reveal future plot events beyond the supplied excerpt. If asked, explain that spoiler-free mode is active."
    : "Spoilers are allowed because the user explicitly disabled spoiler-free mode.";
  const prompt = `Return JSON only with keys answer and suggestedQuestions. ${spoilerRule}
Book: ${context.bookTitle}
Author: ${context.author}
Chapter: ${context.chapterTitle}
Question: ${question}
Current excerpt:
${context.chapterText}`;

  const { result, source } = await askGemini<AiChatResult>(prompt, fallback);
  return NextResponse.json({ ...result, source });
}
