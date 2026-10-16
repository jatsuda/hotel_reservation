"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, Locale, TranslationShape } from "./i18n/translations";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationShape;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = "hotel_locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read the saved preference once on mount (after hydration, to avoid a
  // server/client markup mismatch since localStorage isn't available server-side).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "th") {
      setLocaleState(saved);
    }
  }, []);

  // Mirrors the active locale onto <html data-locale="..."> so plain CSS
  // (see globals.css) can swap --font-active between Poppins and Prompt
  // without needing every component to read the context just for fonts.
  useEffect(() => {
    document.documentElement.setAttribute("data-locale", locale);
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function toggleLocale() {
    setLocale(locale === "en" ? "th" : "en");
  }

  const t = translations[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
