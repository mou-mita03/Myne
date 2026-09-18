"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { Shell } from "@/components/shell";
import { getLibrary, getProgress, type LibraryBook, type ReadingProgress } from "@/lib/storage";

type EpubChapter = {
  href: string;
  index: number;
  title: string;
};

type TocItem = {
  href?: string;
  label?: string;
  subitems?: TocItem[];
};

function flattenToc(items: TocItem[], spineItems: Array<{ href?: string; idref?: string }>, chapterLabel: (count: number) => string) {
  const chapters: EpubChapter[] = [];
  const addItem = (item: TocItem) => {
    if (item.href) {
      const cleanHref = item.href.split("#")[0];
      const matchedIndex = spineItems.findIndex((spineItem) => spineItem.href === cleanHref || spineItem.href?.endsWith(cleanHref));
      chapters.push({ href: item.href, index: matchedIndex >= 0 ? matchedIndex : chapters.length, title: item.label || chapterLabel(chapters.length + 1) });
    }
    item.subitems?.forEach(addItem);
  };
  items.forEach(addItem);
  return chapters;
}

function readerHref(key: string, href?: string) {
  const base = `/reader/${encodeURIComponent(key)}/read`;
  return href ? `${base}?href=${encodeURIComponent(href)}` : base;
}

function progressPercent(progress: ReadingProgress | null, total: number) {
  if (!progress || !total) return 0;
  return Math.min(100, ((progress.chapter + 1) / total) * 100);
}

export function ReaderOverview({ bookKey }: { bookKey: string }) {
  const { t } = useI18n();
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [error, setError] = useState("");
  const [item, setItem] = useState<LibraryBook | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);

  useEffect(() => {
    let disposed = false;
    let epubBook: any;

    void (async () => {
      try {
        const entry = await getLibrary(bookKey);
        if (!entry) {
          setError(t("readerOverview.errorMissing"));
          return;
        }
        if (entry.format === "pdf" || entry.blob.type === "application/pdf") {
          const savedProgress = await getProgress(bookKey);
          if (disposed) return;
          setItem(entry);
          setProgress(savedProgress || null);
          setTotalChapters(0);
          return;
        }
        const Epub = (await import("epubjs")).default;
        epubBook = Epub(await entry.blob.arrayBuffer());
        const [spine, navigation, savedProgress] = await Promise.all([epubBook.loaded.spine, epubBook.loaded.navigation, getProgress(bookKey)]);
        if (disposed) return;
        const spineItems = spine.items || epubBook.spine.items || [];
        const toc = epubBook.navigation?.toc || navigation?.toc || [];
        const tocChapters = flattenToc(toc, spineItems, (count) => t("readerOverview.chapterFallback", { count }));
        setChapters(tocChapters.length ? tocChapters : spineItems.map((spineItem: { href?: string; idref?: string }, index: number) => ({ href: spineItem.href || "", index, title: spineItem.idref || t("readerOverview.chapterFallback", { count: index + 1 }) })));
        setItem(entry);
        setProgress(savedProgress || null);
        setTotalChapters(spineItems.length);
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : t("readerOverview.errorOpen"));
      }
    })();

    return () => {
      disposed = true;
      epubBook?.destroy();
    };
  }, [bookKey, t]);

  const percent = progressPercent(progress, totalChapters || progress?.totalChapters || 0);

  return (
    <Shell>
      {error ? (
        <div className="reader-overview-error"><Icon name="book" size={30} /><p>{error}</p><Link className="outline-button" href="/library">{t("readerOverview.returnLibrary")}</Link></div>
      ) : !item ? (
        <div className="loading-card">{t("readerOverview.loading")}</div>
      ) : (
        <section className="reader-overview-website">
          <div className="reader-overview-breadcrumb"><Link href="/library"><Icon name="arrow-left" size={17} />{t("readerOverview.library")}</Link><span>/</span><span>{t("readerOverview.title")}</span></div>
          <article className="reader-overview-summary">
            <div className="reader-overview-cover">{item.cover ? <img alt={t("book.coverAlt", { title: item.title })} src={item.cover} /> : <Icon name="book" size={62} />}</div>
            <div className="reader-overview-copy">
              <p className="eyebrow">{t("readerOverview.ready")}</p>
              <h1>{item.title}</h1>
              <p>{item.authors}</p>
              <div className="reader-progress-summary"><div><span style={{ width: `${percent}%` }} /></div><strong>{progress ? t("readerOverview.complete", { percent: percent.toFixed(0) }) : t("readerOverview.notStarted")}</strong></div>
              <div className="reader-overview-actions"><Link className="primary-button" href={readerHref(bookKey)}>{progress ? t("readerOverview.resume") : t("readerOverview.start")}<Icon name="chevron-right" size={18} /></Link><span>{t("readerOverview.chaptersCount", { count: totalChapters || chapters.length })}</span></div>
            </div>
          </article>
          {!(item.format === "pdf" || item.blob.type === "application/pdf") && <section className="reader-chapter-index" aria-label={t("readerOverview.chapterIndex")}>
            <div className="section-heading"><div><p className="eyebrow">{t("readerOverview.toc")}</p><h2>{t("readerOverview.chapters")}</h2></div><p>{t("readerOverview.entries", { count: chapters.length })}</p></div>
            <div className="reader-overview-chapters">
              {chapters.map((chapter) => {
                const read = progress ? chapter.index < progress.chapter : false;
                const active = progress?.chapter === chapter.index;
                return <Link className={active ? "reader-overview-chapter active" : "reader-overview-chapter"} href={readerHref(bookKey, chapter.href)} key={`${chapter.href}-${chapter.index}`}><span><small>{chapter.index + 1}</small>{chapter.title}</span><div>{read && <Icon name="check" size={17} />}<Icon name="chevron-right" size={19} /></div></Link>;
              })}
            </div>
          </section>}
        </section>
      )}
    </Shell>
  );
}
