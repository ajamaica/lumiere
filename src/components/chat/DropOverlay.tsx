import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, Text, View } from 'react-native'

import { Theme, useTheme } from '../../theme'

export function DropOverlay() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.primary} />
          <Text style={styles.title}>{t('chat.dropFilesHere', 'Drop files here')}</Text>
          <Text style={styles.subtitle}>
            {t('chat.dropFilesSubtitle', 'Images, videos, and documents')}
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg * 2,
      paddingVertical: theme.spacing.lg * 2,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed' as const,
      backgroundColor: theme.colors.surface,
    },
    title: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })
