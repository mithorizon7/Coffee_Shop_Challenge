import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ICU from "i18next-icu";

import en from "../locales/en.json";
import lv from "../locales/lv.json";
import ru from "../locales/ru.json";

const isDev = import.meta.env.DEV;

i18n
  .use(ICU)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      lv: { translation: lv },
      ru: { translation: ru },
    },
    // Fallback chain: lv (Latvia context) -> en (English as final fallback)
    fallbackLng: ["lv", "en"],
    supportedLngs: ["en", "lv", "ru"],

    // Language detection: localStorage (user pref) -> navigator (browser)
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    // Missing key handling
    saveMissing: isDev,
    missingKeyHandler: isDev
      ? (lngs, ns, key) => {
          console.warn(`[MISSING TRANSLATION] ${lngs.join("/")}: ${ns}:${key}`);
        }
      : undefined,

    // In dev mode, show missing keys clearly; in prod, use fallback
    returnEmptyString: false,
    parseMissingKeyHandler: isDev ? (key) => `[MISSING:${key}]` : undefined,
  });

// Log missing keys in development
if (isDev) {
  i18n.on("missingKey", (lngs, namespace, key) => {
    console.warn(`[i18n] Missing key "${key}" for languages: ${lngs.join(", ")}`);
  });
}

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];
