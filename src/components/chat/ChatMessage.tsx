import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  streaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const isUser = message.sender === 'user';

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.agentText]}>
          {message.text}
        </Text>
        {message.streaming && (
          <Text style={styles.streamingIndicator}>...</Text>
        )}
      </View>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  agentContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.xxl,
  },
  userBubble: {
    backgroundColor: theme.colors.message.user,
    borderBottomRightRadius: theme.borderRadius.sm,
  },
  agentBubble: {
    backgroundColor: theme.colors.message.agent,
    borderBottomLeftRadius: theme.borderRadius.sm,
  },
  text: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  userText: {
    color: theme.colors.message.userText,
  },
  agentText: {
    color: theme.colors.message.agentText,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    marginHorizontal: theme.spacing.xs,
  },
  streamingIndicator: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
});
