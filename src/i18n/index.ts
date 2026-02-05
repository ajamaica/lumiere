import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'

export const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
} as const

export const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
}

export const supportedLanguages = Object.keys(resources)

// Get device language code (e.g., 'en', 'es')
const getDeviceLanguage = (): string => {
  const locale = Localization.getLocales()[0]
  const languageCode = locale?.languageCode ?? 'en'
  return supportedLanguages.includes(languageCode) ? languageCode : 'en'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export default i18n
