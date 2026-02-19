import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'
import { ModalOverlay } from './ModalOverlay'
import { Text } from './Text'

const EMOJI_SECTIONS = [
  {
    key: 'agents',
    emojis: [
      '🤖',
      '🧠',
      '🔬',
      '🔍',
      '📝',
      '💻',
      '🛠️',
      '🎯',
      '📊',
      '📈',
      '🧪',
      '🎨',
      '📚',
      '🔧',
      '⚡',
      '🚀',
    ],
  },
  {
    key: 'people',
    emojis: [
      '👨‍💻',
      '👩‍💻',
      '👨‍🔬',
      '👩‍🔬',
      '👨‍🎨',
      '👩‍🎨',
      '🧑‍💼',
      '🦸',
      '🧙',
      '🥷',
      '🧑‍🏫',
      '🕵️',
      '👷',
      '🧑‍🚀',
      '🧑‍⚕️',
      '🧑‍🍳',
    ],
  },
  {
    key: 'animals',
    emojis: [
      '🐱',
      '🐶',
      '🦊',
      '🐻',
      '🐼',
      '🦁',
      '🐸',
      '🦉',
      '🐝',
      '🦈',
      '🐙',
      '🦋',
      '🐢',
      '🐘',
      '🦄',
      '🐲',
    ],
  },
  {
    key: 'objects',
    emojis: [
      '💡',
      '🔑',
      '🗂️',
      '📦',
      '🧩',
      '🎲',
      '🏗️',
      '🔮',
      '💎',
      '🎭',
      '🛡️',
      '⚙️',
      '🧲',
      '📡',
      '🔒',
      '🏆',
    ],
  },
]

export interface EmojiPickerProps {
  value: string
  onValueChange: (emoji: string) => void
  label?: string
}

export function EmojiPicker({ value, onValueChange, label }: EmojiPickerProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    trigger: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: 80,
    },
    triggerText: {
      fontSize: 24,
    },
    triggerPlaceholder: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
    },
    categoryTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.md,
    },
    emojiCell: {
      width: '12.5%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    emojiCellActive: {
      backgroundColor: theme.colors.primary + '22',
    },
    emojiText: {
      fontSize: 24,
    },
    clearButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {value ? (
          <Text style={styles.triggerText}>{value}</Text>
        ) : (
          <Text style={styles.triggerPlaceholder}>🤖</Text>
        )}
      </TouchableOpacity>

      <ModalOverlay visible={open} onClose={() => setOpen(false)} width="90%" maxHeight="70%">
        <ScrollView>
          {EMOJI_SECTIONS.map((section) => (
            <View key={section.key}>
              <Text style={styles.categoryTitle}>{t(`emojiPicker.categories.${section.key}`)}</Text>
              <View style={styles.emojiGrid}>
                {section.emojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiCell, emoji === value && styles.emojiCellActive]}
                    onPress={() => {
                      onValueChange(emoji)
                      setOpen(false)
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        {value ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              onValueChange('')
              setOpen(false)
            }}
          >
            <Text color="secondary">{t('common.clear')}</Text>
          </TouchableOpacity>
        ) : null}
      </ModalOverlay>
    </View>
  )
}
