import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'

export function ConfigIllustration() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      width: 240,
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panel: {
      width: 170,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      padding: 14,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconCircle: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: {
      flex: 1,
      gap: 4,
    },
    rowLabel: {
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.text.primary,
      opacity: 0.3,
    },
    rowValue: {
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
    },
    toggle: {
      width: 28,
      height: 16,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    toggleKnob: {
      width: 12,
      height: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: '#FFFFFF',
    },
    gearFloat: {
      position: 'absolute',
      top: 8,
      right: 14,
      opacity: 0.15,
    },
    colorDots: {
      flexDirection: 'row',
      gap: 6,
      marginLeft: 38,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: theme.borderRadius.full,
    },
    selectedRing: {
      borderWidth: 2,
      borderColor: theme.colors.text.primary,
    },
    branchLine: {
      position: 'absolute',
      bottom: 14,
      left: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    branchDot: {
      width: 5,
      height: 5,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      opacity: 0.5,
    },
    branchSegment: {
      width: 14,
      height: 1.5,
      backgroundColor: theme.colors.primary,
      opacity: 0.3,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.gearFloat}>
        <Ionicons name="settings" size={60} color={theme.colors.text.primary} />
      </View>

      <View style={styles.panel}>
        {/* Provider row */}
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="git-network-outline" size={15} color={theme.colors.text.inverse} />
          </View>
          <View style={styles.rowContent}>
            <View style={[styles.rowLabel, { width: '50%' }]} />
            <View style={[styles.rowValue, { width: '80%' }]} />
          </View>
        </View>

        {/* Theme row */}
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.status.info }]}>
            <Ionicons name="color-palette-outline" size={15} color={theme.colors.text.inverse} />
          </View>
          <View style={styles.rowContent}>
            <View style={[styles.rowLabel, { width: '40%' }]} />
          </View>
          <View style={[styles.toggle, { backgroundColor: theme.colors.primary }]}>
            <View style={[styles.toggleKnob, { alignSelf: 'flex-end' }]} />
          </View>
        </View>

        {/* Color palette dots */}
        <View style={styles.colorDots}>
          <View style={[styles.colorDot, { backgroundColor: '#FF6B47' }, styles.selectedRing]} />
          <View style={[styles.colorDot, { backgroundColor: '#E91E8C' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#2E9E5A' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#2563EB' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#7C3AED' }]} />
        </View>

        {/* Triggers row */}
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.status.warning }]}>
            <Ionicons name="link-outline" size={15} color={theme.colors.text.inverse} />
          </View>
          <View style={styles.rowContent}>
            <View style={[styles.rowLabel, { width: '60%' }]} />
            <View style={[styles.rowValue, { width: '45%' }]} />
          </View>
        </View>
      </View>

      <View style={styles.branchLine}>
        <View style={styles.branchDot} />
        <View style={styles.branchSegment} />
        <View style={styles.branchDot} />
        <View style={styles.branchSegment} />
        <View style={styles.branchDot} />
      </View>
    </View>
  )
}
