"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const links = [
  { href: "/", labelKey: "shell.navHome" },
  { href: "/browse", labelKey: "shell.navBrowse" },
  { href: "/categories", labelKey: "shell.navCategories" },
  { href: "/categories#mood-match", labelKey: "shell.navMood" },
  { href: "/online", labelKey: "shell.navOnline" },
  { href: "/library", labelKey: "shell.navLibrary" },
  { href: "/settings", labelKey: "shell.navSettings" },
] satisfies { href: string; labelKey: MessageKey }[];

const footerLinks = [
  { href: "/", labelKey: "shell.navHome" },
  { href: "/browse", labelKey: "shell.footerBrowse" },
  { href: "/online", labelKey: "shell.footerOnline" },
  { href: "/library", labelKey: "shell.footerLibrary" },
  { href: "/settings", labelKey: "common.account" },
] satisfies { href: string; labelKey: MessageKey }[];

type NavigationItem = { href: string; icon?: "book" | "grid" | "home" | "library" | "search" | "settings" | "globe"; labelKey: MessageKey };
const appNavigation: NavigationItem[] = [{ href: "/", icon: "home", labelKey: "shell.navHome" }, { href: "/browse", icon: "search", labelKey: "shell.navBrowse" }, { href: "/library", icon: "library", labelKey: "shell.navLibrary" }, { href: "/settings", icon: "settings", labelKey: "shell.navSettings" }];

function isCurrent(pathname: string, href: string) {
  const route = href.split("#")[0];
  return route === "/" ? pathname === route : pathname.startsWith(route) && !href.includes("#");
}

function SiteNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("shell.primaryNavigation")} className="site-navigation">
      {links.map((link) => (
        <Link
          aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
          href={link.href}
          key={link.href}
          onClick={onNavigate}
        >
          {t(link.labelKey)}
        </Link>
      ))}
    </nav>
  );
}

function HeaderSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t } = useI18n();

  const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/browse?search=${encodeURIComponent(value)}` : "/browse");
    onNavigate?.();
  }, [onNavigate, query, router]);

  return (
    <form className="site-search" onSubmit={submit} role="search">
      <Icon name="search" size={19} />
      <input
        aria-label={t("shell.searchAria")}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("shell.searchPlaceholder")}
        type="search"
        value={query}
      />
      <button aria-label={t("common.search")} type="submit">{t("common.search")}</button>
    </form>
  );
}

function Footer() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <span className="site-logo-mark" aria-hidden="true">m</span>
          <div><strong>{t("common.myne")}</strong><p>{t("shell.footerTagline")}</p></div>
        </div>
        <p className="footer-note">{t("shell.footerNote")}</p>
        <nav aria-label={t("shell.primaryNavigation")} className="footer-navigation">
          {footerLinks.map((link) => <Link href={link.href} key={link.href}>{t(link.labelKey)}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

function AppNavigation({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const className = compact ? "mobile-bottom-navigation" : "desktop-sidebar-navigation";
  return (
    <nav aria-label="App navigation" className={className}>
      {appNavigation.map((item) => (
        <Link aria-current={isCurrent(pathname, item.href) ? "page" : undefined} href={item.href} key={item.href}>
          <Icon name={item.icon!} size={compact ? 21 : 20} />
          <span>{t(item.labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}

function DesktopSidebar() {
  const { t } = useI18n();
  return (
    <aside className="desktop-sidebar">
      <Link aria-label={t("common.myne")} className="site-brand desktop-sidebar-brand" href="/">
        <span className="site-logo-mark" aria-hidden="true">m</span>
        <span><strong>{t("common.myne")}</strong><small>YOUR READING SPACE</small></span>
      </Link>
      <AppNavigation />
      <div className="desktop-sidebar-secondary">
        <Link href="/categories"><Icon name="grid" size={19} />{t("shell.navCategories")}</Link>
        <Link href="/online"><Icon name="globe" size={19} />{t("shell.navOnline")}</Link>
      </div>
      <Link className="desktop-sidebar-account" href="/settings#account"><Icon name="settings" size={18} />{t("shell.accountLink")}</Link>
    </aside>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); }; window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [closeMenu]);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link aria-label={t("common.myne")} className="site-brand" href="/" onClick={() => setMenuOpen(false)}>
            <span className="site-logo-mark" aria-hidden="true">m</span>
            <span><strong>{t("common.myne")}</strong><small>{t("shell.brandSubtitle")}</small></span>
          </Link>
          <HeaderSearch />
          <div className="desktop-header-links"><Link className="account-link" href="/settings#account">{t("shell.accountLink")}</Link></div>
          <button
            aria-controls="mobile-site-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("shell.menuClose") : t("shell.menuOpen")}
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name={menuOpen ? "close" : "menu"} size={23} />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-site-menu" id="mobile-site-menu">
            <div className="mobile-site-menu-inner">
              <SiteNavigation onNavigate={() => setMenuOpen(false)} />
              <Link className="account-link" href="/settings#account" onClick={() => setMenuOpen(false)}>{t("common.loginAccount")}</Link>
            </div>
          </div>
        )}
      </header>
      <div className="app-layout">
        <DesktopSidebar />
        <main className="site-main">{children}</main>
      </div>
      <Footer />
      <AppNavigation compact />
    </div>
  );
}
