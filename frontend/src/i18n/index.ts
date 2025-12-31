import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import de from "./locales/de.json";

export type MessageSchema = typeof en;

function getDefaultLocale(): "en" | "de" {
  const savedLocale = localStorage.getItem("locale");
  if (savedLocale === "en" || savedLocale === "de") {
    return savedLocale;
  }

  const envDefault = import.meta.env.VITE_DEFAULT_LANGUAGE;
  if (envDefault === "en" || envDefault === "de") {
    return envDefault;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("de")) {
    return "de";
  }

  return "en";
}

const i18n = createI18n<[MessageSchema], "en" | "de">({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: "en",
  messages: {
    en,
    de,
  },
});

export default i18n;
