import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'

export function AgentIllustration() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      width: 240,
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phoneFrame: {
      width: 120,
      height: 170,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 2.5,
      borderColor: theme.colors.text.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    phoneNotch: {
      position: 'absolute',
      top: 0,
      width: 40,
      height: 4,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      backgroundColor: theme.colors.text.primary,
    },
    agentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      width: '100%',
    },
    agentDot: {
      width: 20,
      height: 20,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agentLine: {
      height: 3,
      borderRadius: 2,
      flex: 1,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: theme.borderRadius.full,
    },
    floatingAgent1: {
      position: 'absolute',
      top: 10,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.9,
    },
    floatingAgent2: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      width: 34,
      height: 34,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    floatingAgent3: {
      position: 'absolute',
      top: 50,
      left: 30,
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.status.success,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.8,
    },
    connector: {
      position: 'absolute',
      width: 1.5,
      backgroundColor: theme.colors.border,
    },
    connector1: {
      top: 40,
      right: 58,
      height: 30,
      transform: [{ rotate: '30deg' }],
    },
    connector2: {
      bottom: 48,
      left: 55,
      height: 25,
      transform: [{ rotate: '-20deg' }],
    },
  })

  return (
    <View style={styles.container}>
      <View style={[styles.connector, styles.connector1]} />
      <View style={[styles.connector, styles.connector2]} />

      <View style={styles.phoneFrame}>
        <View style={styles.phoneNotch} />

        <View style={{ marginTop: 20, gap: 6, width: '100%' }}>
          <View style={styles.agentRow}>
            <View style={[styles.agentDot, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="flash" size={11} color={theme.colors.text.inverse} />
            </View>
            <View
              style={[styles.agentLine, { backgroundColor: theme.colors.border, width: '50%' }]}
            />
            <View style={[styles.statusDot, { backgroundColor: theme.colors.status.success }]} />
          </View>

          <View style={styles.agentRow}>
            <View style={[styles.agentDot, { backgroundColor: theme.colors.status.info }]}>
              <Ionicons name="chatbubble" size={10} color={theme.colors.text.inverse} />
            </View>
            <View
              style={[styles.agentLine, { backgroundColor: theme.colors.border, width: '40%' }]}
            />
            <View style={[styles.statusDot, { backgroundColor: theme.colors.status.success }]} />
          </View>

          <View style={styles.agentRow}>
            <View style={[styles.agentDot, { backgroundColor: theme.colors.status.warning }]}>
              <Ionicons name="code-slash" size={10} color={theme.colors.text.inverse} />
            </View>
            <View
              style={[styles.agentLine, { backgroundColor: theme.colors.border, width: '60%' }]}
            />
            <View style={[styles.statusDot, { backgroundColor: theme.colors.text.tertiary }]} />
          </View>
        </View>
      </View>

      <View style={styles.floatingAgent1}>
        <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.text.inverse} />
      </View>

      <View style={styles.floatingAgent2}>
        <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
      </View>

      <View style={styles.floatingAgent3}>
        <Ionicons name="pulse" size={14} color={theme.colors.text.inverse} />
      </View>
    </View>
  )
}
