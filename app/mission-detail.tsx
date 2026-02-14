import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MissionConclusionCard } from '../src/components/missions/MissionConclusionCard'
import { MissionStatusBadge } from '../src/components/missions/MissionStatusBadge'
import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, ScreenHeader, Text } from '../src/components/ui'
import { stripMissionMarkers, useMissionEventParser } from '../src/hooks/useMissionEventParser'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import type { AgentEvent } from '../src/services/molt/types'
import { currentSessionKeyAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('MissionDetail')

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
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)

  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [historyChecked, setHistoryChecked] = useState(false)
  const streamingTextRef = useRef('')
  const systemMessageSentRef = useRef(false)
  const stoppedRef = useRef(false)
  const hasCheckedRef = useRef(false)
  const autoStartSentRef = useRef(false)
  const pulseAnim = useRef(new Animated.Value(0)).current

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
    hasCheckedRef.current = false
    autoStartSentRef.current = false
    setHistoryChecked(false)
    setIsStreaming(false)
  }, [activeMission?.id])

  // Check whether this mission already has server history (to decide auto-start)
  useEffect(() => {
    if (!activeMission || !gateway.connected || hasCheckedRef.current) return
    hasCheckedRef.current = true

    const checkHistory = async () => {
      try {
        const response = (await gateway.getChatHistory(activeMission.sessionKey, 1)) as
          | {
              messages?: Array<{
                role: string
                content: Array<{ type: string; text?: string }>
                timestamp: number
              }>
            }
          | undefined

        if (response?.messages && response.messages.length > 0) {
          // Session already has history — system message was already sent
          systemMessageSentRef.current = true
          autoStartSentRef.current = true
        }
      } catch (err) {
        missionLogger.logError('Failed to check mission history', err)
      } finally {
        setHistoryChecked(true)
      }
    }

    checkHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.id, gateway.connected])

  // Auto-start mission on first load if in_progress and no existing history
  useEffect(() => {
    if (
      activeMission &&
      activeMission.status === 'in_progress' &&
      historyChecked &&
      gateway.connected &&
      !isStreaming &&
      !autoStartSentRef.current
    ) {
      autoStartSentRef.current = true
      handleSendToAgent('Begin executing this mission. Start with the first subtask.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.id, gateway.connected, historyChecked])

  // Blue glow pulse animation when streaming
  useEffect(() => {
    if (isStreaming) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      )
      animation.start()
      return () => animation.stop()
    } else {
      pulseAnim.setValue(0)
    }
  }, [isStreaming, pulseAnim])

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      if (!activeMission) return

      const isStopped = stoppedRef.current

      if (event.data?.delta) {
        streamingTextRef.current += event.data.delta

        // Parse markers to update mission/subtask status
        if (!isStopped) {
          const updates = parseChunk(event.data.delta)
          for (const update of updates) {
            switch (update.type) {
              case 'subtask_complete':
                if (update.subtaskId) {
                  updateSubtaskStatus(activeMission.id, update.subtaskId, 'completed')
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

  // Listen for agent events on this mission's session from any source
  useEffect(() => {
    if (!gateway.client || !activeMission) return

    const unsubscribe = gateway.client.onAgentEvent((event: AgentEvent) => {
      if (event.sessionKey !== activeMission.sessionKey) return

      // Track streaming state from external messages (e.g. sent from the chat screen)
      if (event.data?.phase === 'start') {
        setIsStreaming(true)
        streamingTextRef.current = ''
      }

      handleAgentEvent(event)
    })

    return unsubscribe
  }, [gateway.client, activeMission, handleAgentEvent])

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

      setIsStreaming(true)
      streamingTextRef.current = ''
      resetBuffer()

      // Ensure mission is in_progress when user responds
      if (
        activeMission.status === 'idle' ||
        (isAutoStart && activeMission.status === 'in_progress')
      ) {
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

  const handleOpenConversation = useCallback(() => {
    if (!activeMission) return
    setCurrentSessionKey(activeMission.sessionKey)
    router.push('/')
  }, [activeMission, setCurrentSessionKey, router])

  const handleStop = useCallback(() => {
    if (!activeMission) return
    Alert.alert(t('missions.stopMission'), t('missions.stopConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('missions.stopMission'),
        style: 'destructive',
        onPress: () => {
          stoppedRef.current = true
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

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  })

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
        conversationButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 2,
          borderColor: theme.colors.text.tertiary + '40',
          backgroundColor: theme.colors.background,
          marginBottom: theme.spacing.lg,
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {/* Conversation button */}
        <TouchableOpacity onPress={handleOpenConversation} activeOpacity={0.7}>
          <Animated.View
            style={[
              styles.conversationButton,
              isStreaming && {
                borderColor: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(59,130,246,0.3)', 'rgba(59,130,246,1)'],
                }),
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: glowOpacity,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            <Ionicons
              name="chatbubbles"
              size={20}
              color={isStreaming ? '#3B82F6' : theme.colors.text.secondary}
            />
            <Text
              variant="heading3"
              style={{ color: isStreaming ? '#3B82F6' : theme.colors.text.primary }}
            >
              {t('missions.conversation')}
            </Text>
            {isStreaming && (
              <Animated.View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#3B82F6',
                  opacity: glowOpacity,
                  marginLeft: theme.spacing.xs,
                }}
              />
            )}
          </Animated.View>
        </TouchableOpacity>

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
      </ScrollView>
    </SafeAreaView>
  )
}
