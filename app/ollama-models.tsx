import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { currentServerIdAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const ollamaLogger = logger.create('OllamaModels')

interface OllamaModel {
  name: string
  size: number
  modified_at: string
  digest: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function OllamaModelsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { currentServer, updateServer } = useServers()
  const [currentServerId] = useAtom(currentServerIdAtom)

  const [models, setModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const currentModel = currentServer?.model || 'llama3.2'

  const fetchModels = useCallback(
    async (signal?: AbortSignal) => {
      if (!currentServer) return

      setLoading(true)
      setError(null)

      try {
        const host = currentServer.url.replace(/\/+$/, '')
        const response = await fetch(`${host}/api/tags`, { signal })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        if (data.models && Array.isArray(data.models)) {
          setModels(data.models)
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        ollamaLogger.logError('Failed to fetch Ollama models', err)
        setError('Could not fetch models. Make sure Ollama is running.')
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [currentServer],
  )

  useEffect(() => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchModels(controller.signal)

    return () => controller.abort()
  }, [fetchModels])

  const handleSelectModel = async (modelName: string) => {
    if (!currentServerId || modelName === currentModel) return

    await updateServer(currentServerId, { model: modelName })
    router.back()
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    modelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    activeModel: {
      backgroundColor: theme.colors.primary + '20',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    modelInfo: {
      flex: 1,
    },
    modelMeta: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    retryButton: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
  })

  if (!currentServer || currentServer.providerType !== 'ollama') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Models" showBack />
        <View style={styles.centerContainer}>
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            Not Available
          </Text>
          <Text color="secondary" center>
            Model selection is only available for Ollama servers.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Models" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title={`Current: ${currentModel}`}>
          {loading ? (
            <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text color="secondary" center style={{ marginTop: theme.spacing.md }}>
                Loading models...
              </Text>
            </View>
          ) : error ? (
            <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
              <Text color="secondary" center>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  abortControllerRef.current?.abort()
                  const controller = new AbortController()
                  abortControllerRef.current = controller
                  fetchModels(controller.signal)
                }}
              >
                <Text style={{ color: theme.colors.text.inverse }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : models.length > 0 ? (
            models.map((model) => {
              const isActive = model.name === currentModel
              return (
                <TouchableOpacity
                  key={model.digest}
                  style={[styles.modelItem, isActive && styles.activeModel]}
                  onPress={() => handleSelectModel(model.name)}
                >
                  <View style={styles.modelInfo}>
                    <Text variant="body">{model.name}</Text>
                    <View style={styles.modelMeta}>
                      <Text variant="caption">{formatSize(model.size)}</Text>
                      <Text variant="caption">{formatDate(model.modified_at)}</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={isActive ? theme.colors.primary : theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              )
            })
          ) : (
            <Text color="secondary" center>
              No models found. Pull a model with: ollama pull llama3.2
            </Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
