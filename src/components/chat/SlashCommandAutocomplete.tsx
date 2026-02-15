import React, { useMemo } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'

import { SlashCommand } from '../../hooks/useSlashCommands'
import { Theme, useTheme } from '../../theme'

interface SlashCommandAutocompleteProps {
  suggestions: SlashCommand[]
  onSelect: (command: string) => void
}

export function SlashCommandAutocomplete({ suggestions, onSelect }: SlashCommandAutocompleteProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <FlatList
      data={suggestions}
      keyExtractor={(item) => item.command}
      style={styles.autocomplete}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelect(item.command)}
          accessibilityRole="button"
          accessibilityLabel={`${item.command}: ${item.description}`}
        >
          <Text style={styles.command}>{item.command}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
        </TouchableOpacity>
      )}
    />
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    autocomplete: {
      maxHeight: 200,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    item: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    command: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })
