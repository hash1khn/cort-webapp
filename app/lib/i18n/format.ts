import type { Locale } from "@/i18n/config";

export function formatLocaleDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-PK", options);
}

export function formatLocaleTime(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-PK", options);
}

export function formatLocaleNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(locale === "ar" ? "ar-SA" : "en-PK", options);
}
