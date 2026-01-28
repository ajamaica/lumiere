import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useMoltGateway, AgentEvent } from '../../services/molt';

interface ChatScreenProps {
  gatewayUrl: string;
  gatewayToken: string;
}

export function ChatScreen({ gatewayUrl, gatewayToken }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAgentMessage, setCurrentAgentMessage] = useState<string>('');
  const [isAgentResponding, setIsAgentResponding] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    sendAgentRequest,
  } = useMoltGateway({
    url: gatewayUrl,
    token: gatewayToken,
  });

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsAgentResponding(true);
    setCurrentAgentMessage('');

    try {
      await sendAgentRequest(
        {
          prompt: text,
          stream: true,
        },
        (event: AgentEvent) => {
          if (event.type === 'text') {
            setCurrentAgentMessage((prev) => prev + event.text);
          } else if (event.type === 'done') {
            const agentMessage: Message = {
              id: `msg-${Date.now()}`,
              text: currentAgentMessage,
              sender: 'agent',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentMessage]);
            setCurrentAgentMessage('');
            setIsAgentResponding(false);
          } else if (event.type === 'error') {
            console.error('Agent error:', event.error);
            setIsAgentResponding(false);
            setCurrentAgentMessage('');
          }
        }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsAgentResponding(false);
      setCurrentAgentMessage('');
    }
  };

  const renderConnectionStatus = () => {
    if (connecting) {
      return (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.statusText}>Connecting...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.statusBar, styles.errorBar]}>
          <Text style={styles.errorText}>Connection failed: {error}</Text>
          <TouchableOpacity onPress={connect} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (connected) {
      return (
        <View style={[styles.statusBar, styles.connectedBar]}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      );
    }

    return null;
  };

  const allMessages = [
    ...messages,
    ...(currentAgentMessage
      ? [
          {
            id: 'streaming',
            text: currentAgentMessage,
            sender: 'agent' as const,
            timestamp: new Date(),
            streaming: true,
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      {renderConnectionStatus()}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Start a conversation with the AI agent</Text>
          </View>
        }
      />
      <ChatInput onSend={handleSend} disabled={!connected || isAgentResponding} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
  },
  connectedBar: {
    backgroundColor: '#E8F5E9',
  },
  errorBar: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  connectedText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
