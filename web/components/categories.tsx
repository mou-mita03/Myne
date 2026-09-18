"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiCompanion } from "@/components/ai-companion";
import { BookCard } from "@/components/book-card";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { Shell } from "@/components/shell";
import { categories, categoryTopic } from "@/lib/categories";
import { moodMatch, type Energy, type FollowUp, type Mood } from "@/lib/mood-match";
import { epubUrl, type Book, type BookSet } from "@/types/book";

const moods: Mood[] = ["Calm", "Emotional", "Thoughtful", "Light", "Inspiring", "SurpriseMe"];
const followUps: FollowUp[] = ["QuietEscape", "HumanConnection", "BigIdeas", "PlayfulTurn"];
const energies: Energy[] = ["TenMinutes", "TwentyMinutes", "ShortRead", "SinkIn"];

function isBook(value: unknown): value is Book { if (!value || typeof value !== "object") return false; const book = value as Partial<Book>; return typeof book.id === "number" && typeof book.title === "string" && Array.isArray(book.authors) && Array.isArray(book.subjects) && Array.isArray(book.languages) && typeof book.formats === "object" && book.formats !== null; }
function isBookSet(value: unknown): value is BookSet { return Boolean(value && typeof value === "object" && typeof (value as Partial<BookSet>).count === "number" && Array.isArray((value as Partial<BookSet>).results) && (value as Partial<BookSet>).results?.every(isBook)); }
async function fetchCategoryBooks(category: string, signal: AbortSignal) { const response = await fetch(`/api/books?${new URLSearchParams({ topic: categoryTopic(category) })}`, { signal }); const data: unknown = await response.json().catch(() => null); if (!response.ok) throw new Error(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Category books could not be loaded."); if (!isBookSet(data)) throw new Error("Category returned an invalid response."); return data; }

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()).trim();
}

export function Categories() {
  const { t } = useI18n();
  const mounted = useRef(true);
  const [category, setCategory] = useState<string | null>(null);
  const [data, setData] = useState<BookSet | null>(null);
  const [energy, setEnergy] = useState<Energy>("TwentyMinutes");
  const [error, setError] = useState("");
  const [follow, setFollow] = useState<FollowUp>("QuietEscape");
  const [mood, setMood] = useState<Mood>("Calm");
  const [offset, setOffset] = useState(0);
  const match = useMemo(() => moodMatch(mood, follow, energy, offset), [energy, follow, mood, offset]);
  const selectedBooks = useMemo(() => data?.results.filter((book) => Boolean(epubUrl(book))) || [], [data]);
  const selectCategory = useCallback((next: string | null) => { setCategory(next); setData(null); setError(""); }, []);
  const resetMoodOffset = useCallback(() => setOffset(0), []);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!category) return;
    const controller = new AbortController();
    setData(null);
    setError("");
    void fetchCategoryBooks(category, controller.signal)
      .then((result) => { if (mounted.current) setData(result); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (mounted.current) setError(reason instanceof Error ? reason.message : t("categories.error"));
      });
    return () => controller.abort();
  }, [category, t]);

  return (
    <Shell>
      <section className="page-introduction categories-introduction">
        <p className="eyebrow">{t("categories.introEyebrow")}</p>
        <h1>{t("categories.introTitle")}</h1>
        <p>{t("categories.introBody")}</p>
      </section>

      <section className="categories-website-layout">
        <aside className="category-sidebar">
          <p className="sidebar-label">{t("categories.allCategories")}</p>
          <div className="category-side-list">
            <button aria-pressed={!category} className={!category ? "active" : undefined} onClick={() => selectCategory(null)} type="button">{t("categories.allShelves")}</button>
            {categories.map((item) => <button aria-pressed={category === item} className={category === item ? "active" : undefined} key={item} onClick={() => selectCategory(item)} type="button">{label(item)}</button>)}
          </div>
        </aside>

        <div className="categories-main">
          {!category ? (
            <section aria-label={t("categories.aria")} className="website-category-grid">
              {categories.map((item, index) => (
                <button className={`website-category-card category-tone-${index % 5}`} key={item} onClick={() => selectCategory(item)} type="button">
                  <span>{t("categories.cardLabel")}</span>
                  <strong>{label(item)}</strong>
                  <Icon name="chevron-right" size={20} />
                </button>
              ))}
            </section>
          ) : (
            <section aria-live="polite" className="category-result-section">
              <div className="section-heading">
                <div><p className="eyebrow">{t("categories.selectedShelf")}</p><h2>{label(category)}</h2></div>
                <button className="text-link" onClick={() => selectCategory(null)} type="button">{t("categories.viewAll")} <Icon name="close" size={16} /></button>
              </div>
              {error ? <div className="notice error">{error}</div> : !data ? <div className="loading-card">{t("categories.loading")}</div> : (
                <>
                  {selectedBooks.length ? <><div className="book-grid">{selectedBooks.map((book) => <BookCard book={book} key={book.id} />)}</div><AiCompanion books={selectedBooks} compact mode="mood" /></> : <div className="no-results-panel"><Icon name="book" size={28} /><p>{t("categories.error")}</p></div>}
                </>
              )}
            </section>
          )}
        </div>
      </section>

      <section className="mood-match-section" id="mood-match">
        <div className="mood-match-intro">
          <p className="eyebrow">{t("categories.moodEyebrow")}</p>
          <h2>{t("categories.moodTitle")}</h2>
          <p>{t("categories.moodBody")}</p>
        </div>
        <div className="mood-match-controls">
          <div className="mood-pills" aria-label={t("categories.moodAria")}>
            {moods.map((value) => <button aria-pressed={mood === value} className={mood === value ? "active" : undefined} key={value} onClick={() => { setMood(value); resetMoodOffset(); }} type="button">{label(value)}</button>)}
          </div>
          <div className="mood-selects">
            <label>{t("categories.moodFollow")}
              <select onChange={(event) => { setFollow(event.target.value as FollowUp); resetMoodOffset(); }} value={follow}>
                {followUps.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
            <label>{t("categories.moodTime")}
              <select onChange={(event) => { setEnergy(event.target.value as Energy); resetMoodOffset(); }} value={energy}>
                {energies.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
          </div>
          <article className="mood-recommendation">
            <p>{t("categories.moodToday")}</p>
            <h3>{match.title}</h3>
            <span>{match.author}</span>
            <div><Link className="primary-button" href={`/book/${match.id}`}>{t("categories.moodSeeBook")} <Icon name="chevron-right" size={17} /></Link><button className="text-link" onClick={() => setOffset((current) => current + 1)} type="button">{t("categories.moodAnother")}</button></div>
          </article>
        </div>
      </section>
    </Shell>
  );
}
