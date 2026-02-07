import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader, Section, Text } from '../src/components/ui'
import { useLanguage } from '../src/hooks/useLanguage'
import { useTheme } from '../src/theme'

export default function LanguageScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { currentLanguage, setLanguage, supportedLanguages, languageNames } = useLanguage()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowContent: {
      flex: 1,
    },
    languageName: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    languageCode: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    checkIcon: {
      marginLeft: theme.spacing.sm,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('settings.language')} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section>
          {supportedLanguages.map((langCode, index) => {
            const isSelected = langCode === currentLanguage
            const isLast = index === supportedLanguages.length - 1
            return (
              <TouchableOpacity
                key={langCode}
                style={[styles.row, isLast && styles.rowLast]}
                onPress={() => setLanguage(langCode)}
                activeOpacity={0.6}
              >
                <View style={styles.rowContent}>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected && { color: theme.colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {languageNames[langCode] ?? langCode}
                  </Text>
                  <Text style={styles.languageCode}>{langCode}</Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
