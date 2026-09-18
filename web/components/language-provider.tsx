"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  en,
  languageOptions,
  languageSettingKey,
  type LanguageCode,
  type LanguageOption,
  type MessageKey,
} from "@/lib/i18n/messages";
import { getSetting, saveSetting } from "@/lib/storage";

type TranslationValues = Record<string, number | string>;

type LanguageContextValue = {
  language: LanguageCode;
  languages: LanguageOption[];
  setLanguage: (language: LanguageCode) => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

function isSupportedLanguage(value: unknown): value is LanguageCode {
  return value === "en";
}

export function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);

  useEffect(() => {
    let active = true;
    void getSetting<LanguageCode>(languageSettingKey)
      .then((saved) => {
        if (active && isSupportedLanguage(saved)) setLanguageState(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const option = languageOptions.find((item) => item.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = option?.direction || "ltr";
    void saveSetting(languageSettingKey, language).catch(() => undefined);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    languages: languageOptions,
    setLanguage: setLanguageState,
    t: (key, values) => interpolate(en[key], values),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useI18n must be used within LanguageProvider.");
  return value;
}
