"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { listReviews, removeReview, saveReview, type LocalReview } from "@/lib/community";

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function isRating(value: number): value is 1 | 2 | 3 | 4 | 5 { return Number.isInteger(value) && value >= 1 && value <= 5; }
function isReview(value: LocalReview): boolean { return typeof value.id === "string" && typeof value.note === "string" && typeof value.createdAt === "number" && isRating(value.rating); }

export function BookReviews({ bookId }: { bookId: number }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(5);
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => { setLoading(true); try { const next = await listReviews(bookId); if (mounted.current) setReviews(next.filter(isReview)); } catch { if (mounted.current) setStatus(t("review.empty")); } finally { if (mounted.current) setLoading(false); } }, [bookId, t]);

  useEffect(() => {
    mounted.current = true; void refresh(); return () => { mounted.current = false; };
  }, [refresh]);

  const submit = useCallback(async () => {
    const cleanNote = note.trim();
    if (!cleanNote) {
      setStatus(t("review.writeFirst"));
      return;
    }
    if (!isRating(rating) || saving) return;
    setSaving(true); setStatus("");
    try { await saveReview(bookId, rating, cleanNote); if (!mounted.current) return; setNote(""); setRating(5); setStatus(t("review.saved")); await refresh(); }
    catch { if (mounted.current) setStatus(t("review.empty")); }
    finally { if (mounted.current) setSaving(false); }
  }, [bookId, note, rating, refresh, saving, t]);

  const remove = useCallback(async (id: string) => { if (deletingId || !window.confirm(t("review.remove"))) return; setDeletingId(id); try { await removeReview(bookId, id); if (!mounted.current) return; setStatus(t("review.removed")); await refresh(); } catch { if (mounted.current) setStatus(t("review.empty")); } finally { if (mounted.current) setDeletingId(null); } }, [bookId, deletingId, refresh, t]);
  const reviewCount = useMemo(() => reviews.length, [reviews]);

  return (
    <section className="book-reviews-panel" id="reviews">
      <div className="section-heading">
        <div><p className="eyebrow">{t("review.eyebrow")}</p><h2>{t("review.heading")}</h2></div>
        <span>{t("review.savedCount", { count: reviewCount })}</span>
      </div>
      <div className="review-form">
        <label>{t("review.rating")}<select aria-label={t("review.rating")} onChange={(event) => { const next = Number(event.target.value); if (isRating(next)) setRating(next); }} value={rating}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{t("review.stars", { count: value })}</option>)}</select></label>
        <label>{t("review.note")}<textarea onChange={(event) => setNote(event.target.value)} placeholder={t("review.placeholder")} rows={3} value={note} /></label>
        <button className="primary-button" disabled={saving || !note.trim()} onClick={() => void submit()} type="button"><Icon name="star" size={17} />{t("review.save")}</button>
      </div>
      {status && <p className="status-message" role="status">{status}</p>}
      {loading ? <p className="settings-note">{t("common.loading")}</p> : reviews.length > 0 ? (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div><strong>{"★".repeat(review.rating)}</strong><small>{formatDate(review.createdAt)}</small></div>
              <p>{review.note}</p>
              <button className="text-link" disabled={deletingId === review.id} onClick={() => void remove(review.id)} type="button">{t("review.remove")}</button>
            </article>
          ))}
        </div>
      ) : <p className="settings-note">{t("review.empty")}</p>}
    </section>
  );
}
