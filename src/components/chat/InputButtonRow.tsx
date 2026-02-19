import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Theme, useTheme } from '../../theme'

interface InputButtonRowProps {
  disabled: boolean
  hasContent: boolean
  isBusy: boolean
  isAgentResponding: boolean
  showMic: boolean
  queueCount: number
  onOpenSessionMenu?: () => void
  onOpenAttachmentMenu: () => void
  onSend: () => void
  onStop?: () => void
  onMicPress: () => void
  supportsImageAttachments: boolean
}

export function InputButtonRow({
  disabled,
  hasContent,
  isBusy,
  isAgentResponding,
  showMic,
  queueCount,
  onOpenSessionMenu,
  onOpenAttachmentMenu,
  onSend,
  onStop,
  onMicPress,
  supportsImageAttachments,
}: InputButtonRowProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  const iconColor = disabled ? theme.colors.text.tertiary : theme.colors.text.secondary

  return (
    <View style={styles.row}>
      {onOpenSessionMenu && (
        <IconButton
          icon="ellipsis-vertical"
          size={24}
          color={iconColor}
          disabled={disabled}
          onPress={onOpenSessionMenu}
          accessibilityLabel={t('accessibility.sessionMenu')}
          style={styles.menuButton}
          disabledStyle={styles.buttonDisabled}
        />
      )}
      {supportsImageAttachments && (
        <IconButton
          icon="add"
          size={26}
          color={iconColor}
          disabled={disabled}
          onPress={onOpenAttachmentMenu}
          accessibilityLabel={t('accessibility.addAttachment')}
          style={styles.menuButton}
          disabledStyle={styles.buttonDisabled}
        />
      )}

      <View style={styles.spacer} />

      <View style={styles.sendArea}>
        {queueCount > 0 && (
          <View
            style={styles.queueBadge}
            accessibilityLabel={t('accessibility.messagesQueued', { count: queueCount })}
          >
            <Text style={styles.queueText}>{queueCount}</Text>
          </View>
        )}
        {isAgentResponding && onStop && (
          <TouchableOpacity
            testID="stop-button"
            style={[styles.sendButton, styles.stopButton]}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.stopResponse')}
          >
            <Ionicons name="stop" size={16} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        )}
        {showMic ? (
          <IconButton
            icon="mic"
            size={22}
            color={isBusy ? theme.colors.text.tertiary : theme.colors.text.secondary}
            disabled={isBusy}
            onPress={onMicPress}
            accessibilityLabel={t('accessibility.startVoiceInput')}
            style={[styles.sendButton, styles.sendButtonInactive]}
          />
        ) : (
          <TouchableOpacity
            testID="send-button"
            style={[
              styles.sendButton,
              hasContent && !isBusy ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={onSend}
            disabled={!hasContent || isBusy}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.sendMessage')}
            accessibilityState={{ disabled: !hasContent || isBusy }}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={hasContent && !isBusy ? theme.colors.text.inverse : theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Small reusable icon button to eliminate repeated boilerplate
// ---------------------------------------------------------------------------

interface IconButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name']
  size: number
  color: string
  disabled: boolean
  onPress: () => void
  accessibilityLabel: string
  style: React.ComponentProps<typeof TouchableOpacity>['style']
  disabledStyle?: React.ComponentProps<typeof TouchableOpacity>['style']
}

function IconButton({
  icon,
  size,
  color,
  disabled,
  onPress,
  accessibilityLabel,
  style,
  disabledStyle,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[style, disabled && disabledStyle]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    spacer: {
      flex: 1,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    sendArea: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    sendButtonInactive: {
      backgroundColor: theme.colors.surface,
    },
    stopButton: {
      backgroundColor: theme.colors.text.secondary,
      marginRight: theme.spacing.xs,
    },
    queueBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      marginRight: theme.spacing.xs,
      marginBottom: 2,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  })
