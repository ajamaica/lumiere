import React from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'

export interface SettingRowProps {
  label: string
  value?: string
  onPress?: () => void
  switchValue?: boolean
  onSwitchChange?: (value: boolean) => void
}

export function SettingRow({
  label,
  value,
  onPress,
  switchValue,
  onSwitchChange,
}: SettingRowProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    row: {
      flexDirection: switchValue !== undefined ? 'row' : 'column',
      alignItems: switchValue !== undefined ? 'center' : 'flex-start',
      justifyContent: switchValue !== undefined ? 'space-between' : 'flex-start',
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      marginBottom: value ? theme.spacing.xs : 0,
    },
    value: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })

  const content = (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {value && <Text style={styles.value}>{value}</Text>}
      {switchValue !== undefined && <Switch value={switchValue} onValueChange={onSwitchChange} />}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
