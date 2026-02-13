import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SubtaskTimeline } from '../src/components/missions/SubtaskTimeline'
import { Button, Card, GradientButton, ScreenHeader, Text } from '../src/components/ui'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const missionLogger = logger.create('Mission')

const COMMANDER_SESSION_KEY = 'agent:main:mission-commander'
const MAX_TITLE_LENGTH = 50

// ─── System prompt for the AI mission commander ────────────────────────────────
// This is generic to ALL missions. It instructs the AI to:
// 1. Improve/refine the user's prompt
// 2. Split the task into actionable todos
// 3. Always include a conclusion step at the end
// 4. Return a strict JSON structure
const MISSION_SYSTEM_PROMPT = `You are Mission Commander — an expert task planner and prompt engineer.

Your job is to take a user's raw request, improve it, and decompose it into a clear, actionable plan.

## Instructions

1. **Improve the prompt**: Rewrite the user's request to be clearer, more specific, and well-structured. Fix grammar, add detail where helpful, and make the intent unambiguous. Preserve the original meaning.

2. **Split into todos**: Break the improved task into sequential, actionable steps (todos). Each todo should be a single, concrete action that can be completed independently. Use between 3 and 8 todos.

3. **Conclusion step**: The LAST todo MUST always be a conclusion/summary step. This step wraps up the mission by reviewing what was accomplished and presenting the final result to the user.

4. **Title**: Create a short, descriptive title (maximum ${MAX_TITLE_LENGTH} characters) that captures the essence of the mission.

## Response Format

You MUST respond with ONLY a valid JSON object. No markdown, no code fences, no extra text before or after the JSON.

{
  "title": "<concise title, max ${MAX_TITLE_LENGTH} chars>",
  "description": "<improved, clear version of the user's request>",
  "todos": [
    { "id": "subtask-1", "title": "First actionable step" },
    { "id": "subtask-2", "title": "Second actionable step" },
    { "id": "subtask-3", "title": "Review and summarize results" }
  ]
}

## Rules
- Title MUST be ${MAX_TITLE_LENGTH} characters or fewer.
- Use sequential IDs: subtask-1, subtask-2, etc.
- Create 3–8 todos. Each should be a clear, single action.
- The last todo MUST be a conclusion/wrap-up step.
- Output ONLY the JSON object. No additional text.`

interface PlanTodo {
  id: string
  title: string
}

interface ParsedPlan {
  title: string
  refinedPrompt: string
  subtasks: PlanTodo[]
}

function clampTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed
  return trimmed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + '…'
}

/**
 * Validates that a JSON response looks complete (not truncated mid-stream).
 * Checks for balanced braces/brackets and required fields.
 */
function isJsonComplete(text: string): boolean {
  const trimmed = text.trim()
  // Must start with { and end with }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false

  // Check balanced braces and brackets
  let braces = 0
  let brackets = 0
  let inString = false
  let escaped = false

  for (const ch of trimmed) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }

  return braces === 0 && brackets === 0
}

function tryParsePlan(text: string, originalPrompt: string): ParsedPlan | null {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"todos"[\s\S]*\}/)
  if (jsonMatch) {
    const jsonStr = jsonMatch[0]

    // Validate completeness before parsing
    if (!isJsonComplete(jsonStr)) {
      missionLogger.warn('JSON response appears truncated, skipping parse')
      return null
    }

    try {
      const parsed = JSON.parse(jsonStr)
      if (parsed.title && Array.isArray(parsed.todos) && parsed.todos.length > 0) {
        return {
          title: clampTitle(parsed.title),
          refinedPrompt: parsed.description || parsed.refinedPrompt || originalPrompt,
          subtasks: parsed.todos.map((s: { id?: string; title?: string }, i: number) => ({
            id: s.id || `subtask-${i + 1}`,
            title: s.title || `Step ${i + 1}`,
          })),
        }
      }
    } catch {
      // JSON parse failed, try fallback
    }
  }

  // Also try the old format with "subtasks" key for backwards compatibility
  const subtasksMatch = text.match(/\{[\s\S]*"title"[\s\S]*"subtasks"[\s\S]*\}/)
  if (subtasksMatch && isJsonComplete(subtasksMatch[0])) {
    try {
      const parsed = JSON.parse(subtasksMatch[0])
      if (parsed.title && Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
        return {
          title: clampTitle(parsed.title),
          refinedPrompt: parsed.description || parsed.refinedPrompt || originalPrompt,
          subtasks: parsed.subtasks.map((s: { id?: string; title?: string }, i: number) => ({
            id: s.id || `subtask-${i + 1}`,
            title: s.title || `Step ${i + 1}`,
          })),
        }
      }
    } catch {
      // fallback below
    }
  }

  // Fallback: extract numbered list items
  const lines = text.split('\n').filter((l) => l.trim())
  const titleLine = lines.find((l) => !l.match(/^\d+[.)]/))
  const subtaskLines = lines.filter((l) => l.match(/^\d+[.)]/))

  if (subtaskLines.length > 0) {
    return {
      title: clampTitle(titleLine?.replace(/^#+\s*/, '').trim() || 'Mission'),
      refinedPrompt: originalPrompt,
      subtasks: subtaskLines.map((l, i) => ({
        id: `subtask-${i + 1}`,
        title: l.replace(/^\d+[.)]\s*/, '').trim(),
      })),
    }
  }

  return null
}

function buildMissionSystemMessage(title: string, prompt: string, subtasks: PlanTodo[]): string {
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

// ─── Generating Animation Component ────────────────────────────────────────────

interface GeneratingAnimationProps {
  currentStep: number
}

function GeneratingAnimation({ currentStep }: GeneratingAnimationProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  // Pulsing animation for the main icon
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(1)
  // Rotating animation for the outer ring
  const rotation = useSharedValue(0)

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    )
  }, [pulseScale, pulseOpacity, rotation])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const steps = [
    t('missions.generatingStep1'),
    t('missions.generatingStep2'),
    t('missions.generatingStep3'),
  ]

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
      gap: theme.spacing.xl,
    },
    iconContainer: {
      width: 100,
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outerRing: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: 'transparent',
      borderTopColor: theme.colors.primary,
      borderRightColor: theme.colors.primary + '60',
    },
    innerCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepsContainer: {
      gap: theme.spacing.sm,
      width: '100%',
      paddingHorizontal: theme.spacing.xl,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Animated.View style={[styles.outerRing, rotateStyle]} />
        <Animated.View style={[styles.innerCircle, pulseStyle]}>
          <Ionicons name="rocket" size={28} color={theme.colors.primary} />
        </Animated.View>
      </View>

      <Text variant="heading3" style={{ color: theme.colors.text.primary, textAlign: 'center' }}>
        {t('missions.generatingMission')}
      </Text>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isDone = index < currentStep
          const color = isDone
            ? theme.colors.status.success
            : isActive
              ? theme.colors.primary
              : theme.colors.text.tertiary

          return (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: color }]} />
              <Text
                variant="body"
                style={{
                  color,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {step}
              </Text>
              {isDone && (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.success} />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function CreateMissionScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const { createMission, setActiveMissionId, updateMissionStatus } = useMissions()

  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<'input' | 'generating' | 'review'>('input')
  const [plan, setPlan] = useState<ParsedPlan | null>(null)
  const [generatingStep, setGeneratingStep] = useState(0)
  const responseCompleteRef = useRef(false)

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
    setPhase('generating')
    setGeneratingStep(0)
    responseCompleteRef.current = false

    try {
      // Step 1: Reset the commander session to start fresh
      setGeneratingStep(0)
      try {
        await gateway.resetSession(COMMANDER_SESSION_KEY)
      } catch {
        // Session might not exist yet — that's fine
      }

      const planPrompt = `${MISSION_SYSTEM_PROMPT}\n\n---\n\nUser request:\n\n${prompt.trim()}`

      let responseText = ''

      // Step 2: Generating the plan via master-commander session
      setGeneratingStep(1)

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
        120_000, // 2 minute timeout for mission generation
      )

      // Mark the response as complete (the stream finished)
      responseCompleteRef.current = true

      // Step 3: Validating the response
      setGeneratingStep(2)

      // Validate the JSON is complete before parsing
      const trimmedResponse = responseText.trim()
      if (!trimmedResponse) {
        throw new Error('Empty response from commander')
      }

      const parsed = tryParsePlan(trimmedResponse, prompt.trim())
      if (parsed && parsed.subtasks.length > 0) {
        setPlan(parsed)
        setPhase('review')
      } else {
        // If we got a response but couldn't parse it, create a fallback
        missionLogger.warn('Could not parse commander response, using fallback plan')
        setPlan({
          title: clampTitle(prompt.trim()),
          refinedPrompt: prompt.trim(),
          subtasks: [
            { id: 'subtask-1', title: prompt.trim() },
            { id: 'subtask-2', title: 'Review and summarize results' },
          ],
        })
        setPhase('review')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      missionLogger.logError('Failed to generate mission', err)
      Alert.alert(t('common.error'), `${t('missions.analyzeError')}\n\n${errorMsg}`)
      setPhase('input')
    }
  }, [prompt, gateway, t])

  const handleStartMission = useCallback(() => {
    if (!plan || plan.subtasks.length === 0) return

    const missionPrompt = plan.refinedPrompt || prompt.trim()
    const systemMessage = buildMissionSystemMessage(plan.title, missionPrompt, plan.subtasks)

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

          {phase === 'generating' && <GeneratingAnimation currentStep={generatingStep} />}

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

              <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                {t('missions.refinedPromptLabel')}
              </Text>
              <TextInput
                style={styles.refinedPromptInput}
                value={plan.refinedPrompt}
                onChangeText={(text) => setPlan({ ...plan, refinedPrompt: text })}
                placeholder={t('missions.promptPlaceholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
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
