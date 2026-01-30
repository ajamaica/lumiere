import React from 'react'
import { StyleSheet, Text as RNText, TextProps as RNTextProps } from 'react-native'

import { useTheme } from '../../theme'

type TextVariant =
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'sectionTitle'
  | 'mono'

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'error' | 'success' | 'warning'

export interface TextProps extends RNTextProps {
  variant?: TextVariant
  color?: TextColor
  bold?: boolean
  semibold?: boolean
  center?: boolean
  uppercase?: boolean
}

export function Text({
  variant = 'body',
  color,
  bold,
  semibold,
  center,
  uppercase,
  style,
  ...props
}: TextProps) {
  const { theme } = useTheme()

  /* eslint-disable react-native/no-unused-styles */
  const variantStyles = StyleSheet.create({
    body: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      color: theme.colors.text.primary,
    },
    bodySmall: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
      color: theme.colors.text.primary,
    },
    caption: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
      color: theme.colors.text.secondary,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    heading1: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    heading2: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    heading3: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mono: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.monospace,
      color: theme.colors.text.primary,
    },
  })

  const colorMap: Record<TextColor, string> = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    tertiary: theme.colors.text.tertiary,
    inverse: theme.colors.text.inverse,
    error: theme.colors.status.error,
    success: theme.colors.status.success,
    warning: theme.colors.status.warning,
  }

  return (
    <RNText
      style={[
        variantStyles[variant],
        color && { color: colorMap[color] },
        bold && { fontWeight: theme.typography.fontWeight.bold },
        semibold && { fontWeight: theme.typography.fontWeight.semibold },
        center && { textAlign: 'center' },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
      {...props}
    />
  )
}
