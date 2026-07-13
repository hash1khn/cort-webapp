"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import {
  defaultLocale,
  isRtlLocale,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  type Locale,
  locales,
} from "@/i18n/config";
import { loadMessages } from "@/i18n/load-messages";
import { isSaudiRoute } from "@/app/lib/i18n/saudi-route";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  isRtl: boolean;
  isSaudiRoute: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  toggleLocale: () => {},
  isRtl: false,
  isSaudiRoute: false,
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  return defaultLocale;
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function CompanyLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const onSaudiRoute = isSaudiRoute(pathname);

  useEffect(() => {
    const initial = onSaudiRoute ? readStoredLocale() || "ar" : defaultLocale;
    setLocaleState(initial);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, initial);
    }
    applyDocumentLocale(initial);
    setMounted(true);
  }, [onSaudiRoute]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!onSaudiRoute) return;
      setLocaleState(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      applyDocumentLocale(next);
    },
    [onSaudiRoute],
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const messages = useMemo(() => loadMessages(locale), [locale]);
  const isRtl = isRtlLocale(locale);

  if (!mounted) {
    return (
      <NextIntlClientProvider locale={defaultLocale} messages={loadMessages(defaultLocale)}>
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, isRtl, isSaudiRoute: onSaudiRoute }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export const useCompanyLocale = () => useContext(LocaleContext);
