"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/components/language-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setMessage(t("pwa.notSupported"));
      return;
    }
    void navigator.serviceWorker.register("/sw.js").then(() => setReady(true)).catch(() => setMessage(t("pwa.registrationFailed")));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [t]);

  async function install() {
    if (!deferredPrompt) {
      setMessage(t("pwa.noPrompt"));
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? t("pwa.installStarted") : t("pwa.dismissed"));
    setDeferredPrompt(null);
  }

  return (
    <div className="pwa-install-panel">
      <div>
        <strong>{ready ? t("pwa.ready") : t("pwa.title")}</strong>
        <p>{t("pwa.description")}</p>
      </div>
      <button className="outline-button" onClick={() => void install()} type="button"><Icon name="download" size={17} />{t("common.install")}</button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
