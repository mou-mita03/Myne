"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { useMusic } from "@/components/music-provider";
import { getLibrary, getProgress, getSetting, recordReadingDay, saveProgress, saveSetting, type LibraryBook } from "@/lib/storage";

type ReaderMode = "paper" | "night" | "sepia";
type ReaderFont = "system" | "serif" | "cursive" | "sans" | "poppins";
type ReaderSpacing = "normal" | "relaxed" | "wide";
type SpeechState = "paused" | "playing" | "stopped";
type EpubChapter = { href: string; index: number; title: string };
type TocItem = { href?: string; label?: string; subitems?: TocItem[] };
type SpineItem = { href?: string; idref?: string };
type EpubLocation = { start: { cfi: string } };
type EpubContent = { document?: Document };
type EpubThemes = { override: (name: string, value: string, priority?: boolean) => void; register: (name: string, rules: Record<string, Record<string, string>>) => void; select: (name: string) => void };
type EpubRendition = { destroy: () => void; display: (target?: string) => Promise<void>; getContents: () => EpubContent[]; next: () => void; on: (event: "relocated", listener: (location: EpubLocation) => void) => void; prev: () => void; themes: EpubThemes };
type EpubBook = { destroy: () => void; loaded: { navigation: Promise<{ toc?: TocItem[] }>; spine: Promise<{ items?: SpineItem[] }> }; navigation?: { toc?: TocItem[] }; renderTo: (element: HTMLElement, options: { allowScriptedContent: false; flow: "scrolled-doc"; height: string; width: string }) => EpubRendition; spine: { get: (cfi: string) => { index: number } | undefined; items?: SpineItem[] } };
type EpubFactory = (input: ArrayBuffer) => EpubBook;
type ReaderPreferences = { brightness?: number; focusMode?: boolean; font?: ReaderFont; fontSize?: number; letterSpacing?: ReaderSpacing; lineHeight?: number; mode?: ReaderMode; wordSpacing?: ReaderSpacing };
type SpeechSession = { chunks: string[]; index: number; utterance: SpeechSynthesisUtterance | null };

const AI_CONTEXT_LIMIT = 7_000;
const SPEECH_CHUNK_LIMIT = 3_500;

const fontFamilies: Record<ReaderFont, string> = {
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  cursive: "cursive",
  sans: "Arial, Helvetica, sans-serif",
  poppins: "Poppins, 'Avenir Next', 'Segoe UI', sans-serif",
};

const readerPreferencesKey = "reader-preferences";

function chapterList(items: TocItem[], spineItems: SpineItem[], chapterLabel: (count: number) => string) {
  const chapters: EpubChapter[] = [];
  const add = (item: TocItem) => {
    if (item.href) {
      const cleanHref = item.href.split("#")[0];
      const index = spineItems.findIndex((spineItem) => spineItem.href === cleanHref || spineItem.href?.endsWith(cleanHref));
      chapters.push({ href: item.href, index: index >= 0 ? index : chapters.length, title: item.label || chapterLabel(chapters.length + 1) });
    }
    item.subitems?.forEach(add);
  };
  items.forEach(add);
  return chapters.length ? chapters : spineItems.map((item, index) => ({ href: item.href || "", index, title: item.idref || chapterLabel(index + 1) }));
}

function extractReaderText(contents: EpubContent[]) {
  return contents.map((content) => content.document?.body?.innerText || "").join("\n").replace(/\s+/g, " ").trim();
}

function limitContext(text: string, limit = AI_CONTEXT_LIMIT) {
  if (text.length <= limit) return text;
  const boundary = text.lastIndexOf(" ", limit);
  return `${text.slice(0, boundary > 0 ? boundary : limit).trim()}…`;
}

function splitSpeechText(text: string, maxLength = SPEECH_CHUNK_LIMIT) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let chunk = "";
  for (const sentence of sentences) {
    const normalized = sentence.trim();
    if (!normalized) continue;
    if (normalized.length > maxLength) {
      if (chunk) { chunks.push(chunk); chunk = ""; }
      let start = 0;
      while (start < normalized.length) {
        const end = Math.min(start + maxLength, normalized.length);
        const lastSpace = normalized.lastIndexOf(" ", end);
        const preferredEnd = end === normalized.length || lastSpace <= start ? end : lastSpace;
        chunks.push(normalized.slice(start, preferredEnd).trim());
        start = preferredEnd;
      }
    } else if (chunk && chunk.length + normalized.length + 1 > maxLength) {
      chunks.push(chunk); chunk = normalized;
    } else chunk = chunk ? `${chunk} ${normalized}` : normalized;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function currentChapter(chapters: EpubChapter[], index: number, fallback: string) {
  return chapters.reduce<EpubChapter | undefined>((selected, chapter) => chapter.index <= index ? chapter : selected, chapters[0])?.title || fallback;
}

function ChapterNavigation({
  activeIndex,
  chapters,
  onClose,
  onGoTo,
}: {
  activeIndex: number;
  chapters: EpubChapter[];
  onClose?: () => void;
  onGoTo: (chapter: EpubChapter) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="reader-panel-heading"><div><p>{t("reader.contents")}</p><h2>{t("reader.chapters")}</h2></div>{onClose && <button aria-label={t("reader.closeChapters")} className="reader-panel-close" onClick={onClose} type="button"><Icon name="close" size={20} /></button>}</div>
      <div className="reader-chapter-list">
        {chapters.map((chapter) => (
          <button className={chapter.index === activeIndex ? "active" : undefined} key={`${chapter.href}-${chapter.index}`} onClick={() => onGoTo(chapter)} type="button">
            <span><small>{chapter.index + 1}</small>{chapter.title}</span>{chapter.index < activeIndex && <Icon name="check" size={17} />}
          </button>
        ))}
      </div>
    </>
  );
}

function ReaderControls({
  aiAnswer,
  aiBusy,
  aiQuestion,
  brightness,
  font,
  fontSize,
  focusMode,
  letterSpacing,
  lineHeight,
  mode,
  onAskAi,
  onBrightness,
  onFont,
  onFontSize,
  onFocusMode,
  onLetterSpacing,
  onLineHeight,
  onMode,
  onQuestion,
  onWordSpacing,
  onPause,
  onPlay,
  onStop,
  wordSpacing,
  onClose,
  speechState,
  status,
}: {
  aiAnswer: string;
  aiBusy: boolean;
  aiQuestion: string;
  brightness: number;
  font: ReaderFont;
  fontSize: number;
  focusMode: boolean;
  lineHeight: number;
  letterSpacing: ReaderSpacing;
  mode: ReaderMode;
  onAskAi: () => void;
  onBrightness: (next: number) => void;
  onFont: (next: ReaderFont) => void;
  onFontSize: (next: number) => void;
  onFocusMode: (next: boolean) => void;
  onLetterSpacing: (next: ReaderSpacing) => void;
  onLineHeight: (next: number) => void;
  onMode: (next: ReaderMode) => void;
  onQuestion: (next: string) => void;
  onWordSpacing: (next: ReaderSpacing) => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  onClose?: () => void;
  speechState: SpeechState;
  status: string;
  wordSpacing: ReaderSpacing;
}) {
  const { t } = useI18n();
  const fontLabels: Record<ReaderFont, string> = {
    cursive: t("reader.cursive"),
    poppins: t("reader.fontPoppins"),
    sans: t("reader.fontSans"),
    serif: t("reader.fontSerif"),
    system: t("reader.fontSystem"),
  };

  return (
    <>
      <div className="reader-panel-heading"><div><p>{t("reader.settings")}</p><h2>{t("reader.settingsTitle")}</h2></div>{onClose && <button aria-label={t("reader.closeSettings")} className="reader-panel-close" onClick={onClose} type="button"><Icon name="close" size={20} /></button>}</div>
      <section className="reader-control-group"><h3>{t("reader.readAloud")}</h3><div className="read-aloud-buttons"><button className="reader-control-button active" disabled={speechState === "playing"} onClick={onPlay} type="button"><Icon name="play" size={16} />{t("reader.play")}</button><button className="reader-control-button" disabled={speechState !== "playing"} onClick={onPause} type="button"><Icon name="pause" size={16} />{t("reader.pause")}</button><button className="reader-control-button" disabled={speechState === "stopped"} onClick={onStop} type="button"><Icon name="stop" size={15} />{t("reader.stop")}</button></div></section>
      <section className="reader-control-group"><div className="reader-control-label"><h3>{t("reader.fontSize")}</h3><span>{fontSize}px</span></div><input aria-label={t("reader.fontSize")} max="28" min="14" onChange={(event) => onFontSize(Number(event.target.value))} type="range" value={fontSize} /></section>
      <section className="reader-control-group"><div className="reader-control-label"><h3>{t("reader.lineHeight")}</h3><span>{lineHeight.toFixed(1)}</span></div><input aria-label={t("reader.lineHeight")} max="2.5" min="1" onChange={(event) => onLineHeight(Number(event.target.value))} step="0.1" type="range" value={lineHeight} /></section>
      <section className="reader-control-group"><div className="reader-control-label"><h3>Brightness</h3><span>{brightness}%</span></div><input aria-label="Reader brightness" max="130" min="45" onChange={(event) => onBrightness(Number(event.target.value))} type="range" value={brightness} /></section>
      <label className="reader-select">{t("reader.fontFamily")}<select onChange={(event) => onFont(event.target.value as ReaderFont)} value={font}>{(Object.keys(fontLabels) as ReaderFont[]).map((key) => <option key={key} value={key}>{fontLabels[key]}</option>)}</select></label>
      <section className="reader-control-group reader-theme-control"><h3>{t("reader.readerTheme")}</h3><div><button aria-pressed={mode === "paper"} className={mode === "paper" ? "active" : undefined} onClick={() => onMode("paper")} type="button">{t("reader.light")}</button><button aria-pressed={mode === "sepia"} className={mode === "sepia" ? "active" : undefined} onClick={() => onMode("sepia")} type="button">{t("reader.sepia")}</button><button aria-pressed={mode === "night"} className={mode === "night" ? "active" : undefined} onClick={() => onMode("night")} type="button">{t("reader.black")}</button></div></section>
      <section className="reader-control-group reader-theme-control"><h3>{t("reader.readingComfort")}</h3><div><button aria-pressed={letterSpacing === "normal"} className={letterSpacing === "normal" ? "active" : undefined} onClick={() => onLetterSpacing("normal")} type="button">{t("reader.themeNormal")}</button><button aria-pressed={letterSpacing === "relaxed"} className={letterSpacing === "relaxed" ? "active" : undefined} onClick={() => onLetterSpacing("relaxed")} type="button">{t("reader.relaxed")}</button><button aria-pressed={letterSpacing === "wide"} className={letterSpacing === "wide" ? "active" : undefined} onClick={() => onLetterSpacing("wide")} type="button">{t("reader.wide")}</button></div></section>
      <section className="reader-control-group reader-theme-control"><h3>{t("reader.wordSpacing")}</h3><div><button aria-pressed={wordSpacing === "normal"} className={wordSpacing === "normal" ? "active" : undefined} onClick={() => onWordSpacing("normal")} type="button">{t("reader.themeNormal")}</button><button aria-pressed={wordSpacing === "relaxed"} className={wordSpacing === "relaxed" ? "active" : undefined} onClick={() => onWordSpacing("relaxed")} type="button">{t("reader.relaxed")}</button><button aria-pressed={wordSpacing === "wide"} className={wordSpacing === "wide" ? "active" : undefined} onClick={() => onWordSpacing("wide")} type="button">{t("reader.wide")}</button></div></section>
      <section className="reader-control-group reader-theme-control"><h3>{t("reader.focusWidth")}</h3><div><button aria-pressed={!focusMode} className={!focusMode ? "active" : undefined} onClick={() => onFocusMode(false)} type="button">{t("reader.fluid")}</button><button aria-pressed={focusMode} className={focusMode ? "active" : undefined} onClick={() => onFocusMode(true)} type="button">{t("reader.focused")}</button></div></section>
      <section className="reader-control-group reader-ai-control">
        <h3>{t("reader.aiTitle")}</h3>
        <p>{t("reader.aiBody")}</p>
        <textarea onChange={(event) => onQuestion(event.target.value)} placeholder={t("reader.aiPlaceholder")} rows={3} value={aiQuestion} />
        <button className="reader-control-button active" disabled={aiBusy || !aiQuestion.trim()} onClick={onAskAi} type="button"><Icon name="star" size={15} />{aiBusy ? t("ai.thinking") : t("reader.aiAsk")}</button>
        {aiAnswer && <p className="reader-ai-answer">{aiAnswer}</p>}
      </section>
      {status && <p className="reader-status" role="status">{status}</p>}
    </>
  );
}

export function Reader({ bookKey, initialHref }: { bookKey: string; initialHref?: string }) {
  const { t } = useI18n();
  const { lowerForReadAloud, restoreAfterReadAloud } = useMusic();
  const viewer = useRef<HTMLDivElement>(null);
  const rendition = useRef<EpubRendition | null>(null);
  const pdfObjectUrl = useRef("");
  const epubBook = useRef<EpubBook | null>(null);
  const speechSession = useRef<SpeechSession | null>(null);
  const aiRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const restoreReadAloudMusic = useRef(restoreAfterReadAloud);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [font, setFont] = useState<ReaderFont>("system");
  const [fontSize, setFontSize] = useState(18);
  const [focusMode, setFocusMode] = useState(false);
  const [item, setItem] = useState<LibraryBook | null>(null);
  const [letterSpacing, setLetterSpacing] = useState<ReaderSpacing>("normal");
  const [lineHeight, setLineHeight] = useState(1.5);
  const [mode, setMode] = useState<ReaderMode>("paper");
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>("stopped");
  const [status, setStatus] = useState("");
  const [totalChapters, setTotalChapters] = useState(0);
  const [wordSpacing, setWordSpacing] = useState<ReaderSpacing>("normal");

  useEffect(() => {
    restoreReadAloudMusic.current = restoreAfterReadAloud;
  }, [restoreAfterReadAloud]);

  const applyReaderAppearance = useCallback(() => {
    const activeRendition = rendition.current;
    if (!activeRendition) return;
    activeRendition.themes.override("background", mode === "night" ? "#111817" : mode === "sepia" ? "#fbf0d9" : "#fbfdfc", true);
    activeRendition.themes.override("color", mode === "night" ? "#e6efeb" : mode === "sepia" ? "#3d2b1f" : "#17201d", true);
    activeRendition.themes.override("font-family", fontFamilies[font], true);
    activeRendition.themes.override("font-size", `${fontSize}px`, true);
    activeRendition.themes.override("letter-spacing", letterSpacing === "wide" ? ".06em" : letterSpacing === "relaxed" ? ".025em" : "normal", true);
    activeRendition.themes.override("line-height", String(lineHeight), true);
    activeRendition.themes.override("word-spacing", wordSpacing === "wide" ? ".32em" : wordSpacing === "relaxed" ? ".16em" : "normal", true);
  }, [font, fontSize, letterSpacing, lineHeight, mode, wordSpacing]);

  useEffect(() => {
    void getSetting<ReaderPreferences>(readerPreferencesKey).then((saved) => {
      if (!saved) return;
      if (saved.font) setFont(saved.font);
      if (typeof saved.brightness === "number") setBrightness(saved.brightness);
      if (typeof saved.fontSize === "number") setFontSize(saved.fontSize);
      if (typeof saved.focusMode === "boolean") setFocusMode(saved.focusMode);
      if (saved.letterSpacing) setLetterSpacing(saved.letterSpacing);
      if (typeof saved.lineHeight === "number") setLineHeight(saved.lineHeight);
      if (saved.mode) setMode(saved.mode);
      if (saved.wordSpacing) setWordSpacing(saved.wordSpacing);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let disposed = false;
    mounted.current = true;

    void (async () => {
      try {
        const entry = await getLibrary(bookKey);
        if (!entry || !viewer.current) {
          setError(t("reader.errorMissing"));
          return;
        }
        setItem(entry);
        const isPdf = entry.format === "pdf" || entry.blob.type === "application/pdf";
        if (isPdf) {
          const saved = await getProgress(bookKey);
          if (disposed) return;
          setPdfPage((saved?.chapter || 0) + 1);
          setTotalChapters(0);
          pdfObjectUrl.current = URL.createObjectURL(entry.blob);
          setPdfUrl(pdfObjectUrl.current);
          return;
        }
        const epubModule = await import("epubjs");
        const Epub = epubModule.default as EpubFactory;
        const book = Epub(await entry.blob.arrayBuffer());
        epubBook.current = book;
        const [spine, navigation, saved] = await Promise.all([book.loaded.spine, book.loaded.navigation, getProgress(bookKey)]);
        if (disposed || !viewer.current) return;
        const spineItems = spine.items || book.spine.items || [];
        setTotalChapters(spineItems.length);
        setChapters(chapterList(book.navigation?.toc || navigation?.toc || [], spineItems, (count) => t("reader.chapterFallback", { count })));
        const rendered = book.renderTo(viewer.current, {
          allowScriptedContent: false,
          flow: "scrolled-doc",
          height: "100%",
          width: "100%",
        });
        rendition.current = rendered;
        rendered.themes.register("myne-reader", {
          body: {
            background: "#fbfdfc",
            color: "#17201d",
            "font-family": fontFamilies.system,
            "line-height": "1.5",
          },
        });
        rendered.themes.select("myne-reader");
        rendered.on("relocated", (location) => {
          const index = book.spine.get(location.start.cfi)?.index ?? 0;
          const updatedAt = Date.now();
          setChapterIndex(index);
          void saveProgress({ key: bookKey, chapter: index, cfi: location.start.cfi, totalChapters: spineItems.length, updatedAt });
          void recordReadingDay();
        });
        applyReaderAppearance();
        await rendered.display(initialHref || saved?.cfi || undefined);
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : t("reader.errorOpen"));
      }
    })();

    return () => {
      disposed = true;
      mounted.current = false;
      speechSession.current = null;
      aiRequest.current?.abort();
      aiRequest.current = null;
      window.speechSynthesis?.cancel();
      restoreReadAloudMusic.current();
      rendition.current?.destroy();
      epubBook.current?.destroy();
      rendition.current = null;
      epubBook.current = null;
      if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current);
      pdfObjectUrl.current = "";
    };
  }, [bookKey, initialHref, t]);

  useEffect(() => {
    applyReaderAppearance();
    void saveSetting(readerPreferencesKey, { brightness, focusMode, font, fontSize, letterSpacing, lineHeight, mode, wordSpacing }).catch(() => undefined);
  }, [applyReaderAppearance, brightness, focusMode, font, fontSize, letterSpacing, lineHeight, mode, wordSpacing]);

  const move = useCallback((direction: number) => {
    if (pdfUrl) {
      setPdfPage((current) => {
        const next = Math.max(1, current + direction);
        void saveProgress({ key: bookKey, chapter: next - 1, totalChapters: 0, updatedAt: Date.now() });
        void recordReadingDay();
        return next;
      });
      return;
    }
    if (direction < 0) rendition.current?.prev();
    else rendition.current?.next();
  }, [bookKey, pdfUrl]);

  const goToChapter = useCallback((chapter: EpubChapter) => {
    setDrawerOpen(false);
    if (chapter.href) rendition.current?.display(chapter.href);
  }, []);

  const finishReadAloud = useCallback((message?: string) => {
    speechSession.current = null;
    if (mounted.current) {
      setSpeechState("stopped");
      if (message) setStatus(message);
    }
    restoreReadAloudMusic.current();
  }, []);

  const playReadAloud = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      setStatus(t("reader.readAloudNotSupported"));
      return;
    }
    if (speechState === "paused") {
      window.speechSynthesis.resume();
      setSpeechState("playing");
      return;
    }
    const text = extractReaderText(rendition.current?.getContents() || []);
    if (!text) {
      setStatus(t("reader.readAloudLoading"));
      return;
    }
    window.speechSynthesis.cancel();
    const session: SpeechSession = { chunks: splitSpeechText(text), index: 0, utterance: null };
    if (!session.chunks.length) { setStatus(t("reader.readAloudLoading")); return; }
    const speakNext = () => {
      if (speechSession.current !== session) return;
      const chunk = session.chunks[session.index++];
      if (!chunk) { finishReadAloud(); return; }
      const nextUtterance = new SpeechSynthesisUtterance(chunk);
      session.utterance = nextUtterance;
      nextUtterance.rate = 0.9;
      nextUtterance.onend = speakNext;
      nextUtterance.onerror = () => {
        if (speechSession.current === session) finishReadAloud(t("reader.readAloudStartFailed"));
      };
      window.speechSynthesis.speak(nextUtterance);
    };
    speechSession.current = session;
    lowerForReadAloud();
    speakNext();
    setSpeechState("playing");
    setStatus("");
  }, [finishReadAloud, lowerForReadAloud, speechState, t]);

  const pauseReadAloud = useCallback(() => {
    if (!("speechSynthesis" in window) || speechState !== "playing") return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  }, [speechState]);

  const stopReadAloud = useCallback(() => {
    speechSession.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    finishReadAloud();
  }, [finishReadAloud]);

  const askReaderAi = useCallback(async () => {
    if (!aiQuestion.trim()) return;
    const chapterText = limitContext(extractReaderText(rendition.current?.getContents() || []));
    if (!chapterText) { setAiAnswer(t("reader.readAloudLoading")); return; }
    setAiBusy(true);
    setAiAnswer("");
    aiRequest.current?.abort();
    const request = new AbortController();
    aiRequest.current = request;
    try {
      const response = await fetch("/api/ai/chat", {
        body: JSON.stringify({
          author: item?.authors,
          bookTitle: item?.title,
          chapterText,
          chapterTitle: currentChapter(chapters, chapterIndex, t("reader.openingChapter")),
          noSpoilers: true,
          question: aiQuestion,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: request.signal,
      });
      const data: { answer?: unknown; error?: unknown } = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : t("reader.aiQuestionFailed"));
      if (mounted.current && aiRequest.current === request) setAiAnswer(typeof data.answer === "string" ? data.answer : t("reader.aiNoAnswer"));
    } catch (reason) {
      if (request.signal.aborted) return;
      if (mounted.current) setAiAnswer(reason instanceof Error ? reason.message : t("reader.aiUnavailable"));
    } finally {
      if (aiRequest.current === request) aiRequest.current = null;
      if (mounted.current && !request.signal.aborted) setAiBusy(false);
    }
  }, [aiQuestion, chapterIndex, chapters, item?.authors, item?.title, t]);

  const completion = totalChapters ? Math.min(100, ((chapterIndex + 1) / totalChapters) * 100) : 0;
  const controls = useMemo(() => ({
    aiAnswer,
    aiBusy,
    aiQuestion,
    brightness,
    font,
    fontSize,
    focusMode,
    letterSpacing,
    lineHeight,
    mode,
    onAskAi: askReaderAi,
    onBrightness: setBrightness,
    onFont: setFont,
    onFontSize: setFontSize,
    onFocusMode: setFocusMode,
    onLetterSpacing: setLetterSpacing,
    onLineHeight: setLineHeight,
    onMode: setMode,
    onQuestion: setAiQuestion,
    onWordSpacing: setWordSpacing,
    onPause: pauseReadAloud,
    onPlay: playReadAloud,
    onStop: stopReadAloud,
    speechState,
    status,
    wordSpacing,
  }), [aiAnswer, aiBusy, aiQuestion, brightness, font, fontSize, focusMode, letterSpacing, lineHeight, mode, askReaderAi, pauseReadAloud, playReadAloud, speechState, status, stopReadAloud, wordSpacing]);

  return (
    <main className={mode === "night" ? "reader-workspace reader-night" : "reader-workspace"}>
      <header className="reader-workspace-header">
        <Link aria-label={t("reader.homeAria")} className="reader-brand" href="/"><span>m</span><strong>{t("common.myne")}</strong><small>{t("reader.readerLabel")}</small></Link>
        <div className="reader-workspace-title"><Link href={`/reader/${encodeURIComponent(bookKey)}`}>{item?.title || t("reader.openingEpub")}</Link><span>{pdfUrl ? `PDF · page ${pdfPage}` : currentChapter(chapters, chapterIndex, t("reader.openingChapter"))}</span></div>
        <div className="reader-mobile-actions"><button aria-label="Full screen" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()} type="button"><Icon name="grid" size={21} /></button><button aria-label={t("reader.mobileChaptersAria")} onClick={() => setDrawerOpen(true)} type="button"><Icon name="menu" size={21} /></button><button aria-label={t("reader.mobileSettingsAria")} onClick={() => setSettingsOpen(true)} type="button"><Icon name="sliders" size={21} /></button></div>
      </header>
      <div className="reader-workspace-grid">
        <aside className="reader-chapter-panel"><ChapterNavigation activeIndex={chapterIndex} chapters={chapters} onGoTo={goToChapter} /></aside>
        <section className={focusMode ? "reader-content-panel reader-focus-mode" : "reader-content-panel"}>
          <div className="reader-content-progress"><span style={{ width: `${completion}%` }} /></div>
          {error ? <div className="reader-error"><p>{error}</p><Link className="outline-button" href="/library">{t("reader.returnLibrary")}</Link></div> : pdfUrl ? <iframe className="pdf-viewer" src={`${pdfUrl}#page=${pdfPage}`} style={{ filter: `brightness(${brightness}%)` }} title={`${item?.title || "Book"} PDF`} /> : <div className="epub-viewer" ref={viewer} style={{ filter: `brightness(${brightness}%)` }} />}
          <footer className="reader-page-footer"><button disabled={Boolean(error)} onClick={() => move(-1)} type="button"><Icon name="chevron-left" size={19} />{t("reader.previous")}</button><span>{totalChapters ? t("reader.chapterOf", { current: chapterIndex + 1, total: totalChapters }) : t("reader.preparingChapter")}</span><button disabled={Boolean(error)} onClick={() => move(1)} type="button">{t("reader.next")}<Icon name="chevron-right" size={19} /></button></footer>
        </section>
        <aside className="reader-settings-panel"><ReaderControls {...controls} /></aside>
      </div>

      {drawerOpen && <div className="reader-drawer-backdrop" onClick={() => setDrawerOpen(false)}><aside aria-label={t("reader.chapters")} aria-modal="true" className="reader-mobile-drawer" onClick={(event) => event.stopPropagation()} role="dialog"><ChapterNavigation activeIndex={chapterIndex} chapters={chapters} onClose={() => setDrawerOpen(false)} onGoTo={goToChapter} /></aside></div>}
      {settingsOpen && <div className="reader-drawer-backdrop reader-settings-backdrop" onClick={() => setSettingsOpen(false)}><aside aria-label={t("reader.settings")} aria-modal="true" className="reader-mobile-drawer reader-mobile-settings" onClick={(event) => event.stopPropagation()} role="dialog"><ReaderControls {...controls} onClose={() => setSettingsOpen(false)} /></aside></div>}
    </main>
  );
}
