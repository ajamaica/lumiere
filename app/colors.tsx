import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
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

export default function ColorsScreen() {
  const { theme, themeMode, setThemeMode, colorTheme, setColorTheme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const { t } = useTranslation()

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
      </ScrollView>
    </SafeAreaView>
  )
}
