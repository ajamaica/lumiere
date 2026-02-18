import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Theme, useTheme } from '../../theme'

interface RecordingOverlayProps {
  transcribedText: string
  onStop: () => void
  onCancel: () => void
}

export function RecordingOverlay({ transcribedText, onStop, onCancel }: RecordingOverlayProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.indicator}>
        <View style={styles.dot} />
        <Text style={styles.label}>{t('chat.listening')}</Text>
      </View>
      <Text style={styles.transcribedText} numberOfLines={3} accessibilityLiveRegion="polite">
        {transcribedText || t('chat.startSpeaking')}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
        >
          <Ionicons name="checkmark" size={20} color={theme.colors.text.inverse} />
          <Text style={styles.stopButtonText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    indicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.status.error,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    transcribedText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      minHeight: 40,
      paddingHorizontal: theme.spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xxl,
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    stopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xxl,
      backgroundColor: theme.colors.primary,
    },
    stopButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.inverse,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  })
