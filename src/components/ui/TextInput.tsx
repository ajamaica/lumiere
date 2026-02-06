import React from 'react'
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
} from 'react-native'

import { useTheme } from '../../theme'

export interface TextInputProps extends RNTextInputProps {
  label?: string
  hint?: string
  error?: string
}

export function TextInput({ label, hint, error, style, ...props }: TextInputProps) {
  const { theme } = useTheme()

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
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: error ? theme.colors.status.error : theme.colors.border,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    error: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.error,
      marginTop: theme.spacing.xs,
    },
  })

  return (
    <View style={styles.container} accessible={false}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, style]}
        placeholderTextColor={theme.colors.text.tertiary}
        accessibilityLabel={label}
        accessibilityHint={error || hint}
        accessibilityState={error ? { disabled: props.editable === false } : undefined}
        {...props}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}
