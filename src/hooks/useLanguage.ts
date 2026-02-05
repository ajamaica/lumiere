import * as Localization from 'expo-localization'
import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { languageNames, supportedLanguages } from '../i18n'
import { languageAtom } from '../store'

export function useLanguage() {
  const { i18n } = useTranslation()
  const [storedLanguage, setStoredLanguage] = useAtom(languageAtom)

  // Get the effective language (stored or device default)
  const getEffectiveLanguage = useCallback((): string => {
    if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
      return storedLanguage
    }
    const deviceLocale = Localization.getLocales()[0]
    const deviceLang = deviceLocale?.languageCode ?? 'en'
    return supportedLanguages.includes(deviceLang) ? deviceLang : 'en'
  }, [storedLanguage])

  // Sync i18n language with stored preference on mount and changes
  useEffect(() => {
    const effectiveLang = getEffectiveLanguage()
    if (i18n.language !== effectiveLang) {
      i18n.changeLanguage(effectiveLang)
    }
  }, [i18n, storedLanguage, getEffectiveLanguage])

  // Change language and persist
  const setLanguage = useCallback(
    (lang: string) => {
      setStoredLanguage(lang)
      i18n.changeLanguage(lang)
    },
    [i18n, setStoredLanguage],
  )

  // Get display name for current language
  const currentLanguageName = languageNames[i18n.language] ?? i18n.language

  return {
    currentLanguage: i18n.language,
    currentLanguageName,
    setLanguage,
    supportedLanguages,
    languageNames,
    isUsingDeviceLanguage: !storedLanguage,
  }
}
