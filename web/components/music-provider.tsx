"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { builtInMusicTracks, type BuiltInMusicTrack } from "@/lib/music-tracks";
import { listMusicTracks, removeMusicTrack, saveMusicTrack, type LocalMusicTrack } from "@/lib/storage";

const musicPreferencesKey = "myne:reading-music";
const maximumUploadBytes = 30 * 1024 * 1024;
const acceptedAudioTypes = new Set([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);
const acceptedExtensions = [".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav", ".webm"];

type BuiltInTrack = BuiltInMusicTrack & { source: "built-in" };
export type PersonalMusicTrack = LocalMusicTrack & {
  artist: string;
  description: string;
  source: "personal";
  src: string;
};
export type MusicTrack = BuiltInTrack | PersonalMusicTrack;

type StoredMusicPreferences = {
  duckDuringReadAloud: boolean;
  enabled: boolean;
  lastPosition: number;
  loop: boolean;
  positionTrackId: string;
  selectedTrackId: string;
  shuffle: boolean;
  volume: number;
};

type MusicContextValue = {
  addUserTrack: (file: File) => Promise<void>;
  currentTime: number;
  currentTrack: MusicTrack | undefined;
  duckDuringReadAloud: boolean;
  ducked: boolean;
  duration: number;
  enabled: boolean;
  error: string;
  isPlaying: boolean;
  loop: boolean;
  message: string;
  nextTrack: () => void;
  pause: () => void;
  play: () => Promise<void>;
  previousTrack: () => void;
  removeUserTrack: (id: string) => Promise<void>;
  renameUserTrack: (id: string, title: string) => Promise<void>;
  restoreAfterReadAloud: () => void;
  seek: (time: number) => void;
  selectTrack: (id: string) => void;
  setDuckDuringReadAloud: (next: boolean) => void;
  setEnabled: (next: boolean) => void;
  setLoop: (next: boolean) => void;
  setShuffle: (next: boolean) => void;
  setVolume: (next: number) => void;
  shuffle: boolean;
  tracks: MusicTrack[];
  userTracks: PersonalMusicTrack[];
  volume: number;
  lowerForReadAloud: () => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

const fallbackPreferences: StoredMusicPreferences = {
  duckDuringReadAloud: true,
  enabled: false,
  lastPosition: 0,
  loop: false,
  positionTrackId: "",
  selectedTrackId: builtInMusicTracks[0]?.id || "",
  shuffle: false,
  volume: 0.42,
};

function readPreferences(): StoredMusicPreferences {
  if (typeof window === "undefined") return fallbackPreferences;
  try {
    const value = JSON.parse(window.localStorage.getItem(musicPreferencesKey) || "{}") as Partial<StoredMusicPreferences>;
    return {
      duckDuringReadAloud: typeof value.duckDuringReadAloud === "boolean" ? value.duckDuringReadAloud : fallbackPreferences.duckDuringReadAloud,
      enabled: typeof value.enabled === "boolean" ? value.enabled : fallbackPreferences.enabled,
      lastPosition: typeof value.lastPosition === "number" && value.lastPosition >= 0 ? value.lastPosition : fallbackPreferences.lastPosition,
      loop: typeof value.loop === "boolean" ? value.loop : fallbackPreferences.loop,
      positionTrackId: typeof value.positionTrackId === "string" ? value.positionTrackId : fallbackPreferences.positionTrackId,
      selectedTrackId: typeof value.selectedTrackId === "string" ? value.selectedTrackId : fallbackPreferences.selectedTrackId,
      shuffle: typeof value.shuffle === "boolean" ? value.shuffle : fallbackPreferences.shuffle,
      volume: typeof value.volume === "number" ? Math.max(0, Math.min(1, value.volume)) : fallbackPreferences.volume,
    };
  } catch {
    return fallbackPreferences;
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function displayName(name: string, fallback: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[._-]+/g, " ").trim() || fallback;
}

function supportsFile(file: File) {
  const extension = acceptedExtensions.some((value) => file.name.toLowerCase().endsWith(value));
  const type = file.type.toLowerCase();
  return extension && (type === "" || acceptedAudioTypes.has(type));
}

function isStoredTrack(value: unknown): value is LocalMusicTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<LocalMusicTrack>;
  return typeof track.id === "string" && typeof track.title === "string" && track.blob instanceof Blob && typeof track.addedAt === "number";
}

function PersonalTrackRow({ track }: { track: PersonalMusicTrack }) {
  const { removeUserTrack, renameUserTrack, selectTrack } = useMusic();
  const { t } = useI18n();
  const [title, setTitle] = useState(track.title);

  useEffect(() => setTitle(track.title), [track.title]);

  return (
    <div className="personal-track-row">
      <div><strong>{track.title}</strong><small>{t("music.personalStored")}</small></div>
      <div className="personal-track-actions">
        <input aria-label={t("music.renameAria", { title: track.title })} onChange={(event) => setTitle(event.target.value)} value={title} />
        <button className="mini-button" disabled={!title.trim() || title.trim() === track.title} onClick={() => void renameUserTrack(track.id, title)} type="button">{t("common.save")}</button>
        <button className="mini-button" onClick={() => selectTrack(track.id)} type="button">{t("common.select")}</button>
        <button aria-label={t("music.removeAria", { title: track.title })} className="mini-button danger" onClick={() => void removeUserTrack(track.id)} type="button"><Icon name="trash" size={14} />{t("common.remove")}</button>
      </div>
    </div>
  );
}

export function MusicProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useI18n();
  const audio = useRef<HTMLAudioElement>(null);
  const objectUrls = useRef(new Map<string, string>());
  const resumeAfterTrackChange = useRef(false);
  const hydrated = useRef(false);
  const preferencesRef = useRef<StoredMusicPreferences>(fallbackPreferences);
  const tracksRef = useRef<MusicTrack[]>([]);
  const selectedTrackRef = useRef(fallbackPreferences.selectedTrackId);
  const enabledRef = useRef(fallbackPreferences.enabled);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(fallbackPreferences.volume);
  const loopRef = useRef(fallbackPreferences.loop);
  const shuffleRef = useRef(fallbackPreferences.shuffle);
  const duckPreferenceRef = useRef(fallbackPreferences.duckDuringReadAloud);
  const duckedRef = useRef(false);
  const lastSavedSecond = useRef(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [duckDuringReadAloud, setDuckDuringReadAloudState] = useState(fallbackPreferences.duckDuringReadAloud);
  const [ducked, setDucked] = useState(false);
  const [enabled, setEnabledState] = useState(fallbackPreferences.enabled);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoopState] = useState(fallbackPreferences.loop);
  const [message, setMessage] = useState("");
  const [personalTracks, setPersonalTracks] = useState<PersonalMusicTrack[]>([]);
  const [personalTracksReady, setPersonalTracksReady] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(fallbackPreferences.selectedTrackId);
  const [shuffle, setShuffleState] = useState(fallbackPreferences.shuffle);
  const [volume, setVolumeState] = useState(fallbackPreferences.volume);

  const tracks = useMemo<MusicTrack[]>(() => [
    ...builtInMusicTracks.map((track) => ({ ...track, source: "built-in" as const })),
    ...personalTracks,
  ], [personalTracks]);
  const currentTrack = tracks.find((track) => track.id === selectedTrackId) || tracks[0];

  tracksRef.current = tracks;
  selectedTrackRef.current = selectedTrackId;
  enabledRef.current = enabled;
  volumeRef.current = volume;
  loopRef.current = loop;
  shuffleRef.current = shuffle;
  duckPreferenceRef.current = duckDuringReadAloud;
  preferencesRef.current = {
    duckDuringReadAloud,
    enabled,
    lastPosition: preferencesRef.current.lastPosition,
    loop,
    positionTrackId: preferencesRef.current.positionTrackId,
    selectedTrackId,
    shuffle,
    volume,
  };

  function persistPosition(position: number) {
    const next = {
      ...preferencesRef.current,
      lastPosition: Math.max(0, position),
      positionTrackId: selectedTrackRef.current,
    };
    preferencesRef.current = next;
    if (hydrated.current && typeof window !== "undefined") window.localStorage.setItem(musicPreferencesKey, JSON.stringify(next));
  }

  function effectiveVolume() {
    return duckedRef.current ? Math.min(volumeRef.current * 0.25, 0.2) : volumeRef.current;
  }

  function updatePlaying(next: boolean) {
    isPlayingRef.current = next;
    setIsPlaying(next);
  }

  function changeTrack(id: string, resume = false) {
    if (!tracksRef.current.some((track) => track.id === id) || id === selectedTrackRef.current) return;
    resumeAfterTrackChange.current = resume;
    setCurrentTime(0);
    setSelectedTrackId(id);
  }

  function selectTrack(id: string) {
    changeTrack(id, isPlayingRef.current);
    setError("");
  }

  function selectRelativeTrack(direction: number, resume = isPlayingRef.current) {
    const available = tracksRef.current;
    if (!available.length) return;
    const currentIndex = Math.max(0, available.findIndex((track) => track.id === selectedTrackRef.current));
    let nextIndex = currentIndex;
    if (shuffleRef.current && available.length > 1) {
      do nextIndex = Math.floor(Math.random() * available.length);
      while (nextIndex === currentIndex);
    } else {
      nextIndex = (currentIndex + direction + available.length) % available.length;
    }
    changeTrack(available[nextIndex].id, resume);
  }

  async function play() {
    const element = audio.current;
    if (!enabledRef.current) {
      setError(t("music.enableFirst"));
      return;
    }
    if (!element || !currentTrack) {
      setError(t("music.noTrack"));
      return;
    }
    try {
      await element.play();
      updatePlaying(true);
      setError("");
      setMessage("");
    } catch {
      updatePlaying(false);
      setError(t("music.startError"));
    }
  }

  function pause() {
    audio.current?.pause();
    updatePlaying(false);
  }

  function seek(time: number) {
    const element = audio.current;
    if (!element || !Number.isFinite(time)) return;
    const next = Math.max(0, Math.min(duration || 0, time));
    element.currentTime = next;
    setCurrentTime(next);
    persistPosition(next);
  }

  function setEnabled(next: boolean) {
    setEnabledState(next);
    if (!next) {
      pause();
      duckedRef.current = false;
      setDucked(false);
    }
    setError("");
  }

  function setVolume(next: number) {
    const normalized = Math.max(0, Math.min(1, next));
    setVolumeState(normalized);
    if (audio.current) audio.current.volume = duckedRef.current ? Math.min(normalized * 0.25, 0.2) : normalized;
  }

  function setLoop(next: boolean) {
    setLoopState(next);
    if (audio.current) audio.current.loop = next;
  }

  function setShuffle(next: boolean) {
    setShuffleState(next);
  }

  function setDuckDuringReadAloud(next: boolean) {
    setDuckDuringReadAloudState(next);
    if (!next) restoreAfterReadAloud();
  }

  function lowerForReadAloud() {
    if (!duckPreferenceRef.current || !isPlayingRef.current || !audio.current) return;
    duckedRef.current = true;
    audio.current.volume = effectiveVolume();
    setDucked(true);
  }

  function restoreAfterReadAloud() {
    if (!duckedRef.current) return;
    duckedRef.current = false;
    if (audio.current) audio.current.volume = volumeRef.current;
    setDucked(false);
  }

  async function addUserTrack(file: File) {
    setError("");
    setMessage("");
    if (!supportsFile(file)) {
      setError(t("music.supportedFileTypes"));
      return;
    }
    if (file.size > maximumUploadBytes) {
      setError(t("music.fileTooLarge"));
      return;
    }
    if (!file.size) {
      setError(t("music.empty"));
      return;
    }
    const duplicate = personalTracks.some((track) => track.title === displayName(file.name, t("music.untitled")) && track.blob.size === file.size);
    if (duplicate) {
      setError(t("music.saveError"));
      return;
    }
    const id = `personal:${crypto.randomUUID()}`;
    const stored: LocalMusicTrack = { id, title: displayName(file.name, t("music.untitled")), blob: file, addedAt: Date.now() };
    try {
      await saveMusicTrack(stored);
      const src = URL.createObjectURL(file);
      objectUrls.current.set(id, src);
      setPersonalTracks((current) => [...current, { ...stored, artist: t("music.personalArtist"), description: t("music.personalDescription"), source: "personal", src }]);
      resumeAfterTrackChange.current = false;
      setSelectedTrackId(id);
      setMessage(t("music.added", { title: stored.title }));
    } catch {
      setError(t("music.saveError"));
    }
  }

  async function renameUserTrack(id: string, title: string) {
    const cleanTitle = title.trim();
    const track = personalTracks.find((item) => item.id === id);
    if (!track || !cleanTitle) return;
    try {
      const renamed: LocalMusicTrack = { id: track.id, title: cleanTitle, blob: track.blob, addedAt: track.addedAt };
      await saveMusicTrack(renamed);
      setPersonalTracks((current) => current.map((item) => item.id === id ? { ...item, title: cleanTitle } : item));
      setMessage(t("music.renamed"));
      setError("");
    } catch {
      setError(t("music.renameError"));
    }
  }

  async function removeUserTrack(id: string) {
    const track = personalTracks.find((item) => item.id === id);
    if (!track) return;
    try {
      await removeMusicTrack(id);
      const url = objectUrls.current.get(id);
      if (url) URL.revokeObjectURL(url);
      objectUrls.current.delete(id);
      setPersonalTracks((current) => current.filter((item) => item.id !== id));
      if (selectedTrackRef.current === id) {
        resumeAfterTrackChange.current = false;
        setSelectedTrackId(builtInMusicTracks[0]?.id || "");
      }
      setMessage(t("music.removed"));
      setError("");
    } catch {
      setError(t("music.removeError"));
    }
  }

  useEffect(() => {
    const saved = readPreferences();
    preferencesRef.current = saved;
    setDuckDuringReadAloudState(saved.duckDuringReadAloud);
    setEnabledState(saved.enabled);
    setCurrentTime(saved.lastPosition);
    setLoopState(saved.loop);
    setSelectedTrackId(saved.selectedTrackId);
    setShuffleState(saved.shuffle);
    setVolumeState(saved.volume);
    hydrated.current = true;
    setPreferencesReady(true);

    let active = true;
    void listMusicTracks()
      .then((stored) => {
        if (!active) return;
        const restored = stored.filter(isStoredTrack).map((track) => {
          const src = URL.createObjectURL(track.blob);
          objectUrls.current.set(track.id, src);
          return { ...track, artist: t("music.personalArtist"), description: t("music.personalDescription"), source: "personal" as const, src };
        });
        setPersonalTracks(restored);
      })
      .catch(() => setError(t("music.readError")))
      .finally(() => {
        if (active) setPersonalTracksReady(true);
      });

    return () => {
      active = false;
      audio.current?.pause();
      if (audio.current) {
        audio.current.removeAttribute("src");
        audio.current.load();
      }
      for (const url of objectUrls.current.values()) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    };
  }, [t]);

  useEffect(() => {
    if (!personalTracksReady || !tracks.length) return;
    if (!tracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(tracks[0].id);
      setCurrentTime(0);
    }
  }, [selectedTrackId, tracks]);

  useEffect(() => {
    if (!preferencesReady) return;
    persistPosition(currentTime);
  }, [duckDuringReadAloud, enabled, loop, preferencesReady, selectedTrackId, shuffle, volume]);

  useEffect(() => {
    const element = audio.current;
    if (!preferencesReady || !personalTracksReady || !element || !currentTrack) return;
    const shouldResume = resumeAfterTrackChange.current;
    resumeAfterTrackChange.current = false;
    const savedPosition = currentTrack.id === preferencesRef.current.positionTrackId ? preferencesRef.current.lastPosition : 0;

    element.pause();
    updatePlaying(false);
    element.loop = loopRef.current;
    element.volume = effectiveVolume();
    setDuration(0);
    setCurrentTime(0);
    let disposed = false;

    const onMetadata = () => {
      if (disposed) return;
      const nextDuration = Number.isFinite(element.duration) ? element.duration : 0;
      const restoredPosition = Math.max(0, Math.min(nextDuration || 0, savedPosition));
      if (restoredPosition) element.currentTime = restoredPosition;
      setDuration(nextDuration);
      setCurrentTime(restoredPosition);
      if (shouldResume && enabledRef.current) {
        void element.play().then(() => {
          if (!disposed) updatePlaying(true);
        }).catch(() => {
          if (!disposed) {
            updatePlaying(false);
            setError(t("music.resumeError"));
          }
        });
      }
    };
    const onTimeUpdate = () => {
      const position = element.currentTime || 0;
      setCurrentTime(position);
      const second = Math.floor(position);
      if (second !== lastSavedSecond.current) {
        lastSavedSecond.current = second;
        persistPosition(position);
      }
    };
    const onPlay = () => updatePlaying(true);
    const onPause = () => updatePlaying(false);
    const onEnded = () => {
      updatePlaying(false);
      if (!element.loop) selectRelativeTrack(1, true);
    };
    const onError = () => {
      updatePlaying(false);
      setError(t("music.corrupted"));
    };

    element.addEventListener("loadedmetadata", onMetadata);
    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    element.src = currentTrack.src;
    element.load();

    return () => {
      disposed = true;
      element.pause();
      element.removeEventListener("loadedmetadata", onMetadata);
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
    };
  }, [currentTrack?.id, currentTrack?.src, personalTracksReady, preferencesReady, t]);

  useEffect(() => {
    if (audio.current) audio.current.loop = loop;
  }, [loop]);

  useEffect(() => {
    if (audio.current) audio.current.volume = effectiveVolume();
  }, [ducked, volume]);

  useEffect(() => {
    const saveBeforeClose = () => persistPosition(audio.current?.currentTime || 0);
    window.addEventListener("pagehide", saveBeforeClose);
    return () => window.removeEventListener("pagehide", saveBeforeClose);
  }, []);

  const value: MusicContextValue = {
    addUserTrack,
    currentTime,
    currentTrack,
    duckDuringReadAloud,
    ducked,
    duration,
    enabled,
    error,
    isPlaying,
    loop,
    lowerForReadAloud,
    message,
    nextTrack: () => selectRelativeTrack(1),
    pause,
    play,
    previousTrack: () => selectRelativeTrack(-1),
    removeUserTrack,
    renameUserTrack,
    restoreAfterReadAloud,
    seek,
    selectTrack,
    setDuckDuringReadAloud,
    setEnabled,
    setLoop,
    setShuffle,
    setVolume,
    shuffle,
    tracks,
    userTracks: personalTracks,
    volume,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio ref={audio} preload="metadata" />
      <GlobalMusicPlayer />
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const value = useContext(MusicContext);
  if (!value) throw new Error("useMusic must be used within MusicProvider.");
  return value;
}

export function ReadingMusicSettings() {
  const { t } = useI18n();
  const {
    addUserTrack,
    currentTime,
    currentTrack,
    duckDuringReadAloud,
    duration,
    enabled,
    error,
    isPlaying,
    loop,
    message,
    nextTrack,
    pause,
    play,
    previousTrack,
    seek,
    selectTrack,
    setDuckDuringReadAloud,
    setEnabled,
    setLoop,
    setShuffle,
    setVolume,
    shuffle,
    tracks,
    userTracks,
    volume,
  } = useMusic();

  return (
    <article className="settings-card music-dashboard-card" id="reading-music">
      <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="music" size={21} /></span><div><p className="eyebrow">{t("music.settingsEyebrow")}</p><h2>{t("music.heading")}</h2></div></div>
      <div className="music-settings-grid">
        <div className="music-settings-summary">
          <div><span className="eyebrow">{t("music.nowPlaying")}</span><strong>{currentTrack?.title || t("music.noTrackAvailable")}</strong><p>{currentTrack?.artist || t("music.artistFallback")}</p></div>
          <button aria-checked={enabled} aria-label={t("music.enableAria")} className="switch-control" onClick={() => setEnabled(!enabled)} role="switch" type="button" />
        </div>

        <div className="music-settings-playback">
          <div className="music-playback-buttons">
            <button aria-label={t("music.previousAria")} className="reader-control-button" disabled={!tracks.length} onClick={previousTrack} type="button"><Icon name="skip-back" size={17} /></button>
            <button aria-label={isPlaying ? t("music.pauseAria") : t("music.playAria")} className="reader-control-button active" disabled={!enabled || !currentTrack} onClick={() => isPlaying ? pause() : void play()} type="button"><Icon name={isPlaying ? "pause" : "play"} size={16} />{isPlaying ? t("music.pause") : t("music.play")}</button>
            <button aria-label={t("music.nextAria")} className="reader-control-button" disabled={!tracks.length} onClick={nextTrack} type="button"><Icon name="skip-forward" size={17} /></button>
          </div>
          <div className="music-time-row"><span>{formatTime(currentTime)}</span><input aria-label={t("music.progressAria")} disabled={!duration} max={duration || 0} min="0" onChange={(event) => seek(Number(event.target.value))} step="0.1" type="range" value={Math.min(currentTime, duration || 0)} /><span>{formatTime(duration)}</span></div>
        </div>

        <label className="music-select-label">{t("music.track")}<select aria-label={t("music.selectAria")} disabled={!tracks.length} onChange={(event) => selectTrack(event.target.value)} value={currentTrack?.id || ""}>
          <optgroup label={t("music.builtInGroup")}>{tracks.filter((track) => track.source === "built-in").map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</optgroup>
          {userTracks.length > 0 && <optgroup label={t("music.personalGroup")}>{userTracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</optgroup>}
        </select></label>
        <label className="music-range-label">{t("common.volume")} <span>{Math.round(volume * 100)}%</span><input aria-label={t("music.volumeAria")} max="1" min="0" onChange={(event) => setVolume(Number(event.target.value))} step="0.01" type="range" value={volume} /></label>
      </div>

      <div className="music-preference-toggles">
        <div className="music-toggle"><div><strong>{t("music.loopTitle")}</strong><p>{t("music.loopBody")}</p></div><button aria-checked={loop} aria-label={t("music.loopAria")} className="switch-control" onClick={() => setLoop(!loop)} role="switch" type="button" /></div>
        <div className="music-toggle"><div><strong>{t("music.shuffleTitle")}</strong><p>{t("music.shuffleBody")}</p></div><button aria-checked={shuffle} aria-label={t("music.shuffleAria")} className="switch-control" onClick={() => setShuffle(!shuffle)} role="switch" type="button" /></div>
        <div className="music-toggle"><div><strong>{t("music.voiceDuckTitle")}</strong><p>{t("music.voiceDuckBody")}</p></div><button aria-checked={duckDuringReadAloud} aria-label={t("music.voiceDuckAria")} className="switch-control" onClick={() => setDuckDuringReadAloud(!duckDuringReadAloud)} role="switch" type="button" /></div>
      </div>

      <div className="personal-music-section">
        <div><p className="eyebrow">{t("music.uploadEyebrow")}</p><h3>{t("music.uploadHeading")}</h3><p>{t("music.supportedFiles")}</p></div>
        <label className="outline-button music-upload-button" htmlFor="music-upload"><Icon name="upload" size={16} />{t("music.uploadButton")}<input accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/flac,audio/opus,audio/webm,.mp3,.wav,.ogg,.aac,.m4a,.flac,.opus,.webm" id="music-upload" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void addUserTrack(file); }} type="file" /></label>
      </div>
      {userTracks.length > 0 && <div className="personal-track-list">{userTracks.map((track) => <PersonalTrackRow key={track.id} track={track} />)}</div>}
      {error && <p className="music-feedback error" role="alert">{error}</p>}
      {message && <p className="music-feedback" role="status">{message}</p>}
    </article>
  );
}

function GlobalMusicPlayer() {
  const { currentTime, currentTrack, ducked, duration, enabled, isPlaying, nextTrack, pause, play, previousTrack, seek } = useMusic();
  const { t } = useI18n();
  if (!currentTrack || !enabled) return null;

  return (
    <aside aria-label={t("music.globalAria")} className="global-music-player">
      <div className="global-music-art"><Icon name="music" size={19} /></div>
      <div className="global-music-track"><span>{isPlaying ? t("music.nowPlaying") : t("music.ready")}</span><strong>{currentTrack.title}</strong>{ducked && <small>{t("music.ducked")}</small>}</div>
      <div className="global-music-controls">
        <button aria-label={t("music.previousAria")} onClick={previousTrack} type="button"><Icon name="skip-back" size={17} /></button>
        <button aria-label={isPlaying ? t("music.pauseAria") : t("music.playAria")} className="global-play-button" onClick={() => isPlaying ? pause() : void play()} type="button"><Icon name={isPlaying ? "pause" : "play"} size={16} /></button>
        <button aria-label={t("music.nextAria")} onClick={nextTrack} type="button"><Icon name="skip-forward" size={17} /></button>
      </div>
      <div className="global-music-progress"><span>{formatTime(currentTime)}</span><input aria-label={t("music.globalProgressAria")} disabled={!duration} max={duration || 0} min="0" onChange={(event) => seek(Number(event.target.value))} step="0.1" type="range" value={Math.min(currentTime, duration || 0)} /><span>{formatTime(duration)}</span></div>
    </aside>
  );
}
