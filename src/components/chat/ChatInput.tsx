import { Ionicons } from '@expo/vector-icons'
import React, { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useTheme } from '../../theme'

interface ChatInputProps {
  onSend: (text: string) => void
  onOpenSessionMenu?: () => void
  disabled?: boolean
  queueCount?: number
}

export function ChatInput({
  onSend,
  onOpenSessionMenu,
  disabled = false,
  queueCount = 0,
}: ChatInputProps) {
  const { theme } = useTheme()
  const [text, setText] = useState('')

  const styles = useMemo(() => createStyles(theme), [theme])

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const sendButtonColor =
    !text.trim() || disabled ? theme.colors.text.tertiary : theme.colors.primary
  const menuButtonColor = disabled ? theme.colors.text.tertiary : theme.colors.text.secondary

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.text.secondary}
          multiline
          maxLength={2000}
          editable={!disabled}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {onOpenSessionMenu && (
          <TouchableOpacity
            style={[styles.menuButton, disabled && styles.buttonDisabled]}
            onPress={onOpenSessionMenu}
            disabled={disabled}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={menuButtonColor} />
          </TouchableOpacity>
        )}
        <View style={styles.sendButtonContainer}>
          {queueCount > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueText}>{queueCount}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || disabled) && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}
          >
            <Ionicons name="send" size={24} color={sendButtonColor} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xxl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.fontSize.base,
      marginRight: theme.spacing.sm,
      color: theme.colors.text.primary,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
      marginRight: theme.spacing.xs,
    },
    sendButtonContainer: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
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
    buttonDisabled: {
      opacity: 0.5,
    },
  })
