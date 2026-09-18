import { authorNames, type Book } from "@/types/book";

export type AiBookInput = {
  author: string;
  id: number | string;
  subjects?: string[];
  summary?: string;
  title: string;
};

export type AiRecommendation = {
  bookId: string;
  confidence: number;
  reason: string;
  tags: string[];
  title: string;
};

export type AiMoodResult = AiRecommendation & {
  tone: string;
};

export type AiChatResult = {
  answer: string;
  suggestedQuestions: string[];
};

export function bookToAiInput(book: Book): AiBookInput {
  return {
    author: authorNames(book),
    id: book.id,
    subjects: book.subjects.slice(0, 8),
    summary: book.summaries?.[0],
    title: book.title,
  };
}

function scoreBook(book: AiBookInput, terms: string[]) {
  const haystack = `${book.title} ${book.author} ${(book.subjects || []).join(" ")} ${book.summary || ""}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function tagsFor(book: AiBookInput) {
  return (book.subjects || [])
    .slice(0, 3)
    .map((subject) => subject.split("--")[0].trim())
    .filter(Boolean);
}

export function fallbackRecommendations(books: AiBookInput[], prompt = ""): AiRecommendation[] {
  const terms = prompt.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  return [...books]
    .map((book, index) => ({ book, score: scoreBook(book, terms) * 10 + Math.max(0, 6 - index) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ book, score }) => ({
      bookId: String(book.id),
      confidence: Math.min(98, Math.max(72, 78 + score)),
      reason: book.summary || `A strong catalogue match for readers interested in ${tagsFor(book).join(", ") || "classic literature"}.`,
      tags: tagsFor(book).slice(0, 3),
      title: book.title,
    }));
}

export function fallbackMoodSearch(books: AiBookInput[], mood = ""): AiMoodResult[] {
  const normalized = mood.toLowerCase();
  const moodTerms = normalized.includes("calm")
    ? ["poetry", "nature", "letters", "domestic"]
    : normalized.includes("thought")
      ? ["philosophy", "psychology", "science", "ethics"]
      : normalized.includes("light")
        ? ["humor", "children", "adventure", "romance"]
        : normalized.includes("dark")
          ? ["crime", "gothic", "mystery", "punishment"]
          : normalized.split(/\W+/).filter(Boolean);

  return fallbackRecommendations(books, moodTerms.join(" ")).map((item) => ({
    ...item,
    tone: mood || "Reflective",
  }));
}

export function fallbackChatAnswer(question: string, context: { author?: string; bookTitle?: string; chapterTitle?: string; noSpoilers?: boolean }) {
  const scope = context.chapterTitle ? `the current chapter, "${context.chapterTitle}"` : "the current reading context";
  const spoilerGuard = context.noSpoilers === false ? "" : " I will avoid later plot spoilers unless you ask for them explicitly.";
  return {
    answer: `Here is a careful reading note for ${context.bookTitle || "this book"}: your question, "${question}", is best approached through themes, character motivation, and language in ${scope}.${spoilerGuard} Look for repeated images, emotional turning points, and how the narrator frames responsibility or desire.`,
    suggestedQuestions: [
      "What themes are visible so far?",
      "Explain this chapter without spoilers.",
      "What should I pay attention to next?",
    ],
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] || text;
  return JSON.parse(raw);
}

export async function askGemini<T>(prompt: string, fallback: T): Promise<{ result: T; source: "fallback" | "gemini" }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { result: fallback, source: "fallback" };

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) return { result: fallback, source: "fallback" };
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n") || "";
    if (!text) return { result: fallback, source: "fallback" };
    return { result: extractJson(text) as T, source: "gemini" };
  } catch {
    return { result: fallback, source: "fallback" };
  }
}
