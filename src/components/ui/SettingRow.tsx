import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'

export interface SettingRowProps {
  label: string
  value?: string
  onPress?: () => void
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
}

export function SettingRow({
  label,
  value,
  onPress,
  switchValue,
  onSwitchChange,
  icon,
  iconColor,
  customIcon,
  subtitle,
  showDivider = true,
  labelColor,
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
          <Text style={styles.label}>{label}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {value && <Text style={styles.value}>{value}</Text>}
        {switchValue !== undefined && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
