"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { type OnlineBook } from "@/lib/online-books";

async function loadOnlineBooks(query = "", loadError: string) {
  const endpoint = query.trim()
    ? `/api/online-books/search?q=${encodeURIComponent(query.trim())}`
    : "/api/online-books/popular";
  const response = await fetch(endpoint);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || loadError);
  return data.books as OnlineBook[];
}

export function OnlineBooks() {
  const { t } = useI18n();
  const [activePdf, setActivePdf] = useState<OnlineBook | null>(null);
  const [books, setBooks] = useState<OnlineBook[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  function refresh(nextQuery = query) {
    setLoading(true);
    setError("");
    void loadOnlineBooks(nextQuery, t("online.loadError"))
      .then(setBooks)
      .catch((reason) => setError(reason instanceof Error ? reason.message : t("online.failure")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh("");
  }, []);

  return (
    <>
      <section className="online-discovery-panel">
        <form className="online-search-panel" onSubmit={(event) => { event.preventDefault(); refresh(); }}>
          <div>
            <p className="eyebrow">{t("online.eyebrow")}</p>
            <h2>{t("online.title")}</h2>
            <p>{t("online.description")}</p>
          </div>
          <label>
            <Icon name="search" size={18} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder={t("online.searchPlaceholder")} type="search" value={query} />
          </label>
          <button className="primary-button" type="submit">{t("common.search")}</button>
        </form>
        {error ? <div className="notice error">{error}</div> : loading ? <div className="loading-card">{t("online.loading")}</div> : (
          <div className="online-book-grid">
            {books.map((book) => (
              <article className="online-book-card" key={book.id}>
                <div className="online-book-cover">{book.coverUrl ? <img alt="" src={book.coverUrl} /> : <Icon name="book" size={34} />}</div>
                <div>
                  <span>{book.source}{book.year ? ` · ${book.year}` : ""}</span>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  {book.description && <small>{book.description}</small>}
                  <div className="online-book-actions">
                    {book.pdfUrl && <button className="primary-button" onClick={() => setActivePdf(book)} type="button">{t("online.preview")}</button>}
                    <a className="outline-button" href={book.readUrl} rel="noreferrer" target="_blank">{t("online.openSource")} <Icon name="share" size={16} /></a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activePdf?.pdfUrl && (
        <div className="dialog-backdrop online-pdf-backdrop" onClick={() => setActivePdf(null)}>
          <section aria-label={t("online.previewAria", { title: activePdf.title })} aria-modal="true" className="online-pdf-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
            <header>
              <div><p className="eyebrow">{t("online.securePreview")}</p><h2>{activePdf.title}</h2></div>
              <button aria-label={t("online.closeAria")} className="icon-action" onClick={() => setActivePdf(null)} type="button"><Icon name="close" size={18} /></button>
            </header>
            <iframe src={`/api/online-books/pdf?url=${encodeURIComponent(activePdf.pdfUrl)}`} title={activePdf.title} />
          </section>
        </div>
      )}
    </>
  );
}
