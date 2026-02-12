import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, GradientButton, ScreenHeader, Text } from '../src/components/ui'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { sessionContextAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('Mission')

const COMMANDER_SESSION_KEY = 'agent:main:mission-commander'
const MAX_TITLE_LENGTH = 50

interface PlanSubtask {
  id: string
  title: string
}

interface ParsedPlan {
  title: string
  subtasks: PlanSubtask[]
}

function clampTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed
  return trimmed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + '…'
}

function tryParsePlan(text: string): ParsedPlan | null {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"subtasks"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title && Array.isArray(parsed.subtasks)) {
        return {
          title: clampTitle(parsed.title),
          subtasks: parsed.subtasks.map((s: { id?: string; title?: string }, i: number) => ({
            id: s.id || `subtask-${i + 1}`,
            title: s.title || `Step ${i + 1}`,
          })),
        }
      }
    } catch {
      // JSON parse failed, try fallback
    }
  }

  // Fallback: extract numbered list items
  const lines = text.split('\n').filter((l) => l.trim())
  const titleLine = lines.find((l) => !l.match(/^\d+[.)]/))
  const subtaskLines = lines.filter((l) => l.match(/^\d+[.)]/))

  if (subtaskLines.length > 0) {
    return {
      title: clampTitle(titleLine?.replace(/^#+\s*/, '').trim() || 'Mission'),
      subtasks: subtaskLines.map((l, i) => ({
        id: `subtask-${i + 1}`,
        title: l.replace(/^\d+[.)]\s*/, '').trim(),
      })),
    }
  }

  return null
}

function buildMissionSystemMessage(title: string, prompt: string, subtasks: PlanSubtask[]): string {
  const subtaskList = subtasks.map((s, i) => `${i + 1}. [${s.id}] ${s.title}`).join('\n')

  return `You are executing Mission: "${title}"

Original request: "${prompt}"

Plan:
${subtaskList}

RULES:
- Work through subtasks in order. When you complete one, announce it clearly with "[SUBTASK_COMPLETE:<id>]" (e.g. [SUBTASK_COMPLETE:subtask-1]).
- If you need user input or a decision, ask clearly and wait. Mark with "[WAITING_INPUT]".
- You may use any installed skills. If you need a skill that isn't installed, suggest it with "[SUGGEST_SKILL:<name>]".
- When all subtasks are done, provide a comprehensive conclusion that addresses the original request. Mark with "[MISSION_COMPLETE]".
- If you encounter an unrecoverable error, explain it and mark with "[MISSION_ERROR:<reason>]".
- Keep the user informed of progress at all times.
- Be friendly, thorough, and proactive in completing each subtask.`
}

export default function CreateMissionScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const { createMission, setActiveMissionId, updateMissionStatus } = useMissions()
  const [, setSessionContexts] = useAtom(sessionContextAtom)

  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'review'>('input')
  const [plan, setPlan] = useState<ParsedPlan | null>(null)

  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

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

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return
    setPhase('analyzing')

    try {
      const planPrompt = `You are Mission Commander — a task planner that decomposes user requests into actionable steps.

Analyze the request below and return ONLY a valid JSON object (no markdown, no extra text):
{"title": "<concise title, max ${MAX_TITLE_LENGTH} chars>", "subtasks": [{"id": "subtask-1", "title": "First step"}, {"id": "subtask-2", "title": "Second step"}]}

Rules:
- Title MUST be ${MAX_TITLE_LENGTH} characters or fewer. It should be a short, descriptive label.
- Create 3-8 subtasks. Each should be a single, clear action.
- Use sequential IDs: subtask-1, subtask-2, etc.

User request: ${prompt.trim()}`

      let responseText = ''

      await gateway.sendAgentRequest(
        {
          message: planPrompt,
          idempotencyKey: `mission-plan-${Date.now()}`,
          sessionKey: COMMANDER_SESSION_KEY,
        },
        (event) => {
          if (event.data?.delta) {
            responseText += event.data.delta
          }
        },
      )

      const parsed = tryParsePlan(responseText)
      if (parsed && parsed.subtasks.length > 0) {
        setPlan(parsed)
        setPhase('review')
      } else {
        // Fallback: create a simple single-step plan
        setPlan({
          title: clampTitle(prompt.trim()),
          subtasks: [{ id: 'subtask-1', title: prompt.trim() }],
        })
        setPhase('review')
      }
    } catch (err) {
      missionLogger.logError('Failed to analyze mission', err)
      Alert.alert(t('common.error'), t('missions.analyzeError'))
      setPhase('input')
    }
  }, [prompt, gateway, t])

  const handleStartMission = useCallback(() => {
    if (!plan || plan.subtasks.length === 0) return

    const systemMessage = buildMissionSystemMessage(plan.title, prompt.trim(), plan.subtasks)

    if (!systemMessage.trim()) {
      Alert.alert(t('common.error'), t('missions.systemMessageEmpty'))
      return
    }

    const mission = createMission({
      title: plan.title,
      prompt: prompt.trim(),
      systemMessage,
      subtasks: plan.subtasks,
    })

    // Set the system message for this mission's session
    setSessionContexts((prev) => ({
      ...prev,
      [mission.sessionKey]: { systemMessage },
    }))

    // Start the mission
    updateMissionStatus(mission.id, 'in_progress')
    setActiveMissionId(mission.id)

    router.replace('/mission-detail')
  }, [
    plan,
    prompt,
    createMission,
    setSessionContexts,
    updateMissionStatus,
    setActiveMissionId,
    router,
    t,
  ])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    promptInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      color: theme.colors.text.primary,
      fontSize: 16,
      minHeight: 120,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
    },
    analyzingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    planIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    removeBtn: {
      padding: theme.spacing.xs,
    },
    titleInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('missions.newMission')} showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {phase === 'input' && (
            <>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                {t('missions.promptDescription')}
              </Text>
              <TextInput
                style={styles.promptInput}
                placeholder={t('missions.promptPlaceholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                autoFocus
              />
              <GradientButton
                title={t('missions.launchMission')}
                onPress={handleAnalyze}
                disabled={!prompt.trim() || !gateway.connected}
                icon={<Ionicons name="rocket" size={18} color="#FFFFFF" />}
              />
              {!gateway.connected && (
                <Text
                  variant="caption"
                  color="secondary"
                  center
                  style={{ marginTop: theme.spacing.md }}
                >
                  {t('missions.connectingGateway')}
                </Text>
              )}
            </>
          )}

          {phase === 'analyzing' && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                variant="heading3"
                style={{
                  color: theme.colors.text.primary,
                  marginTop: theme.spacing.lg,
                }}
              >
                {t('missions.analyzingMission')}
              </Text>
              <Text variant="body" color="secondary" center style={{ marginTop: theme.spacing.sm }}>
                {t('missions.analyzingDescription')}
              </Text>
            </View>
          )}

          {phase === 'review' && plan && (
            <>
              <View style={styles.planHeader}>
                <View style={styles.planIconCircle}>
                  <Ionicons name="list" size={20} color={theme.colors.primary} />
                </View>
                <Text variant="heading2" style={{ color: theme.colors.text.primary }}>
                  {t('missions.planReady')}
                </Text>
              </View>

              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
                {t('missions.planDescription')}
              </Text>

              <TextInput
                style={styles.titleInput}
                value={plan.title}
                onChangeText={(text) => setPlan({ ...plan, title: text })}
                placeholder={t('missions.titlePlaceholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                maxLength={MAX_TITLE_LENGTH}
              />

              <Card style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  variant="heading3"
                  style={{
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  {t('missions.subtasks')} ({plan.subtasks.length})
                </Text>
                <SubtaskTimeline
                  subtasks={plan.subtasks.map((s) => ({
                    ...s,
                    status: 'pending' as const,
                  }))}
                />
              </Card>

              <View style={styles.buttonRow}>
                <Button
                  title={t('common.back')}
                  variant="secondary"
                  onPress={() => {
                    setPhase('input')
                    setPlan(null)
                  }}
                  style={{ flex: 1 }}
                />
                <GradientButton
                  title={t('missions.startMission')}
                  onPress={handleStartMission}
                  icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
