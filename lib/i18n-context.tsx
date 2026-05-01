"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LANGUAGE, t, isLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const LANGUAGE_STORAGE_KEY = "formwise-language";

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  translate: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? undefined;
    if (isLanguage(stored)) {
      setLanguageState(stored);
      document.documentElement.lang = stored;
      return;
    }

    document.documentElement.lang = DEFAULT_LANGUAGE;
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string>) => t(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      translate,
    }),
    [language, setLanguage, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }

  return context;
}
