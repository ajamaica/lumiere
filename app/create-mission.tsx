import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'

import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, GradientButton, ScreenHeader, Text } from '../src/components/ui'
import { useMissionActions } from '../src/hooks/useMissionActions'
import { useServers } from '../src/hooks/useServers'
import { useOpenCrawGateway } from '../src/services/opencraw'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('Mission')

const COMMANDER_SESSION_KEY = 'agent:main:mission-commander'
const MAX_TITLE_LENGTH = 50

interface PlanSubtask {
  id: string
  title: string
  description?: string
}

interface ParsedPlan {
  title: string
  description: string
  refinedPrompt: string
  subtasks: PlanSubtask[]
}

function clampTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed
  return trimmed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + '…'
}

function ensureConclusionSubtask(subtasks: PlanSubtask[]): PlanSubtask[] {
  if (subtasks.length === 0) return subtasks

  // Check if the last subtask is already a conclusion/result type
  const lastTitle = subtasks[subtasks.length - 1].title.toLowerCase()
  const conclusionKeywords = [
    'conclusion',
    'summary',
    'result',
    'final',
    'wrap up',
    'deliver',
    'review',
    'compile',
  ]
  const hasConclusionLast = conclusionKeywords.some((kw) => lastTitle.includes(kw))

  if (!hasConclusionLast) {
    subtasks.push({
      id: `subtask-${subtasks.length + 1}`,
      title: 'Compile results and conclusion',
      description:
        'Summarize the findings and results from all previous subtasks. Provide a clear, actionable conclusion that addresses the original request.',
    })
  }

  return subtasks
}

function tryParsePlan(text: string, originalPrompt: string): ParsedPlan | null {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"subtasks"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title && Array.isArray(parsed.subtasks)) {
        let subtasks = parsed.subtasks.map(
          (s: { id?: string; title?: string; description?: string }, i: number) => ({
            id: s.id || `subtask-${i + 1}`,
            title: s.title || `Step ${i + 1}`,
            description: s.description || undefined,
          }),
        )
        subtasks = ensureConclusionSubtask(subtasks)
        return {
          title: clampTitle(parsed.title),
          description: parsed.description || '',
          refinedPrompt: parsed.refinedPrompt || originalPrompt,
          subtasks,
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
    let subtasks = subtaskLines.map((l, i) => ({
      id: `subtask-${i + 1}`,
      title: l.replace(/^\d+[.)]\s*/, '').trim(),
    }))
    subtasks = ensureConclusionSubtask(subtasks)
    return {
      title: clampTitle(titleLine?.replace(/^#+\s*/, '').trim() || 'Mission'),
      description: '',
      refinedPrompt: originalPrompt,
      subtasks,
    }
  }

  return null
}

function buildMissionSystemMessage(
  title: string,
  description: string,
  prompt: string,
  subtasks: PlanSubtask[],
): string {
  const subtaskList = subtasks
    .map((s, i) => {
      let entry = `${i + 1}. [${s.id}] ${s.title}`
      if (s.description) {
        entry += `\n   Details: ${s.description}`
      }
      return entry
    })
    .join('\n')

  const briefSection = description ? `\nMission brief: ${description}\n` : ''

  return `You are executing Mission: "${title}"

Original request: "${prompt}"
${briefSection}
Plan:
${subtaskList}

RULES:
- Work through subtasks in order. When you complete one, announce it clearly with "[SUBTASK_COMPLETE:<id>]" (e.g. [SUBTASK_COMPLETE:subtask-1]).
- For each subtask, follow the detailed description provided. Be thorough and address every point mentioned in the description.
- If you need user input or a decision, ask clearly and wait. Mark with "[WAITING_INPUT]".
- You may use any installed skills. If you need a skill that isn't installed, suggest it with "[SUGGEST_SKILL:<name>]".
- The final subtask is the conclusion — use it to synthesize all findings from previous subtasks into a comprehensive answer that directly addresses the original request. Mark with "[MISSION_COMPLETE]" after completing the conclusion.
- If you encounter an unrecoverable error, explain it and mark with "[MISSION_ERROR:<reason>]".
- Keep the user informed of progress at all times.
- Be friendly, thorough, and proactive in completing each subtask.

SUB-AGENTS:
- When a subtask involves research, long-running tasks, or work that can run in parallel, spawn a sub-agent using the sessions_spawn tool.
- Before spawning, announce it with "[SUBAGENT_SPAWN:<subtask-id>:<personality>:<brief task description>]" so the user can see that a sub-agent is being dispatched. The <personality> MUST be one of: general, philosophical, engineering, creative, scientific, critical, strategic.
- Choose the personality that best fits the nature of the subtask. Each personality shapes how the sub-agent reasons and what alternatives it prioritizes:

  1. **general** — Balanced generalist. Approaches the task with broad, well-rounded analysis. No particular bias; considers all angles equally and delivers a pragmatic synthesis.

  2. **philosophical** — Deep conceptual thinker. Questions underlying assumptions, explores the meaning and implications of ideas, weighs ethical dimensions, and considers long-term consequences beyond the immediate task.

  3. **engineering** — Systems-oriented problem solver. Focuses on technical feasibility, architecture, performance, edge cases, and implementation details. Prefers concrete, buildable solutions over abstract ones.

  4. **creative** — Lateral thinker and innovator. Generates novel approaches, brainstorms unconventional alternatives, reframes problems, and challenges conventional solutions. Values originality and surprise.

  5. **scientific** — Evidence-based researcher. Formulates hypotheses, seeks data to validate or refute claims, evaluates source quality, and prioritizes empirical rigor, reproducibility, and methodological soundness.

  6. **critical** — Devil's advocate and risk analyst. Identifies weaknesses, edge cases, hidden assumptions, and potential failure modes. Stress-tests ideas and proposals before they are accepted, flagging what could go wrong.

  7. **strategic** — Big-picture planner. Considers stakeholder impact, resource allocation, trade-offs, competitive positioning, and long-term value. Evaluates decisions through the lens of priorities and constraints.

- You may spawn multiple sub-agents with different personalities for the same subtask to get diverse perspectives when the task benefits from it.
- Sub-agents run in isolated sessions and will report their results back automatically when finished.
- You can spawn multiple sub-agents for different subtasks to parallelize work.
- Wait for sub-agent results before marking the parent subtask as complete.
- Sub-agents cannot spawn their own sub-agents (no nesting).
- Prefer spawning sub-agents for independent research or data-gathering subtasks while you continue working on other steps.
- When composing the task description for a sub-agent, frame it through the chosen personality lens. For example, a "critical" sub-agent should be explicitly asked to find flaws, while an "engineering" sub-agent should be asked to propose a concrete implementation.`
}

export default function CreateMissionScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const { createMission, setActiveMissionId, updateMissionStatus } = useMissionActions()

  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'review'>('input')
  const [plan, setPlan] = useState<ParsedPlan | null>(null)
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const gateway = useOpenCrawGateway({
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

    const planPrompt = `You are Mission Commander — an expert task planner that decomposes user requests into detailed, actionable steps.

Analyze the request below and return ONLY a valid JSON object (no markdown, no extra text):
{"title": "<concise title, max ${MAX_TITLE_LENGTH} chars>", "description": "<2-3 sentence mission brief explaining the overall approach, strategy, and expected outcome>", "refinedPrompt": "<improved, clear version of the user request>", "subtasks": [{"id": "subtask-1", "title": "Step title", "description": "Detailed explanation of what this step involves, what to look for, and what the expected outcome is."}, {"id": "subtask-2", "title": "Step title", "description": "Detailed explanation..."}]}

Rules:
- Title MUST be ${MAX_TITLE_LENGTH} characters or fewer. It should be a short, descriptive label.
- description: Write a concise mission brief (2-3 sentences) that explains the overall plan strategy, what approach will be taken, and what the user can expect as a final outcome. This is NOT a repeat of the user request — it is your expert assessment of how the mission will be executed.
- refinedPrompt: Rewrite the user's request to be clearer, more specific, and well-structured. Fix grammar and add detail where helpful, but preserve the original intent.
- Create 3-8 subtasks. You MUST create at least 2 subtasks — never return a single subtask.
- Each subtask MUST have both a "title" (short action label) and a "description" (1-3 sentences explaining the step in detail: what needs to be done, how to approach it, and what the expected output is).
- The LAST subtask MUST always be a conclusion or result step (e.g. "Compile results and conclusion") that synthesizes findings from all previous subtasks into a clear, actionable answer.
- Use sequential IDs: subtask-1, subtask-2, etc.
- Make each subtask specific enough that it can be executed independently with clear success criteria.

User request: ${prompt.trim()}`

    setPhase('analyzing')

    try {
      let responseText = ''

      // Wait for both the RPC response and the stream to finish.
      // sendAgentRequest resolves on RPC response, but streaming events
      // arrive separately via WebSocket — we need the 'end' lifecycle event.
      const streamDone = new Promise<void>((resolve) => {
        gateway
          .sendAgentRequest(
            {
              message: planPrompt,
              idempotencyKey: `mission-plan-${Date.now()}`,
              sessionKey: COMMANDER_SESSION_KEY,
            },
            (event) => {
              if (event.data?.delta) {
                responseText += event.data.delta
              }
              if (event.stream === 'lifecycle' && event.data?.phase === 'end') {
                resolve()
              }
            },
          )
          .catch((err: unknown) => {
            // If the RPC itself fails, also resolve so we don't hang
            missionLogger.logError('Agent request failed', err)
            resolve()
          })
      })

      await streamDone

      const parsed = tryParsePlan(responseText, prompt.trim())
      if (parsed && parsed.subtasks.length > 0) {
        setPlan(parsed)
        setPhase('review')
      } else {
        // Fallback: create a plan with the request as the main task plus a conclusion
        setPlan({
          title: clampTitle(prompt.trim()),
          description: '',
          refinedPrompt: prompt.trim(),
          subtasks: [
            {
              id: 'subtask-1',
              title: prompt.trim(),
              description: 'Execute the main request as described by the user.',
            },
            {
              id: 'subtask-2',
              title: 'Compile results and conclusion',
              description:
                'Summarize the findings and results from the previous step. Provide a clear, actionable conclusion that addresses the original request.',
            },
          ],
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

    const missionPrompt = plan.refinedPrompt || prompt.trim()
    const systemMessage = buildMissionSystemMessage(
      plan.title,
      plan.description,
      missionPrompt,
      plan.subtasks,
    )

    if (!systemMessage.trim()) {
      Alert.alert(t('common.error'), t('missions.systemMessageEmpty'))
      return
    }

    const mission = createMission({
      title: plan.title,
      prompt: missionPrompt,
      systemMessage,
      subtasks: plan.subtasks,
    })

    // Start the mission
    updateMissionStatus(mission.id, 'in_progress')
    setActiveMissionId(mission.id)

    router.replace('/mission-detail')
  }, [plan, prompt, createMission, updateMissionStatus, setActiveMissionId, router, t])

  const previewSystemMessage = useMemo(() => {
    if (!plan) return ''
    const missionPrompt = plan.refinedPrompt || prompt.trim()
    return buildMissionSystemMessage(plan.title, plan.description, missionPrompt, plan.subtasks)
  }, [plan, prompt])

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
    refinedPromptInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    promptPreviewToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    promptPreviewText: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      maxHeight: 200,
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
        <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
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
                placeholder={t('missions.titlePlaceholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                maxLength={MAX_TITLE_LENGTH}
                editable={false}
              />

              <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                {t('missions.refinedPromptLabel')}
              </Text>
              <TextInput
                style={styles.refinedPromptInput}
                value={plan.refinedPrompt}
                placeholder={t('missions.promptPlaceholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                editable={false}
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

              <TouchableOpacity
                style={styles.promptPreviewToggle}
                onPress={() => setShowPromptPreview(!showPromptPreview)}
              >
                <Text variant="caption" color="secondary">
                  {t('missions.agentPromptLabel')}
                </Text>
                <Ionicons
                  name={showPromptPreview ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
              {showPromptPreview && (
                <>
                  <Text
                    variant="caption"
                    color="tertiary"
                    style={{ marginBottom: theme.spacing.xs }}
                  >
                    {t('missions.agentPromptDescription')}
                  </Text>
                  <ScrollView style={styles.promptPreviewText} nestedScrollEnabled>
                    <Text
                      variant="caption"
                      style={{
                        color: theme.colors.text.secondary,
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        fontSize: 11,
                        lineHeight: 16,
                      }}
                    >
                      {previewSystemMessage}
                    </Text>
                  </ScrollView>
                </>
              )}

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
