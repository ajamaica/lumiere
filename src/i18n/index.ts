import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'

export const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ja: { translation: ja },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
} as const

export const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
}

export const supportedLanguages = Object.keys(resources)

// Get device language code (e.g., 'en', 'es', 'zh-CN')
const getDeviceLanguage = (): string => {
  const locale = Localization.getLocales()[0]
  const languageCode = locale?.languageCode ?? 'en'
  const regionCode = locale?.regionCode

  // Check for language-region match first (e.g., zh-CN, zh-TW)
  if (regionCode) {
    const langRegion = `${languageCode}-${regionCode}`
    if (supportedLanguages.includes(langRegion)) {
      return langRegion
    }
  }

  // Fall back to language code only
  if (supportedLanguages.includes(languageCode)) {
    return languageCode
  }

  return 'en'
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
