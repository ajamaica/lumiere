import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'

export function FeaturesIllustration() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      width: 240,
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 180,
      gap: 12,
      justifyContent: 'center',
    },
    card: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    cardLabel: {
      height: 3,
      borderRadius: 2,
      width: 36,
    },
    centerBadge: {
      position: 'absolute',
      top: 12,
      right: 20,
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accentDot: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: theme.borderRadius.full,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="server-outline" size={26} color={theme.colors.primary} />
          <View style={[styles.cardLabel, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="swap-horizontal-outline" size={26} color={theme.colors.status.info} />
          <View style={[styles.cardLabel, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="timer-outline" size={26} color={theme.colors.status.warning} />
          <View style={[styles.cardLabel, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="notifications-outline" size={26} color={theme.colors.status.success} />
          <View style={[styles.cardLabel, { backgroundColor: theme.colors.border }]} />
        </View>
      </View>

      <View style={styles.centerBadge}>
        <Ionicons name="shield-checkmark" size={14} color={theme.colors.text.inverse} />
      </View>

      <View
        style={[
          styles.accentDot,
          { bottom: 22, left: 24, backgroundColor: theme.colors.primary, opacity: 0.4 },
        ]}
      />
      <View
        style={[
          styles.accentDot,
          {
            top: 30,
            left: 16,
            backgroundColor: theme.colors.status.info,
            opacity: 0.3,
            width: 6,
            height: 6,
          },
        ]}
      />
      <View
        style={[
          styles.accentDot,
          {
            bottom: 40,
            right: 16,
            backgroundColor: theme.colors.status.warning,
            opacity: 0.3,
            width: 6,
            height: 6,
          },
        ]}
      />
    </View>
  )
}
