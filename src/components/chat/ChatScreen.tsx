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
import { agentConfig } from '../../config/gateway.config';

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
    getChatHistory,
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

  useEffect(() => {
    if (connected) {
      // Small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        loadChatHistory();
      }, 500);
    }
  }, [connected]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(agentConfig.defaultSessionKey, 100);
      console.log('Chat history:', history);

      if (history && Array.isArray((history as any).messages)) {
        const historyMessages = (history as any).messages
          .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg: any, index: number) => {
            const textContent = msg.content.find((c: any) => c.type === 'text');
            const text = textContent?.text || '';

            // Skip empty messages
            if (!text) return null;

            return {
              id: `history-${msg.timestamp}-${index}`,
              text,
              sender: msg.role === 'user' ? 'user' : 'agent',
              timestamp: new Date(msg.timestamp),
            } as Message;
          })
          .filter((msg: Message | null) => msg !== null);

        setMessages(historyMessages);
        console.log(`Loaded ${historyMessages.length} messages from history`);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

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

    let accumulatedText = '';

    try {
      await sendAgentRequest(
        {
          message: text,
          idempotencyKey: `msg-${Date.now()}-${Math.random()}`,
          agentId: agentConfig.defaultAgentId,
        },
        (event: AgentEvent) => {
          console.log('Agent event:', event);

          if (event.stream === 'assistant' && event.data.delta) {
            accumulatedText += event.data.delta;
            setCurrentAgentMessage(accumulatedText);
          } else if (event.stream === 'lifecycle' && event.data.phase === 'end') {
            const agentMessage: Message = {
              id: `msg-${Date.now()}`,
              text: accumulatedText,
              sender: 'agent',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentMessage]);
            setCurrentAgentMessage('');
            setIsAgentResponding(false);
            accumulatedText = '';
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
