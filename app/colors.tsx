import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { ChatFontFamily, chatFontFamilyAtom, ChatFontSize, chatFontSizeAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { ColorThemeKey, colorThemes } from '../src/theme/colors'
import type { ThemeMode } from '../src/theme/themes'
import { useContentContainerStyle } from '../src/utils/device'

const COLOR_THEME_KEYS: ColorThemeKey[] = [
  'lumiere',
  'pink',
  'green',
  'red',
  'blue',
  'purple',
  'orange',
  'glass',
]

const THEME_MODES: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', icon: 'sunny-outline' },
  { mode: 'dark', icon: 'moon-outline' },
  { mode: 'system', icon: 'phone-portrait-outline' },
]

const FONT_SIZES: { size: ChatFontSize; icon: keyof typeof Ionicons.glyphMap }[] = [
  { size: 'small', icon: 'text-outline' },
  { size: 'medium', icon: 'text-outline' },
  { size: 'large', icon: 'text-outline' },
]

const FONT_FAMILIES: { family: ChatFontFamily; icon: keyof typeof Ionicons.glyphMap }[] = [
  { family: 'system', icon: 'phone-portrait-outline' },
  { family: 'serif', icon: 'book-outline' },
  { family: 'monospace', icon: 'code-outline' },
]

export default function ColorsScreen() {
  const { theme, themeMode, setThemeMode, colorTheme, setColorTheme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const { t } = useTranslation()
  const [chatFontSize, setChatFontSize] = useAtom(chatFontSizeAtom)
  const [chatFontFamily, setChatFontFamily] = useAtom(chatFontFamilyAtom)

  const getSwatchColor = (key: ColorThemeKey): string => {
    const palette = colorThemes[key]
    return theme.isDark ? palette.dark.primary : palette.light.primary
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    colorThemeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    colorThemeItem: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    colorSwatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: theme.colors.text.primary,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('settings.colors')} showBack />
      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        <Section title={t('colors.appearance')}>
          {THEME_MODES.map((item, index) => (
            <SettingRow
              key={item.mode}
              icon={item.icon}
              label={t(`settings.theme.${item.mode}`)}
              iconColor={themeMode === item.mode ? theme.colors.primary : undefined}
              onPress={() => setThemeMode(item.mode)}
              value={themeMode === item.mode ? '✓' : undefined}
              showDivider={index < THEME_MODES.length - 1}
            />
          ))}
        </Section>

        <Section title={t('colors.colorTheme')}>
          <View style={styles.colorThemeGrid}>
            {COLOR_THEME_KEYS.map((key) => (
              <Pressable key={key} style={styles.colorThemeItem} onPress={() => setColorTheme(key)}>
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: getSwatchColor(key) },
                    colorTheme === key && styles.colorSwatchSelected,
                  ]}
                />
                <Text variant="caption" color={colorTheme === key ? 'primary' : 'secondary'}>
                  {colorThemes[key].name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={t('colors.chatText')}>
          <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
            {t('colors.chatTextDescription')}
          </Text>
        </Section>

        <Section title={t('colors.fontSize')}>
          {FONT_SIZES.map((item, index) => (
            <SettingRow
              key={item.size}
              icon={item.icon}
              label={t(`colors.fontSize_${item.size}`)}
              iconColor={chatFontSize === item.size ? theme.colors.primary : undefined}
              onPress={() => setChatFontSize(item.size)}
              value={chatFontSize === item.size ? '✓' : undefined}
              showDivider={index < FONT_SIZES.length - 1}
            />
          ))}
        </Section>

        <Section title={t('colors.fontFamily')}>
          {FONT_FAMILIES.map((item, index) => (
            <SettingRow
              key={item.family}
              icon={item.icon}
              label={t(`colors.fontFamily_${item.family}`)}
              iconColor={chatFontFamily === item.family ? theme.colors.primary : undefined}
              onPress={() => setChatFontFamily(item.family)}
              value={chatFontFamily === item.family ? '✓' : undefined}
              showDivider={index < FONT_FAMILIES.length - 1}
            />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
