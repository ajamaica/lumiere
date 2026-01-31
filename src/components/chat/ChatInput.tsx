import { Ionicons } from '@expo/vector-icons'
import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useSlashCommands } from '../../hooks/useSlashCommands'
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
  const { suggestions, hasInput } = useSlashCommands(text)

  const styles = useMemo(() => createStyles(theme), [theme])

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const handleSelectCommand = (command: string) => {
    setText(command + ' ')
  }

  const menuButtonColor = disabled ? theme.colors.text.tertiary : theme.colors.text.secondary

  return (
    <>
      {hasInput && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.command}
          style={styles.autocomplete}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.autocompleteItem}
              onPress={() => handleSelectCommand(item.command)}
            >
              <Text style={styles.commandText}>{item.command}</Text>
              <Text style={styles.commandDescription} numberOfLines={1}>
                {item.description}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      <View style={styles.background}>
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
          <View style={styles.buttonRow}>
            {onOpenSessionMenu && (
              <TouchableOpacity
                style={[styles.menuButton, disabled && styles.buttonDisabled]}
                onPress={onOpenSessionMenu}
                disabled={disabled}
              >
                <Ionicons name="ellipsis-vertical" size={24} color={menuButtonColor} />
              </TouchableOpacity>
            )}
            <View style={styles.spacer} />
            <View style={styles.sendButtonContainer}>
              {queueCount > 0 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueText}>{queueCount}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  text.trim() && !disabled ? styles.sendButtonActive : styles.sendButtonInactive,
                ]}
                onPress={handleSend}
                disabled={!text.trim() || disabled}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={
                    text.trim() && !disabled
                      ? theme.colors.text.inverse
                      : theme.colors.text.tertiary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </>
  )
}

interface Theme {
  colors: {
    background: string
    border: string
    surface: string
    text: { primary: string; secondary: string; tertiary: string; inverse: string }
    primary: string
  }
  spacing: { xs: number; sm: number; md: number; lg: number }
  borderRadius: { xs: number; sm: number; xxl: number }
  typography: {
    fontSize: { xs: number; base: number }
    fontWeight: { semibold: string }
  }
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    background: {
      backgroundColor: theme.colors.background,
    },
    container: {
      flexDirection: 'column',
      marginHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    buttonRow: {
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
    sendButtonContainer: {
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
    autocomplete: {
      maxHeight: 200,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    autocompleteItem: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    commandText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    commandDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })
