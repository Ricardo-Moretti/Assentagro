import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ptBR, type TranslationKey } from './pt-BR';
import { en } from './en';

export type Locale = 'pt-BR' | 'en';

const translations: Record<Locale, Record<TranslationKey, string>> = {
  'pt-BR': ptBR,
  en,
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'assetagro-i18n' },
  ),
);

export function useTranslation() {
  const { locale, setLocale } = useI18nStore();

  const t = (key: TranslationKey): string => {
    return translations[locale]?.[key] ?? translations['pt-BR'][key] ?? key;
  };

  return { t, locale, setLocale };
}

export type { TranslationKey };
