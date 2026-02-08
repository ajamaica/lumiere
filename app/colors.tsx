import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader, Section, Text } from '../src/components/ui'
import { useTheme } from '../src/theme'
import { ColorThemeKey, colorThemes } from '../src/theme/colors'

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

export default function ColorsScreen() {
  const { theme, colorTheme, setColorTheme } = useTheme()

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
      <ScreenHeader title="Colors" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Color Theme">
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
