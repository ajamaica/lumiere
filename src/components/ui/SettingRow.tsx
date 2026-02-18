import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'

export interface SettingRowProps {
  label: string
  value?: string
  onPress?: () => void
  onLongPress?: () => void
  switchValue?: boolean
  onSwitchChange?: (value: boolean) => void
  /** Ionicons icon name */
  icon?: keyof typeof Ionicons.glyphMap
  /** Custom icon color override */
  iconColor?: string
  /** Custom icon node (takes precedence over icon) */
  customIcon?: React.ReactNode
  /** Subtitle text shown below the label */
  subtitle?: string
  /** Whether to show bottom divider (default: true) */
  showDivider?: boolean
  /** Custom label text color override */
  labelColor?: string
  /** Optional badge element rendered next to the label */
  badge?: React.ReactNode
}

export function SettingRow({
  label,
  value,
  onPress,
  onLongPress,
  switchValue,
  onSwitchChange,
  icon,
  iconColor,
  customIcon,
  subtitle,
  showDivider = true,
  labelColor,
  badge,
}: SettingRowProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: theme.colors.divider,
    },
    iconContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.lg,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    labelContainer: {
      flex: 1,
    },
    labelRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      color: labelColor || theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.regular,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    value: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginLeft: theme.spacing.sm,
    },
  })

  const content = (
    <View style={styles.row}>
      {(customIcon || icon) && (
        <View style={styles.iconContainer}>
          {customIcon || (
            <Ionicons name={icon!} size={22} color={iconColor || theme.colors.text.secondary} />
          )}
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.labelContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            {badge}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {value && <Text style={styles.value}>{value}</Text>}
        {switchValue !== undefined && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
            accessibilityLabel={label}
            accessibilityRole="switch"
          />
        )}
      </View>
    </View>
  )

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
        accessibilityValue={value ? { text: value } : undefined}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
