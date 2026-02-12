import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import { Card, Text } from '../ui'

interface MissionConclusionCardProps {
  conclusion: string
}

export function MissionConclusionCard({ conclusion }: MissionConclusionCardProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.status.success + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
  })

  return (
    <Card style={{ borderColor: theme.colors.status.success + '40' }}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-done" size={18} color={theme.colors.status.success} />
        </View>
        <Text variant="heading3" style={{ color: theme.colors.status.success }}>
          {t('missions.conclusion')}
        </Text>
      </View>
      <Text variant="body" style={{ color: theme.colors.text.primary }}>
        {conclusion}
      </Text>
    </Card>
  )
}
