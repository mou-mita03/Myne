"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { bookToAiInput, type AiMoodResult, type AiRecommendation } from "@/lib/ai";
import type { Book } from "@/types/book";

type AiCompanionProps = {
  books: Book[];
  compact?: boolean;
  mode?: "recommendations" | "mood";
};

export function AiCompanion({ books, compact = false, mode = "recommendations" }: AiCompanionProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<Array<AiRecommendation | AiMoodResult>>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(mode === "mood" ? t("ai.promptMood") : t("ai.promptRecommendations"));
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");

  async function askAi() {
    setLoading(true);
    setStatus("");
    const endpoint = mode === "mood" ? "/api/ai/mood-search" : "/api/ai/recommendations";
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          books: books.slice(0, 16).map(bookToAiInput),
          mood: prompt,
          prompt,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("ai.requestFailed"));
      const nextItems = (mode === "mood" ? data.results : data.recommendations) || [];
      setItems(nextItems);
      setSource(data.source === "gemini" ? "Gemini" : t("ai.sourceFallback"));
      setStatus(data.source === "gemini" ? t("ai.ready") : t("ai.fallbackReady"));
    } catch (reason) {
      setItems([]);
      setStatus(reason instanceof Error ? reason.message : t("ai.failure"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={compact ? "ai-companion-card compact" : "ai-companion-card"} aria-labelledby="ai-companion-title">
      <div className="ai-companion-heading">
        <div>
          <p className="eyebrow">{t("ai.eyebrow")}</p>
          <h2 id="ai-companion-title">{mode === "mood" ? t("ai.titleMood") : t("ai.titleRecommendations")}</h2>
          <p>{mode === "mood" ? t("ai.descriptionMood") : t("ai.descriptionRecommendations")}</p>
        </div>
        {source && <span>{source}</span>}
      </div>
      <form className="ai-companion-form" onSubmit={(event) => { event.preventDefault(); void askAi(); }}>
        <label>
          <span>{mode === "mood" ? t("ai.labelMood") : t("ai.labelRecommendations")}</span>
          <input onChange={(event) => setPrompt(event.target.value)} value={prompt} />
        </label>
        <button className="primary-button" disabled={loading || books.length === 0} type="submit">
          <Icon name="star" size={17} />
          {loading ? t("ai.thinking") : t("ai.ask")}
        </button>
      </form>
      {status && <p className="ai-status" role="status">{status}</p>}
      {items.length > 0 && (
        <div className="ai-result-grid">
          {items.map((item) => (
            <article className="ai-result-card" key={`${item.bookId}-${item.title}`}>
              <span>{t("ai.match", { confidence: item.confidence })}</span>
              <h3>{item.title}</h3>
              <p>{item.reason}</p>
              {item.tags?.length > 0 && <div>{item.tags.slice(0, 3).map((tag) => <small key={tag}>{tag}</small>)}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
