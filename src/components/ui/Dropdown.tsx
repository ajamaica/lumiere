import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'
import { Text } from './Text'

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

export interface DropdownProps<T extends string = string> {
  label?: string
  options: DropdownOption<T>[]
  value: T
  onValueChange: (value: T) => void
  hint?: string
  disabled?: boolean
}

export function Dropdown<T extends string = string>({
  label,
  options,
  value,
  onValueChange,
  hint,
  disabled,
}: DropdownProps<T>) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((o) => o.value === value)

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    trigger: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    triggerDisabled: {
      opacity: 0.5,
    },
    triggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    optionIcon: {
      width: 24,
      height: 24,
      marginRight: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    triggerText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    menu: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    menuItem: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md + 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    menuItemActive: {
      backgroundColor: theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
    },
    menuItemText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    menuItemTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  })

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selectedOption?.label ?? ''}` : selectedOption?.label}
        accessibilityHint={hint || 'Double tap to open dropdown'}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
      >
        <View style={styles.triggerContent}>
          {selectedOption?.icon && <View style={styles.optionIcon}>{selectedOption.icon}</View>}
          <Text style={styles.triggerText}>{selectedOption?.label ?? ''}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
      </TouchableOpacity>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {options.map((option, index) => (
              <React.Fragment key={option.value}>
                {index > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={[styles.menuItem, option.value === value && styles.menuItemActive]}
                  onPress={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  accessibilityRole="menuitem"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: option.value === value }}
                >
                  <View style={styles.triggerContent}>
                    {option.icon && <View style={styles.optionIcon}>{option.icon}</View>}
                    <Text
                      style={[
                        styles.menuItemText,
                        option.value === value && styles.menuItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {option.value === value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
