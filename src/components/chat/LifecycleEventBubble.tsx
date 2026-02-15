import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'
import type { LifecycleEventMessage } from './chatMessageTypes'

interface LifecycleEventBubbleProps {
  message: LifecycleEventMessage
}

export function LifecycleEventBubble({ message }: LifecycleEventBubbleProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  const isStart = message.phase === 'start'

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={isStart ? t('chat.lifecycleStart') : t('chat.lifecycleEnd')}
      accessibilityRole="text"
    >
      <View style={styles.line} />
      <View style={styles.labelContainer}>
        {isStart ? (
          <ActivityIndicator size={10} color={theme.colors.text.tertiary} />
        ) : (
          <Ionicons name="checkmark" size={10} color={theme.colors.text.tertiary} />
        )}
        <Text variant="caption" style={styles.label}>
          {isStart ? t('chat.lifecycleStart') : t('chat.lifecycleEnd')}
        </Text>
      </View>
      <View style={styles.line} />
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    line: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    label: {
      color: theme.colors.text.tertiary,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  })
