"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { authorNames, catalogueMetadata, coverUrl, type Book } from "@/types/book";

function languageLabel(book: Book, fallback: string) {
  return book.languages[0] ? book.languages[0].replace(/^./, (letter) => letter.toUpperCase()) : fallback;
}

function subjectLabel(book: Book, fallback: string) {
  return book.subjects.slice(0, 2).join(" · ") || fallback;
}

export function BookCard({ book }: { book: Book }) {
  const { t } = useI18n();
  const metadata = catalogueMetadata(book);

  return (
    <Link className="book-grid-card" href={`/book/${book.id}`}>
      <div className="book-grid-cover">
        <Image alt={t("book.coverAlt", { title: book.title })} fill sizes="(max-width: 640px) 42vw, (max-width: 1024px) 27vw, 220px" src={coverUrl(book)} unoptimized />
        <span>{metadata.status}</span>
      </div>
      <div className="book-grid-copy">
        <p className="book-grid-author">{authorNames(book)}</p>
        <h2>{book.title}</h2>
        <p className="book-grid-subjects">{metadata.genre} · {languageLabel(book, t("book.cardLanguageUnavailable"))}</p>
        <div className="book-card-market-meta">
          <span>★ {metadata.rating} <small>({metadata.reviewCount})</small></span>
          <span>{metadata.readingTime}</span>
        </div>
        <div className="book-card-price"><strong>{metadata.price}</strong><span>Public domain</span></div>
        <span className="book-grid-link">{t("book.cardViewDetails")} <Icon name="chevron-right" size={16} /></span>
      </div>
    </Link>
  );
}
