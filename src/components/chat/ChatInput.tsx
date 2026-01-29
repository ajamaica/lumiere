import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  onNewSession?: () => void;
  onResetSession?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onNewSession, onResetSession, disabled = false }: ChatInputProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleNewSession = () => {
    if (onNewSession && !disabled) {
      onNewSession();
    }
  };

  const handleResetSession = () => {
    if (onResetSession && !disabled) {
      onResetSession();
    }
  };

  const sendButtonColor = !text.trim() || disabled ? theme.colors.text.tertiary : theme.colors.primary;
  const actionButtonColor = disabled ? theme.colors.text.tertiary : theme.colors.primary;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
        {onResetSession && (
          <TouchableOpacity
            style={[styles.actionButton, disabled && styles.buttonDisabled]}
            onPress={handleResetSession}
            disabled={disabled}
          >
            <Ionicons name="refresh-outline" size={24} color={actionButtonColor} />
          </TouchableOpacity>
        )}
        {onNewSession && (
          <TouchableOpacity
            style={[styles.actionButton, disabled && styles.buttonDisabled]}
            onPress={handleNewSession}
            disabled={disabled}
          >
            <Ionicons name="add-circle-outline" size={24} color={actionButtonColor} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Ionicons name="send" size={24} color={sendButtonColor} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: theme.spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
