import type { Locale } from "./config";
import enCommon from "../messages/en/common.json";
import enCompany from "../messages/en/company.json";
import arCommon from "../messages/ar/common.json";
import arCompany from "../messages/ar/company.json";

const messagesByLocale = {
  en: { ...enCommon, ...enCompany },
  ar: { ...arCommon, ...arCompany },
} as const;

export function loadMessages(locale: Locale) {
  return messagesByLocale[locale] ?? messagesByLocale.en;
}
