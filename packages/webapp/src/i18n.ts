import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const supportedLanguages = ['en', 'es', 'it', 'de', 'fr', 'pt'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
const LANGUAGE_STORAGE_KEY = 'pulsio-language';

export const languages: Record<SupportedLanguage, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English' },
  es: { flag: '🇪🇸', name: 'Español' },
  it: { flag: '🇮🇹', name: 'Italiano' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  fr: { flag: '🇫🇷', name: 'Français' },
  pt: { flag: '🇵🇹', name: 'Português' },
};

const isSupportedLanguage = (language: string): language is SupportedLanguage => supportedLanguages.includes(language as SupportedLanguage);

const getInitialLanguage = (): SupportedLanguage => {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage && isSupportedLanguage(storedLanguage)) return storedLanguage;

  const language = navigator.language.toLowerCase().split('-')[0];
  return isSupportedLanguage(language) ? language : 'en';
};

const fetchTranslations = async (language: SupportedLanguage): Promise<Record<string, unknown>> => {
  const response = await fetch(`/${language}.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${language} translations`);
  const translations = await response.json();
  return translations;
};

export const initializeI18n = async () => {
  const language = getInitialLanguage();
  let translations: Record<string, unknown>;
  let englishTranslations: Record<string, unknown>;

  try {
    translations = await fetchTranslations(language);
    englishTranslations = language === 'en' ? translations : await fetchTranslations('en');
  } catch (error) {
    console.error('Could not load browser language translations.', error);
    translations = await fetchTranslations('en');
    englishTranslations = translations;
  }

  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    interpolation: { escapeValue: false },
    resources: { [language]: { translation: translations }, en: { translation: englishTranslations } },
  });
};

export const changeLanguage = async (language: SupportedLanguage) => {
  if (!i18n.hasResourceBundle(language, 'translation')) {
    const translations = await fetchTranslations(language);
    i18n.addResourceBundle(language, 'translation', translations, true, true);
  }

  await i18n.changeLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export default i18n;
