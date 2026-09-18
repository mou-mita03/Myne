"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AiCompanion } from "@/components/ai-companion";
import { BookCard } from "@/components/book-card";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { Shell } from "@/components/shell";
import { categories, categoryTopic } from "@/lib/categories";
import { catalogueMetadata, epubUrl, type Book, type BookSet } from "@/types/book";
import { getProgress, listLibrary } from "@/lib/storage";
import { clearRecentSearches, getRecentSearches, rememberSearch } from "@/lib/search-history";

type RecentBook = {
  cover?: string;
  key: string;
  progressText: string;
  title: string;
};

type HomeProps = {
  initialSearch?: string;
  view?: "browse" | "home";
};

type CatalogueFilters = { availability: string; epubOnly: boolean; language: string; minRating: string; price: string; query: string; sort: string; topic: string };
type FilterAction = { type: "reset" } | { type: "set"; field: keyof CatalogueFilters; value: string | boolean };
const defaultFilters: CatalogueFilters = { availability: "", epubOnly: false, language: "", minRating: "", price: "", query: "", sort: "popular", topic: "" };

function filterReducer(state: CatalogueFilters, action: FilterAction): CatalogueFilters {
  if (action.type === "reset") return defaultFilters;
  return state[action.field] === action.value ? state : { ...state, [action.field]: action.value } as CatalogueFilters;
}

function isBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Book>;
  return typeof candidate.id === "number" && typeof candidate.title === "string" && Array.isArray(candidate.authors) && Array.isArray(candidate.subjects) && Array.isArray(candidate.bookshelves) && Array.isArray(candidate.languages) && typeof candidate.download_count === "number" && typeof candidate.formats === "object" && candidate.formats !== null;
}

function isBookSet(value: unknown): value is BookSet {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<BookSet>).count === "number" && Array.isArray((value as Partial<BookSet>).results) && (value as Partial<BookSet>).results?.every(isBook));
}

async function getBooks(params: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(`/api/books?${params}`, { signal });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Catalogue request failed.");
  if (!isBookSet(data)) throw new Error("Catalogue returned an invalid response.");
  return data;
}

function categoryLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()).trim();
}

function compareBooks(left: Book, right: Book, sort: string) {
  const leftMeta = catalogueMetadata(left);
  const rightMeta = catalogueMetadata(right);
  if (sort === "rating") return Number(rightMeta.rating) - Number(leftMeta.rating) || right.download_count - left.download_count;
  // The source has no release timestamp; a higher catalogue id is the closest
  // reliable proxy for a newly added public-domain edition.
  if (sort === "new") return right.id - left.id;
  if (sort === "trending") {
    const trend = (book: Book) => book.download_count * 0.8 + (book.id % 1000) * 4;
    return trend(right) - trend(left);
  }
  return right.download_count - left.download_count;
}

function LibraryFilters({
  availability,
  compact = false,
  epubOnly,
  language,
  minRating,
  onClear,
  onEpubOnly,
  onLanguage,
  onAvailability,
  onMinRating,
  onPrice,
  onQuery,
  onSearch,
  onTopic,
  onSort,
  price,
  query,
  recentSearches,
  topic,
  sort,
}: {
  availability: string;
  compact?: boolean;
  epubOnly: boolean;
  language: string;
  minRating: string;
  onClear: () => void;
  onEpubOnly: (next: boolean) => void;
  onLanguage: (next: string) => void;
  onAvailability: (next: string) => void;
  onMinRating: (next: string) => void;
  onPrice: (next: string) => void;
  onQuery: (next: string) => void;
  onSearch: (query: string) => void;
  onTopic: (next: string) => void;
  onSort: (next: string) => void;
  price: string;
  query: string;
  recentSearches: string[];
  topic: string;
  sort: string;
}) {
  const { t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const suggestionGenres = categories.slice(0, 6);
  const applySuggestion = (value: string) => {
    onQuery(value);
    onSearch(value);
    setSearchOpen(false);
  };

  return (
    <form className={compact ? "catalog-filters catalog-filters-compact" : "catalog-filters"} onSubmit={(event) => { event.preventDefault(); onSearch(query); setSearchOpen(false); }}>
      {!compact && <div className="filter-heading"><Icon name="filter" size={18} /><span>{t("home.filterHeading")}</span></div>}
      <label className="filter-search">
        <span>{t("home.filterKeyword")}</span>
        <div><Icon name="search" size={18} /><input aria-describedby="catalogue-search-help" onChange={(event) => onQuery(event.target.value)} onFocus={() => setSearchOpen(true)} placeholder="Title, author, genre, or keyword" type="search" value={query} /></div>
        {searchOpen && <div className="search-suggestions" id="catalogue-search-help">
          {query.trim() ? <p>Search suggestions</p> : <p>Start with a title, author, genre, or keyword</p>}
          {recentSearches.length > 0 && <div className="suggestion-group"><span>Recent searches</span>{recentSearches.map((item) => <button key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => applySuggestion(item)} type="button">{item}</button>)}</div>}
          <div className="suggestion-group"><span>{query.trim() ? "Popular genres" : "Try a genre"}</span>{suggestionGenres.map((item) => <button key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => applySuggestion(item)} type="button">{categoryLabel(item)}</button>)}</div>
          {recentSearches.length > 0 && <button className="clear-search-history" onMouseDown={(event) => event.preventDefault()} onClick={() => { clearRecentSearches(); window.dispatchEvent(new Event("myne-search-history")); }} type="button">Clear recent searches</button>}
        </div>}
      </label>
      <label>
        <span>{t("home.category")}</span>
        <select onChange={(event) => onTopic(event.target.value)} value={topic}>
          <option value="">{t("home.filterAllCategories")}</option>
          {categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
        </select>
      </label>
      <label>
        <span>{t("home.language")}</span>
        <select onChange={(event) => onLanguage(event.target.value)} value={language}>
          <option value="">{t("home.filterAllLanguages")}</option>
          <option value="en">{t("home.languageEnglish")}</option>
          <option value="fr">{t("home.languageFrench")}</option>
          <option value="de">{t("home.languageGerman")}</option>
          <option value="es">{t("home.languageSpanish")}</option>
        </select>
      </label>
      <label>
        <span>Price</span>
        <select onChange={(event) => onPrice(event.target.value)} value={price}>
          <option value="">All prices</option>
          <option value="zero">$0</option>
          <option value="under-five">Under $5</option>
          <option value="five-plus">$5 and up</option>
        </select>
      </label>
      <label>
        <span>Free / Paid</span>
        <select onChange={(event) => onAvailability(event.target.value)} value={availability}>
          <option value="">All availability</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </label>
      <label>
        <span>Rating</span>
        <select onChange={(event) => onMinRating(event.target.value)} value={minRating}>
          <option value="">Any rating</option>
          <option value="4">4.0+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </label>
      <label className="epub-filter">
        <input checked={epubOnly} onChange={(event) => onEpubOnly(event.target.checked)} type="checkbox" />
        <span>{t("home.epubAvailable")}</span>
      </label>
      <label>
        <span>Sort by</span>
        <select onChange={(event) => onSort(event.target.value)} value={sort}>
          <option value="popular">Most popular</option>
          <option value="new">New releases</option>
          <option value="rating">Highest rated</option>
          <option value="trending">Trending</option>
        </select>
      </label>
      {!compact && <button className="filter-reset" onClick={onClear} type="button">{t("home.filterReset")}</button>}
    </form>
  );
}

export function Home({ initialSearch = "", view = "home" }: HomeProps) {
  const { t } = useI18n();
  const mounted = useRef(true);
  const [data, setData] = useState<BookSet | null>(null);
  const [filtersState, dispatchFilter] = useReducer(filterReducer, defaultFilters);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentBook | null>(null);
  const { availability, epubOnly, language, minRating, price, query, sort, topic } = filtersState;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    dispatchFilter({ type: "set", field: "query", value: initialSearch });
    setPage(1);
  }, [initialSearch]);

  useEffect(() => {
    const refresh = () => setRecentSearches(getRecentSearches());
    refresh();
    window.addEventListener("myne-search-history", refresh);
    return () => window.removeEventListener("myne-search-history", refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("search", query);
    if (topic) params.set("topic", categoryTopic(topic));
    if (language) params.set("languages", language);
    setData(null);
    setError("");
    void getBooks(params, controller.signal)
      .then((result) => { if (mounted.current) setData(result); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (mounted.current) setError(reason instanceof Error ? reason.message : t("home.loadError"));
      });
    return () => controller.abort();
  }, [language, page, query, topic, t]);

  useEffect(() => {
    void listLibrary()
      .then(async (items) => {
        const progressItems = await Promise.all(items.map(async (item) => ({ item, progress: await getProgress(item.key) })));
        const latest = progressItems
          .filter((entry) => entry.progress)
          .sort((left, right) => (right.progress?.updatedAt || 0) - (left.progress?.updatedAt || 0))[0];
        if (!latest?.progress) return;
        const total = latest.progress.totalChapters;
        const percent = total ? Math.min(100, ((latest.progress.chapter + 1) / total) * 100) : null;
        if (!mounted.current) return;
        setRecent({
          cover: latest.item.cover,
          key: latest.item.key,
          progressText: percent === null ? `Chapter ${latest.progress.chapter + 1}` : `${percent.toFixed(0)}% complete`,
          title: latest.item.title,
        });
      })
      .catch(() => undefined);
  }, []);

  const updateFilter = useCallback((field: keyof CatalogueFilters, value: string | boolean) => { dispatchFilter({ type: "set", field, value }); if (field !== "sort") setPage(1); }, []);
  const updateQuery = useCallback((next: string) => updateFilter("query", next), [updateFilter]);

  const saveSearch = useCallback((next: string) => {
    const searches = rememberSearch(next);
    setRecentSearches(searches);
  }, []);
  const clearFilters = useCallback(() => { dispatchFilter({ type: "reset" }); setPage(1); }, []);

  const visibleBooks = useMemo(() => {
    const filtered = (data?.results || []).filter((book) => {
      const metadata = catalogueMetadata(book);
      const isFree = metadata.status === "Free";
      const matchesPrice = !price || (price === "zero" && isFree) || (price === "under-five" && isFree) || (price === "five-plus" && !isFree);
      return (!epubOnly || Boolean(epubUrl(book)))
        && (!availability || metadata.status.toLowerCase() === availability)
        && matchesPrice
        && (!minRating || Number(metadata.rating) >= Number(minRating));
    });
    return filtered.slice().sort((left, right) => compareBooks(left, right, sort));
  }, [availability, data, epubOnly, minRating, price, sort]);
  const hasFilters = Boolean(query || topic || language || epubOnly || availability || price || minRating || sort !== "popular");
  const resultTitle = query ? t("home.resultForQuery", { query }) : topic ? categoryLabel(topic) : view === "browse" ? t("home.resultBrowse") : t("home.popularTitle");

  const filters = {
    availability,
    epubOnly,
    language,
    minRating,
    onClear: clearFilters,
    onEpubOnly: (next: boolean) => updateFilter("epubOnly", next),
    onLanguage: (next: string) => updateFilter("language", next),
    onAvailability: (next: string) => updateFilter("availability", next),
    onMinRating: (next: string) => updateFilter("minRating", next),
    onPrice: (next: string) => updateFilter("price", next),
    onQuery: updateQuery,
    onSearch: saveSearch,
    onTopic: (next: string) => updateFilter("topic", next),
    onSort: (next: string) => updateFilter("sort", next),
    price,
    query,
    recentSearches,
    topic,
    sort,
  };

  return (
    <Shell>
      {view === "home" ? (
        <>
          <section className="library-hero">
            <div className="library-hero-copy">
              <p className="eyebrow">{t("home.heroEyebrow")}</p>
              <h1>{t("home.heroTitle")}</h1>
              <p>{t("home.heroBody")}</p>
              <div className="hero-actions">
                <Link className="primary-button" href="/browse">{t("home.heroBrowse")} <Icon name="chevron-right" size={18} /></Link>
                <Link className="outline-button" href="/categories">{t("home.heroCategories")}</Link>
              </div>
            </div>
            <aside className="hero-library-note">
              <span className="hero-note-number">{t("home.heroNoteCount")}</span>
              <strong>{t("home.heroNoteTitle")}</strong>
              <p>{t("home.heroNoteBody")}</p>
              <span className="hero-note-rule" />
              <small>{t("home.heroNoteSmall")}</small>
            </aside>
          </section>

          <section className="continue-section" aria-labelledby="continue-reading-heading">
            <div className="section-heading">
              <div><p className="eyebrow">{t("home.continueEyebrow")}</p><h2 id="continue-reading-heading">{t("home.continueHeading")}</h2></div>
              <Link className="text-link" href="/library">{t("home.continueViewLibrary")} <Icon name="chevron-right" size={16} /></Link>
            </div>
            {recent ? (
              <Link className="continue-reading-card" href={`/reader/${encodeURIComponent(recent.key)}`}>
                <div className="continue-reading-cover">{recent.cover ? <Image alt="" fill sizes="72px" src={recent.cover} unoptimized /> : <Icon name="book" size={31} />}</div>
                <div><p>{recent.progressText}</p><h3>{recent.title}</h3><span>{t("home.continueWhere")}</span></div>
                <span className="continue-reading-action">{t("home.continueResume")} <Icon name="arrow-left" size={17} /></span>
              </Link>
            ) : (
              <div className="continue-empty"><Icon name="book" size={25} /><div><strong>{t("home.continueEmptyTitle")}</strong><p>{t("home.continueBody")}</p></div><Link className="text-link" href="/browse">{t("home.continueFind")}</Link></div>
            )}
          </section>
        </>
      ) : (
        <section className="page-introduction page-introduction-browse">
          <p className="eyebrow">{t("home.browseEyebrow")}</p>
          <h1>{t("home.browseTitle")}</h1>
          <p>{t("home.browseBody")}</p>
        </section>
      )}

      <section className={view === "browse" ? "catalogue-layout browse-catalogue-layout" : "catalogue-layout"} aria-live="polite">
        {view === "browse" && <aside className="catalogue-sidebar"><LibraryFilters {...filters} /></aside>}
        <div className="catalogue-content">
          {view === "home" && <LibraryFilters {...filters} compact />}
          <div className="section-heading catalogue-heading">
            <div><p className="eyebrow">{t("home.catalogueEyebrow")}</p><h2>{resultTitle}</h2></div>
            {data && <p className="catalogue-count">{t("home.catalogueCount", { count: data.count.toLocaleString() })}</p>}
          </div>
          {hasFilters && <p className="active-filters">{t("home.resultFilters")}</p>}
          {error ? (
            <div className="notice error">{t("home.tryAgain", { message: error })}</div>
          ) : !data ? (
            <div className="loading-card">{t("home.loading")}</div>
          ) : visibleBooks.length === 0 ? (
            <div className="no-results-panel">
              <Icon name="search" size={28} />
              <div><p className="eyebrow">Keep exploring</p><h3>{query ? `No results for “${query}”` : "Your search is ready"}</h3><p>{query ? "Try a shorter title, an author surname, or one of these popular genres." : "Search by title, author, genre, or any keyword from a book description."}</p></div>
              <div className="no-results-actions">{categories.slice(0, 4).map((item) => <button key={item} onClick={() => { updateQuery(item); saveSearch(item); }} type="button">{categoryLabel(item)}</button>)}</div>
            </div>
          ) : (
            <>
              <div className="book-grid">
                {visibleBooks.map((book) => <BookCard book={book} key={book.id} />)}
              </div>
              <AiCompanion books={visibleBooks} compact={view === "home"} />
              <div className="page-controls">
                <button className="outline-button" disabled={page === 1 || !data.previous} onClick={() => setPage((current) => current - 1)} type="button">{t("common.previous")}</button>
                <span>{t("home.page", { page })}</span>
                <button className="primary-button" disabled={!data.next} onClick={() => setPage((current) => current + 1)} type="button">{t("common.nextPage")}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </Shell>
  );
}
