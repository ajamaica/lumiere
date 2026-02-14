import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ChatInput } from '../src/components/chat/ChatInput'
import { ChatMessage, Message, TextMessage } from '../src/components/chat/ChatMessage'
import type { ToolEventMessage } from '../src/components/chat/chatMessageTypes'
import { ThinkingIndicator } from '../src/components/chat/ThinkingIndicator'
import { ToolEventBubble } from '../src/components/chat/ToolEventBubble'
import { MissionConclusionCard } from '../src/components/missions/MissionConclusionCard'
import { MissionStatusBadge } from '../src/components/missions/MissionStatusBadge'
import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, ScreenHeader, Text } from '../src/components/ui'
import { stripMissionMarkers, useMissionEventParser } from '../src/hooks/useMissionEventParser'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import type { AgentEvent } from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('MissionDetail')

/** Convert server chat history messages to UI Message objects */
function historyToMessages(
  msgs: { role: string; content: Array<{ type: string; text?: string }>; timestamp: number }[],
): Message[] {
  return msgs
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg, index) => {
      const textContent = msg.content.find((c) => c.type === 'text')
      const text = textContent?.text || ''
      if (!text) return null
      return {
        id: `history-${msg.timestamp}-${index}`,
        text,
        sender: msg.role === 'user' ? ('user' as const) : ('agent' as const),
        timestamp: new Date(msg.timestamp),
      }
    })
    .filter((msg): msg is Message => msg !== null)
}

export default function MissionDetailScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const {
    activeMission,
    updateMissionStatus,
    updateSubtaskStatus,
    addMissionSkill,
    stopMission,
    archiveMission,
  } = useMissions()
  const { getProviderConfig, currentServerId } = useServers()
  const { parseChunk, resetBuffer } = useMissionEventParser()

  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [restoredHistory, setRestoredHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const scrollRef = useRef<ScrollView>(null)
  const shouldAutoScrollRef = useRef(true)
  const streamingTextRef = useRef('')
  const systemMessageSentRef = useRef(false)
  const stoppedRef = useRef(false)
  const activeToolCallsRef = useRef<Map<string, string>>(new Map())
  const hasRestoredRef = useRef(false)
  const autoStartSentRef = useRef(false)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const gateway = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      gateway.connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  // Reset per-mission refs when switching to a different mission
  useEffect(() => {
    stoppedRef.current = false
    systemMessageSentRef.current = false
    streamingTextRef.current = ''
    hasRestoredRef.current = false
    autoStartSentRef.current = false
    setRestoredHistory(false)
    setIsLoadingHistory(true)
  }, [activeMission?.id])

  // Load mission history from the server session
  useEffect(() => {
    if (!activeMission || !gateway.connected || hasRestoredRef.current) return
    hasRestoredRef.current = true

    const loadHistory = async () => {
      try {
        const response = (await gateway.getChatHistory(activeMission.sessionKey, 100)) as
          | {
              messages?: Array<{
                role: string
                content: Array<{ type: string; text?: string }>
                timestamp: number
              }>
            }
          | undefined

        if (
          response?.messages &&
          Array.isArray(response.messages) &&
          response.messages.length > 0
        ) {
          const restored = historyToMessages(response.messages)
          if (restored.length > 0) {
            setMessages(restored)
            setRestoredHistory(true)
            // The system message was already sent in a previous session
            systemMessageSentRef.current = true
            // Mission was already started — prevent auto-start from re-sending
            autoStartSentRef.current = true
          }
        }
      } catch (err) {
        missionLogger.logError('Failed to load mission history from server', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.id, gateway.connected])

  // Auto-start mission on first load if in_progress, no messages, and no saved history
  useEffect(() => {
    if (
      activeMission &&
      activeMission.status === 'in_progress' &&
      messages.length === 0 &&
      !restoredHistory &&
      !isLoadingHistory &&
      gateway.connected &&
      !isStreaming &&
      hasRestoredRef.current &&
      !autoStartSentRef.current
    ) {
      autoStartSentRef.current = true
      handleSendToAgent(`Begin executing this mission. Start with the first subtask.`, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.id, gateway.connected, restoredHistory, isLoadingHistory])

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      if (!activeMission) return

      // If the mission was stopped, still consume events but skip status updates
      const isStopped = stoppedRef.current

      // Handle tool stream events
      if (event.stream === 'tool' && event.data?.toolName) {
        const toolCallId = event.data.toolCallId ?? `tool-${event.seq}`
        const toolStatus = event.data.toolStatus ?? 'running'

        setMessages((prev) => {
          const existingMsgId = activeToolCallsRef.current.get(toolCallId)

          if (existingMsgId) {
            return prev.map((msg): Message => {
              if (msg.id === existingMsgId && msg.type === 'tool_event') {
                return { ...msg, status: toolStatus }
              }
              return msg
            })
          }

          const msgId = `tool-${toolCallId}-${Date.now()}`
          activeToolCallsRef.current.set(toolCallId, msgId)
          const toolMsg: ToolEventMessage = {
            id: msgId,
            type: 'tool_event',
            toolName: event.data.toolName!,
            toolCallId,
            toolInput: event.data.toolInput,
            status: toolStatus,
            sender: 'agent',
            timestamp: new Date(event.ts),
            text: '',
          }
          return [...prev, toolMsg]
        })
        return
      }

      if (event.data?.delta) {
        streamingTextRef.current += event.data.delta

        // Update the last assistant message in-place (even if stopped, so user sees what was received)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.sender === 'agent' && last.type !== 'tool_event') {
            return [
              ...prev.slice(0, -1),
              { ...last, text: streamingTextRef.current, streaming: !isStopped },
            ]
          }
          const textMsg: TextMessage = {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            text: streamingTextRef.current,
            timestamp: new Date(),
            streaming: !isStopped,
          }
          return [...prev, textMsg]
        })

        // Skip marker processing when stopped — don't let markers overwrite the stopped status
        if (!isStopped) {
          const updates = parseChunk(event.data.delta)
          for (const update of updates) {
            switch (update.type) {
              case 'subtask_complete':
                if (update.subtaskId) {
                  updateSubtaskStatus(activeMission.id, update.subtaskId, 'completed')
                  // Move next subtask to in_progress
                  const currentIdx = activeMission.subtasks.findIndex(
                    (s) => s.id === update.subtaskId,
                  )
                  if (currentIdx >= 0 && currentIdx < activeMission.subtasks.length - 1) {
                    updateSubtaskStatus(
                      activeMission.id,
                      activeMission.subtasks[currentIdx + 1].id,
                      'in_progress',
                    )
                  }
                }
                break
              case 'waiting_input':
                updateMissionStatus(activeMission.id, 'idle')
                break
              case 'suggest_skill':
                if (update.skillName) {
                  Alert.alert(t('missions.skillSuggestion', { name: update.skillName }), '', [
                    { text: t('missions.skipSkill'), style: 'cancel' },
                    {
                      text: t('missions.installSkill'),
                      onPress: () => {
                        if (update.skillName) {
                          addMissionSkill(activeMission.id, update.skillName)
                        }
                      },
                    },
                  ])
                }
                break
              case 'mission_complete':
                updateMissionStatus(activeMission.id, 'completed', {
                  conclusion: stripMissionMarkers(streamingTextRef.current),
                })
                break
              case 'mission_error':
                updateMissionStatus(activeMission.id, 'error', {
                  errorMessage: update.reason,
                })
                break
            }
          }
        }
      }

      if (event.data?.phase === 'end') {
        // Mark last message as no longer streaming
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.type !== 'tool_event' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }]
          }
          return prev
        })
        setIsStreaming(false)
        streamingTextRef.current = ''
        activeToolCallsRef.current.clear()
        resetBuffer()
      }
    },
    [
      activeMission,
      parseChunk,
      resetBuffer,
      updateMissionStatus,
      updateSubtaskStatus,
      addMissionSkill,
      t,
    ],
  )

  const handleSendToAgent = useCallback(
    async (text: string, isAutoStart = false) => {
      if (!activeMission || !gateway.connected) return

      // Validate system message exists before the very first request
      if (!systemMessageSentRef.current && !activeMission.systemMessage?.trim()) {
        missionLogger.logError('Cannot start mission', 'system message is empty')
        updateMissionStatus(activeMission.id, 'error', {
          errorMessage: 'Mission system message is empty. Please recreate the mission.',
        })
        return
      }

      if (!isAutoStart) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'user' as const,
            text,
            timestamp: new Date(),
          },
        ])
      }

      setIsStreaming(true)
      streamingTextRef.current = ''
      resetBuffer()

      // Ensure mission is in_progress when user responds
      if (activeMission.status === 'idle') {
        updateMissionStatus(activeMission.id, 'in_progress')
      }

      // Prepend system message on the first request so the agent has mission context
      let messageToSend = text
      if (!systemMessageSentRef.current) {
        messageToSend = `[System: ${activeMission.systemMessage}]\n\n${text}`
        systemMessageSentRef.current = true
      }

      try {
        await gateway.sendAgentRequest(
          {
            message: messageToSend,
            idempotencyKey: `mission-${activeMission.id}-${Date.now()}`,
            sessionKey: activeMission.sessionKey,
          },
          handleAgentEvent,
        )
      } catch (err) {
        missionLogger.logError('Failed to send mission message', err)
        setIsStreaming(false)
        updateMissionStatus(activeMission.id, 'error', {
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    [activeMission, gateway, resetBuffer, updateMissionStatus, handleAgentEvent],
  )

  const handleChatInputSend = useCallback(
    (text: string) => {
      handleSendToAgent(text)
    },
    [handleSendToAgent],
  )

  const handleStop = useCallback(() => {
    if (!activeMission) return
    Alert.alert(t('missions.stopMission'), t('missions.stopConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('missions.stopMission'),
        style: 'destructive',
        onPress: () => {
          // Guard: prevent event handler from overwriting the stopped status
          stoppedRef.current = true

          // Finalize any in-flight streaming message
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last && last.type !== 'tool_event' && last.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }]
            }
            return prev
          })
          setIsStreaming(false)
          streamingTextRef.current = ''
          resetBuffer()

          stopMission(activeMission.id)
        },
      },
    ])
  }, [activeMission, stopMission, resetBuffer, t])

  const handleArchive = useCallback(() => {
    if (!activeMission) return
    Alert.alert(t('missions.archiveMission'), t('missions.archiveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('missions.archiveMission'),
        onPress: () => {
          archiveMission(activeMission.id)
          router.back()
        },
      },
    ])
  }, [activeMission, archiveMission, router, t])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollContent: {
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl,
        },
        missionHeader: {
          marginBottom: theme.spacing.lg,
        },
        titleRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.sm,
        },
        titleWrap: {
          flex: 1,
          marginRight: theme.spacing.sm,
        },
        subtasksCard: {
          marginBottom: theme.spacing.lg,
        },
        chatSection: {
          marginBottom: theme.spacing.lg,
        },
        chatHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        },
        errorCard: {
          backgroundColor: theme.colors.status.error + '15',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.status.error + '30',
          marginBottom: theme.spacing.lg,
        },
        errorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
        },
        abortButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
        },
        idleIndicator: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.status.warning + '15',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.status.warning + '30',
        },
        thinkingContainer: {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        },
      }),
    [theme],
  )

  if (!activeMission) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('missions.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading3" style={{ color: theme.colors.text.primary }}>
            {t('missions.noMissionSelected')}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const isActive =
    activeMission.status === 'pending' ||
    activeMission.status === 'in_progress' ||
    activeMission.status === 'idle'
  const canArchive =
    activeMission.status === 'completed' ||
    activeMission.status === 'stopped' ||
    activeMission.status === 'error'

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={activeMission.title}
        showBack
        right={
          isActive ? (
            <TouchableOpacity
              style={styles.abortButton}
              onPress={handleStop}
              accessibilityLabel={t('missions.stopMission')}
            >
              <Ionicons name="stop-circle-outline" size={20} color={theme.colors.status.error} />
            </TouchableOpacity>
          ) : canArchive ? (
            <TouchableOpacity
              style={styles.abortButton}
              onPress={handleArchive}
              accessibilityLabel={t('missions.archiveMission')}
            >
              <Ionicons name="archive-outline" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
            const threshold = layoutMeasurement.height * 0.3
            const isNearBottom =
              contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold
            shouldAutoScrollRef.current = isNearBottom
          }}
          onContentSizeChange={() => {
            if (shouldAutoScrollRef.current) {
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          }}
        >
          {/* Mission header */}
          <View style={styles.missionHeader}>
            <View style={styles.titleRow}>
              <View style={styles.titleWrap}>
                <Text
                  variant="heading2"
                  numberOfLines={2}
                  style={{ color: theme.colors.text.primary }}
                >
                  {activeMission.title}
                </Text>
              </View>
              <MissionStatusBadge status={activeMission.status} />
            </View>
            <Text variant="bodySmall" color="secondary">
              {activeMission.prompt}
            </Text>
            <Text
              variant="caption"
              color="tertiary"
              style={{ marginTop: theme.spacing.xs, fontFamily: 'monospace', fontSize: 11 }}
            >
              {activeMission.sessionKey}
            </Text>
          </View>

          {/* Subtask progress */}
          <Card style={styles.subtasksCard}>
            <Text
              variant="heading3"
              style={{
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.md,
              }}
            >
              {t('missions.subtasks')}
            </Text>
            <SubtaskTimeline subtasks={activeMission.subtasks} />
          </Card>

          {/* Error state */}
          {activeMission.status === 'error' && (
            <View style={styles.errorCard}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.status.error} />
                <Text variant="heading3" style={{ color: theme.colors.status.error }}>
                  {t('missions.missionError')}
                </Text>
              </View>
              {activeMission.errorMessage && (
                <Text variant="body" style={{ color: theme.colors.text.primary }}>
                  {activeMission.errorMessage}
                </Text>
              )}
              <Button
                title={t('missions.retryMission')}
                onPress={() => {
                  updateMissionStatus(activeMission.id, 'in_progress', {
                    errorMessage: undefined,
                  })
                  handleSendToAgent('Please retry the last step that failed.')
                }}
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          )}

          {/* Completion state */}
          {activeMission.status === 'completed' && activeMission.conclusion && (
            <MissionConclusionCard conclusion={activeMission.conclusion} />
          )}

          {/* Idle state indicator */}
          {activeMission.status === 'idle' && (
            <View style={styles.idleIndicator}>
              <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.status.warning} />
              <Text variant="body" style={{ color: theme.colors.text.primary, flex: 1 }}>
                {t('missions.waitingForInput')}
              </Text>
            </View>
          )}

          {/* Chat messages */}
          {(messages.length > 0 || isStreaming) && (
            <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color={theme.colors.text.secondary}
                />
                <Text variant="heading3" style={{ color: theme.colors.text.primary }}>
                  {restoredHistory ? t('missions.conversationHistory') : t('missions.conversation')}
                </Text>
              </View>
              {messages.map((msg) =>
                msg.type === 'tool_event' ? (
                  <ToolEventBubble key={msg.id} message={msg} />
                ) : (
                  <ChatMessage
                    key={msg.id}
                    message={
                      msg.sender === 'agent' ? { ...msg, text: stripMissionMarkers(msg.text) } : msg
                    }
                  />
                ),
              )}
              {isStreaming &&
                (messages.length === 0 ||
                  messages[messages.length - 1]?.sender !== 'agent' ||
                  !messages[messages.length - 1]?.text) && (
                  <View style={styles.thinkingContainer}>
                    <ThinkingIndicator />
                  </View>
                )}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        {isActive && (
          <ChatInput onSend={handleChatInputSend} disabled={isStreaming} providerType="molt" />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
