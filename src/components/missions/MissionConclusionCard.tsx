import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import { useTheme } from '../../theme'
import { createMarkdownStyles } from '../chat/ChatMessage.styles'
import { useMarkdownRules } from '../chat/useMarkdownRules'
import { Card, Text } from '../ui'

interface MissionConclusionCardProps {
  conclusion: string
}

export function MissionConclusionCard({ conclusion }: MissionConclusionCardProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { markdownRules, handleLinkPress } = useMarkdownRules()
  const markdownStyles = useMemo(() => createMarkdownStyles(theme, false), [theme])

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
      <Markdown
        style={markdownStyles}
        onLinkPress={(url: string) => {
          handleLinkPress(url)
          return false
        }}
        mergeStyle={true}
        rules={markdownRules}
      >
        {conclusion}
      </Markdown>
    </Card>
  )
}
