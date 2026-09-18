"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import { ReadingMusicSettings } from "@/components/music-provider";
import { PwaInstall } from "@/components/pwa-install";
import { Shell } from "@/components/shell";
import { getReadingChallenge, saveReadingChallenge, type ReadingChallenge } from "@/lib/community";
import { clearLocalReadingData, exportLocalReadingData, getReadingStreak, getSetting, saveSetting } from "@/lib/storage";

type Theme = "dark" | "light";
type ReaderFont = "system" | "serif" | "sans" | "poppins";
type ReaderMode = "paper" | "sepia" | "night";
type ReaderPreferences = { font: ReaderFont; fontSize: number; lineHeight: number; mode: ReaderMode };
const defaultReaderPreferences: ReaderPreferences = { font: "system", fontSize: 18, lineHeight: 1.5, mode: "paper" };

function formatAccountDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function Settings() {
  const { changePassword, createAccount, enabled: firebaseEnabled, error: authError, loading: authLoading, login, loginWithGoogle, logout, logoutAllSessions, profile, requiresEmailVerification, updateUserProfile, user } = useAuth();
  const router = useRouter();
  const { language, languages, setLanguage, t } = useI18n();
  const [challenge, setChallenge] = useState<ReadingChallenge>({ completedBooks: 0, goalBooks: 12 });
  const [email, setEmail] = useState("");
  const [localStreak, setLocalStreak] = useState({ readToday: false, streak: 0 });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [privateProfile, setPrivateProfile] = useState(true);
  const [readerPreferences, setReaderPreferences] = useState<ReaderPreferences>(defaultReaderPreferences);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    void Promise.all([getSetting<Theme>("theme"), getReadingChallenge(), getReadingStreak(), getSetting<boolean>("account-private"), getSetting<Partial<ReaderPreferences>>("reader-preferences")]).then(([savedTheme, savedChallenge, savedStreak, savedPrivate, savedReader]) => { if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme); setChallenge(savedChallenge); setLocalStreak(savedStreak); if (typeof savedPrivate === "boolean") setPrivateProfile(savedPrivate); if (savedReader) setReaderPreferences((current) => ({ ...current, ...savedReader })); }).catch(() => setStatus("Some local settings could not be loaded."));
  }, []);

  useEffect(() => { setProfileName(profile?.displayName || user?.displayName || ""); setProfilePhoto(profile?.photoURL || user?.photoURL || ""); }, [profile?.displayName, profile?.photoURL, user?.displayName, user?.photoURL]);

  useEffect(() => {
    if (user && requiresEmailVerification) router.push("/verify-email");
  }, [requiresEmailVerification, router, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    void saveSetting("theme", theme).catch(() => setStatus("Website theme could not be saved."));
  }, [theme]);

  const submit = useCallback(async (register: boolean) => {
    if (saving || authLoading) return;
    setSaving(true);
    setStatus("");
    try {
      if (register) {
        await createAccount(email, password, confirmPassword, name);
        router.push("/verify-email");
        return;
      }
      await login(email, password);
      setStatus(t("settings.accountStatusSignedIn"));
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message.replace("Firebase: ", "") : t("settings.accountStatusFailed"));
    } finally { setSaving(false); }
  }, [authLoading, confirmPassword, createAccount, login, name, password, requiresEmailVerification, router, saving, t]);

  const socialLogin = useCallback(async () => {
    if (saving || authLoading) return;
    setSaving(true);
    setStatus("");
    try {
      await loginWithGoogle();
      setStatus(t("settings.accountStatusSignedIn"));
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message.replace("Firebase: ", "") : t("settings.accountStatusFailed"));
    } finally { setSaving(false); }
  }, [authLoading, loginWithGoogle, saving, t]);

  const signOutAccount = useCallback(async () => {
    if (saving) return; setSaving(true);
    try {
      await logout();
      setStatus(t("settings.accountStatusSignedOut"));
    } catch {
      setStatus(t("settings.accountStatusSignOutFailed"));
    } finally { setSaving(false); }
  }, [logout, saving, t]);
  const signOutEverywhere = useCallback(async () => {
    if (saving) return; setSaving(true);
    try { await logoutAllSessions(); setStatus("Signed out on all sessions."); }
    catch (reason) { setStatus(reason instanceof Error ? reason.message : "Could not sign out every session."); }
    finally { setSaving(false); }
  }, [logoutAllSessions, saving]);

  const plan = profile?.planType === "premium"
    ? t("account.plan.premium")
    : profile?.planType === "free"
      ? t("account.plan.free")
      : t("account.plan.unavailable");
  const streak = typeof profile?.currentStreak === "number" ? profile.currentStreak : localStreak.streak;
  const usesTrustedStreak = typeof profile?.currentStreak === "number";
  const challengePercent = useMemo(() => Math.min(100, (challenge.completedBooks / Math.max(1, challenge.goalBooks)) * 100), [challenge]);
  const createdAt = formatAccountDate(profile?.createdAt || user?.metadata.creationTime);

  const updateChallenge = useCallback(async (next: ReadingChallenge) => {
    setChallenge(next);
    try { await saveReadingChallenge(next); } catch { setStatus("Reading goal could not be saved."); }
  }, []);

  const saveProfile = useCallback(async () => {
    if (saving) return; setSaving(true);
    try { await updateUserProfile({ displayName: profileName, photoURL: profilePhoto, preferences: { language, theme, reading: readerPreferences } }); setStatus("Profile updated."); }
    catch (reason) { setStatus(reason instanceof Error ? reason.message : "Profile could not be updated."); }
    finally { setSaving(false); }
  }, [language, profileName, profilePhoto, readerPreferences, saving, theme, updateUserProfile]);
  const savePassword = useCallback(async () => {
    if (saving) return; setSaving(true); setStatus("");
    try { await changePassword(currentPassword, nextPassword); setCurrentPassword(""); setNextPassword(""); setStatus("Password changed. Other sessions may remain active until their Firebase tokens refresh."); }
    catch (reason) { setStatus(reason instanceof Error ? reason.message : "Password could not be changed."); }
    finally { setSaving(false); }
  }, [changePassword, currentPassword, nextPassword, saving]);
  const saveReaderPreferences = useCallback((next: ReaderPreferences) => { setReaderPreferences(next); void saveSetting("reader-preferences", next).catch(() => setStatus("Reader preferences could not be saved.")); }, []);
  const exportData = useCallback(async () => { try { const payload = await exportLocalReadingData(); const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = href; link.download = "myne-reading-data.json"; link.click(); URL.revokeObjectURL(href); } catch { setStatus("Reading data could not be exported."); } }, []);
  const clearData = useCallback(async () => {
    if (!window.confirm("Remove downloaded books and reading progress from this browser?")) return;
    try { await clearLocalReadingData(); setStatus("Local reading data removed."); } catch { setStatus("Local reading data could not be removed."); }
  }, []);

  return (
    <Shell>
      <section className="page-introduction settings-introduction">
        <div><p className="eyebrow">{t("settings.introEyebrow")}</p><h1>{t("settings.title")}</h1><p>{t("settings.introBody")}</p></div>
      </section>

      <section className="settings-dashboard">
        <article className="settings-card settings-account-card" id="account">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="home" size={21} /></span><div><p className="eyebrow">{t("common.account")}</p><h2>{t("settings.accountHeading")}</h2></div></div>
          {!firebaseEnabled ? (
            <p className="settings-note">{t("settings.accountNoFirebase")}</p>
          ) : user ? (
            <>
              <div className="account-profile-summary">
                <div className="account-avatar">
                  {profile?.photoURL ? <Image alt={t("settings.accountPhotoAlt", { name: profile.displayName })} height={48} src={profile.photoURL} unoptimized width={48} /> : <span>{(profile?.displayName || user.email || "M").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div>
                  <strong>{profile?.displayName || user.displayName || user.email}</strong>
                  <p className="account-email">{profile?.email || user.email}</p>
                  {createdAt && <small>{t("settings.accountCreatedAt", { date: createdAt })}</small>}
                </div>
              </div>
              <div className="profile-stat-grid" aria-label={t("settings.profileStats")}>
                <span><strong>{profile?.readingStats.savedBooksCount || 0}</strong>{t("settings.profileSaved")}</span>
                <span><strong>{profile?.readingStats.favoritesCount || 0}</strong>{t("settings.profileFavorites")}</span>
                <span><strong>{profile?.purchasedBookIds.length || 0}</strong>{t("settings.profilePurchased")}</span>
                <span><strong>{profile?.wishlistBookIds.length || 0}</strong>{t("settings.profileWishlist")}</span>
                <span><strong>{profile?.readingStats.streak || 0}</strong>{t("settings.profileStreak")}</span>
              </div>
              {authError && <p className="settings-note" role="status">{authError}</p>}
              {requiresEmailVerification && <div className="settings-note" role="status"><p>Your email address has not been verified yet.</p><button className="text-link" onClick={() => router.push("/verify-email")} type="button">Verify your email</button></div>}
              <div className="profile-edit-row"><label>Display name<input onChange={(event) => setProfileName(event.target.value)} value={profileName} /></label><label>Profile photo URL<input onChange={(event) => setProfilePhoto(event.target.value)} type="url" value={profilePhoto} /></label><button className="outline-button" disabled={saving} onClick={() => void saveProfile()} type="button">Save profile</button></div>
              {user.providerData.some((provider) => provider.providerId === "password") && <div className="profile-edit-row"><label>Current password<input autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} type="password" value={currentPassword} /></label><label>New password<input autoComplete="new-password" onChange={(event) => setNextPassword(event.target.value)} type="password" value={nextPassword} /></label><button className="outline-button" disabled={saving || !currentPassword || !nextPassword} onClick={() => void savePassword()} type="button">Change password</button></div>}
              <button className="outline-button" disabled={saving} onClick={() => void signOutAccount()} type="button">{t("settings.logOut")}</button>
              <button className="text-link" disabled={saving} onClick={() => void signOutEverywhere()} type="button">Sign out on all devices</button>
            </>
          ) : (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void submit(false); }}>
              <p>{t("settings.accountBody")}</p>
              <label>{t("settings.accountName")}<input autoComplete="name" onChange={(event) => setName(event.target.value)} type="text" value={name} /></label>
              <label>{t("settings.email")}<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
              <label>{t("settings.password")}<input autoComplete="current-password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
              <label>Confirm password<input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></label>
              <small>Use at least 10 characters with uppercase, lowercase, and a number. Confirmation is required when creating an account.</small>
              <div className="auth-actions"><button className="primary-button" disabled={authLoading || saving} type="submit">{t("settings.logIn")}</button><button className="outline-button" disabled={authLoading || saving} onClick={() => void submit(true)} type="button">{t("settings.createAccount")}</button></div>
              <Link className="text-link" href="/forgot-password">Forgot password</Link>
              <div className="social-auth-actions">
                <button className="outline-button" disabled={authLoading || saving} onClick={() => void socialLogin()} type="button">{t("settings.googleLogin")}</button>
              </div>
            </form>
          )}
          {status && <p className="status-message" role="status">{status}</p>}
        </article>

        <article className="settings-card plan-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="star" size={21} /></span><div><p className="eyebrow">{t("settings.planHeading", { plan })}</p><h2>{t("settings.planHeading", { plan })}</h2></div></div>
          <p>{user ? t("settings.planBodySignedIn") : t("settings.planBodySignedOut")}</p>
          {authError && <small>{authError}</small>}
        </article>

        <article className="settings-card language-dashboard-card" id="language">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="globe" size={21} /></span><div><p className="eyebrow">{t("language.eyebrow")}</p><h2>{t("language.heading")}</h2></div></div>
          <p>{t("language.description")}</p>
          <label className="language-select-label">
            {t("language.selectLabel")}
            <select onChange={(event) => setLanguage(event.target.value === "en" ? "en" : language)} value={language}>
              {languages.map((option) => (
                <option disabled={!option.available} key={option.code} value={option.code}>
                  {option.label} - {option.available ? t("language.available") : t("language.comingSoon")}
                </option>
              ))}
            </select>
          </label>
          <div className="language-option-list">
            {languages.map((option) => (
              <div className={option.code === language ? "language-option active" : "language-option"} key={option.code}>
                <strong>{option.label}</strong>
                <span>{option.nativeLabel}</span>
                <small>{option.available ? t("language.available") : t("language.comingSoon")}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="settings-card appearance-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="contrast" size={21} /></span><div><p className="eyebrow">{t("settings.appearanceTitle")}</p><h2>{t("settings.appearanceHeading")}</h2></div></div>
          <div className="settings-control-row"><div><strong>{t("settings.appearanceTitle")}</strong><p>{t("settings.appearanceBody")}</p></div><button aria-checked={theme === "dark"} aria-label={t("settings.appearanceToggle")} className="switch-control" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} role="switch" type="button" /></div>
        </article>

        <article className="settings-card reading-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="book" size={21} /></span><div><p className="eyebrow">{t("settings.readingHeading")}</p><h2>{t("settings.readingHeading")}</h2></div></div>
          <p>{t("settings.readingBody")}</p>
          <div className="reading-preference-grid">
            <label>Default font<select onChange={(event) => saveReaderPreferences({ ...readerPreferences, font: event.target.value as ReaderFont })} value={readerPreferences.font}><option value="system">System default</option><option value="serif">Serif</option><option value="sans">Sans serif</option><option value="poppins">Poppins</option></select></label>
            <label>Text size <span>{readerPreferences.fontSize}px</span><input max="28" min="14" onChange={(event) => saveReaderPreferences({ ...readerPreferences, fontSize: Number(event.target.value) })} type="range" value={readerPreferences.fontSize} /></label>
            <label>Line height<select onChange={(event) => saveReaderPreferences({ ...readerPreferences, lineHeight: Number(event.target.value) })} value={readerPreferences.lineHeight}><option value="1.4">Compact</option><option value="1.5">Comfortable</option><option value="1.8">Relaxed</option></select></label>
            <label>Reader theme<select onChange={(event) => saveReaderPreferences({ ...readerPreferences, mode: event.target.value as ReaderMode })} value={readerPreferences.mode}><option value="paper">Paper</option><option value="sepia">Sepia</option><option value="night">Night</option></select></label>
          </div>
          <span className="reading-settings-note">These preferences open with your next book.</span>
        </article>

        <article className="settings-card privacy-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="settings" size={21} /></span><div><p className="eyebrow">Privacy & data</p><h2>Keep your reading private</h2></div></div>
          <div className="settings-control-row"><div><strong>Private profile</strong><p>Keep your account activity personal by default.</p></div><button aria-checked={privateProfile} className="switch-control" onClick={() => { const next = !privateProfile; setPrivateProfile(next); void saveSetting("account-private", next); }} role="switch" type="button" /></div>
          <div className="privacy-actions"><button className="outline-button" onClick={() => void exportData()} type="button">Export reading data</button><button className="danger-button" onClick={() => void clearData()} type="button">Clear local reading data</button></div>
        </article>

        <article className="settings-card pwa-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="download" size={21} /></span><div><p className="eyebrow">{t("pwa.title")}</p><h2>{t("settings.pwaHeading")}</h2></div></div>
          <PwaInstall />
        </article>

        <ReadingMusicSettings />

        <article className="settings-card streak-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="check" size={21} /></span><div><p className="eyebrow">{t("settings.streakEyebrow")}</p><h2>{streak === 1 ? t("settings.streakHeadingSingular") : t("settings.streakHeadingPlural", { count: streak })}</h2></div></div>
          <p>{usesTrustedStreak ? t("settings.streakFirebase") : localStreak.readToday ? t("settings.streakLocalDone") : t("settings.streakLocalStart")}</p>
          <div aria-label={t("settings.streakProgressAria", { count: Math.min(streak, 7) })} className="streak-track"><span style={{ width: `${Math.min(100, (streak / 7) * 100)}%` }} /></div>
          <small>{usesTrustedStreak ? t("settings.streakTrusted") : t("settings.streakLocalStatus", { status: localStreak.readToday ? t("settings.streakRead") : t("settings.streakUnread") })}</small>
        </article>

        <article className="settings-card challenge-dashboard-card">
          <div className="settings-card-heading"><span className="settings-card-icon"><Icon name="star" size={21} /></span><div><p className="eyebrow">{t("settings.challengeEyebrow")}</p><h2>{t("settings.challengeHeading")}</h2></div></div>
          <p>{t("settings.challengeBody")}</p>
          <div className="challenge-controls">
            <label>{t("settings.challengeGoalBooks")}<input min="1" onChange={(event) => void updateChallenge({ ...challenge, goalBooks: Number(event.target.value) || 1 })} type="number" value={challenge.goalBooks} /></label>
            <label>{t("settings.challengeCompleted")}<input min="0" onChange={(event) => void updateChallenge({ ...challenge, completedBooks: Number(event.target.value) || 0 })} type="number" value={challenge.completedBooks} /></label>
          </div>
          <div aria-label={`${Math.round(challengePercent)} percent of reading challenge`} className="streak-track"><span style={{ width: `${challengePercent}%` }} /></div>
          <small>{t("settings.challengeProgress", { percent: Math.round(challengePercent) })}</small>
        </article>
      </section>
    </Shell>
  );
}
