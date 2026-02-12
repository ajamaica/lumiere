import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

import { createMarkdownStyles } from '../src/components/chat/ChatMessage.styles'
import { useMarkdownRules } from '../src/components/chat/useMarkdownRules'
import { MissionConclusionCard } from '../src/components/missions/MissionConclusionCard'
import { MissionStatusBadge } from '../src/components/missions/MissionStatusBadge'
import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, ScreenHeader, Text } from '../src/components/ui'
import { useMissionEventParser } from '../src/hooks/useMissionEventParser'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import type { AgentEvent } from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('MissionDetail')

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export default function MissionDetailScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { activeMission, updateMissionStatus, updateSubtaskStatus, addMissionSkill } = useMissions()
  const { getProviderConfig, currentServerId } = useServers()
  const { parseChunk, resetBuffer } = useMissionEventParser()
  const { markdownRules, handleLinkPress } = useMarkdownRules()
  const userMarkdownStyles = useMemo(() => createMarkdownStyles(theme, true), [theme])
  const assistantMarkdownStyles = useMemo(() => createMarkdownStyles(theme, false), [theme])

  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const streamingTextRef = useRef('')
  const systemMessageSentRef = useRef(false)

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

  // Auto-start mission on first load if in_progress and no messages
  useEffect(() => {
    if (
      activeMission &&
      activeMission.status === 'in_progress' &&
      messages.length === 0 &&
      gateway.connected &&
      !isStreaming
    ) {
      handleSendToAgent(`Begin executing this mission. Start with the first subtask.`, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.id, gateway.connected])

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      if (!activeMission) return

      if (event.data?.delta) {
        streamingTextRef.current += event.data.delta

        // Update the last assistant message in-place
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, text: streamingTextRef.current }]
          }
          return [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              role: 'assistant' as const,
              text: streamingTextRef.current,
              timestamp: Date.now(),
            },
          ]
        })

        // Parse for mission markers
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
                conclusion: streamingTextRef.current,
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

      if (event.data?.phase === 'end') {
        setIsStreaming(false)
        streamingTextRef.current = ''
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
            role: 'user',
            text,
            timestamp: Date.now(),
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

  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    handleSendToAgent(text)
  }, [inputText, handleSendToAgent])

  const handleAbort = useCallback(() => {
    if (!activeMission) return
    Alert.alert(t('missions.abortMission'), t('missions.abortConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('missions.abortMission'),
        style: 'destructive',
        onPress: () => {
          updateMissionStatus(activeMission.id, 'error', {
            errorMessage: 'Mission aborted by user',
          })
          router.back()
        },
      },
    ])
  }, [activeMission, updateMissionStatus, router, t])

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
        promptCard: {
          marginBottom: theme.spacing.lg,
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
        messageBubble: {
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing.sm,
          maxWidth: '85%',
        },
        userBubble: {
          backgroundColor: theme.colors.message.user,
          alignSelf: 'flex-end',
        },
        assistantBubble: {
          backgroundColor: theme.colors.message.agent,
          alignSelf: 'flex-start',
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        textInput: {
          flex: 1,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          color: theme.colors.text.primary,
          fontSize: 15,
          maxHeight: 100,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        sendButton: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
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

  const isActive = activeMission.status === 'in_progress' || activeMission.status === 'idle'

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={activeMission.title}
        showBack
        right={
          isActive ? (
            <TouchableOpacity
              style={styles.abortButton}
              onPress={handleAbort}
              accessibilityLabel={t('missions.abortMission')}
            >
              <Ionicons name="stop-circle-outline" size={20} color={theme.colors.status.error} />
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Mission header */}
          <View style={styles.missionHeader}>
            <View style={styles.titleRow}>
              <View style={styles.titleWrap}>
                <Text variant="heading2" style={{ color: theme.colors.text.primary }}>
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
          {messages.length > 0 && (
            <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color={theme.colors.text.secondary}
                />
                <Text variant="heading3" style={{ color: theme.colors.text.primary }}>
                  {t('missions.conversation')}
                </Text>
              </View>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Markdown
                    style={msg.role === 'user' ? userMarkdownStyles : assistantMarkdownStyles}
                    onLinkPress={(url: string) => {
                      handleLinkPress(url)
                      return false
                    }}
                    mergeStyle={true}
                    rules={markdownRules}
                  >
                    {msg.text}
                  </Markdown>
                </View>
              ))}
              {isStreaming && (
                <View style={{ alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        {isActive && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              editable={!isStreaming}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isStreaming) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!inputText.trim() || isStreaming}
              accessibilityRole="button"
              accessibilityLabel={t('chat.send')}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
