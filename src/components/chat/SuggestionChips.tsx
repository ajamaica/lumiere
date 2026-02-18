import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import type { ResponseSuggestion } from '../../hooks/useResponseSuggestions'
import { Theme, useTheme } from '../../theme'

interface SuggestionChipsProps {
  suggestions: ResponseSuggestion[]
  onSelect: (text: string) => void
  isLoading?: boolean
}

export function SuggestionChips({ suggestions, onSelect, isLoading }: SuggestionChipsProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (!isLoading && suggestions.length === 0) return null

  return (
    <View style={styles.container}>
      {isLoading && suggestions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
          <Text style={styles.loadingText}>{t('chat.generatingSuggestions')}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.chip}
              onPress={() => onSelect(suggestion.text)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('chat.useSuggestion', { text: suggestion.text })}
            >
              <Text style={styles.chipText} numberOfLines={2}>
                {suggestion.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingBottom: theme.spacing.xs,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    chip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      maxWidth: 220,
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
  })
