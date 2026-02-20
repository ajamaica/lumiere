import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  Button,
  Card,
  Dropdown,
  ScreenHeader,
  Section,
  Text,
  TextInput,
} from '../src/components/ui'
import { useHaptics } from '../src/hooks/useHaptics'
import { useMcpServers } from '../src/hooks/useMcpServers'
import type { McpConnectionState, McpTransport } from '../src/services/mcp'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'
import { keyboardAvoidingBehavior } from '../src/utils/platform'

const TRANSPORT_OPTIONS = [
  { label: 'Streamable HTTP', value: 'streamable-http' },
  { label: 'SSE', value: 'sse' },
]

export default function McpServersScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const { t } = useTranslation()
  const {
    serversList,
    connectionStates,
    serverTools,
    connectionErrors,
    totalToolCount,
    addServer,
    removeServer,
    connectServer,
    disconnectServer,
    reconnectServer,
  } = useMcpServers()
  const haptics = useHaptics()

  // Form state for adding a new server
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [transport, setTransport] = useState<McpTransport>('streamable-http')
  const [apiKey, setApiKey] = useState('')

  const resetForm = useCallback(() => {
    setName('')
    setUrl('')
    setTransport('streamable-http')
    setApiKey('')
    setShowForm(false)
  }, [])

  const handleAdd = useCallback(() => {
    if (!name.trim() || !url.trim()) {
      Alert.alert(t('common.error'), t('mcp.errorNameUrlRequired'))
      return
    }
    addServer({
      name: name.trim(),
      url: url.trim(),
      transport,
      apiKey: apiKey.trim() || undefined,
      enabled: true,
    })
    resetForm()
  }, [name, url, transport, apiKey, addServer, resetForm, t])

  const handleRemove = useCallback(
    (id: string, serverName: string) => {
      haptics.warning()
      Alert.alert(t('mcp.removeTitle'), t('mcp.removeMessage', { name: serverName }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => removeServer(id),
        },
      ])
    },
    [removeServer, t, haptics],
  )

  const getStateColor = (state: McpConnectionState | undefined) => {
    switch (state) {
      case 'connected':
        return theme.colors.status.success
      case 'connecting':
        return theme.colors.status.warning
      case 'error':
        return theme.colors.status.error
      default:
        return theme.colors.text.tertiary
    }
  }

  const getStateLabel = (state: McpConnectionState | undefined) => {
    switch (state) {
      case 'connected':
        return t('mcp.connected')
      case 'connecting':
        return t('mcp.connecting')
      case 'error':
        return t('mcp.error')
      default:
        return t('mcp.disconnected')
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    serverCard: {
      marginBottom: theme.spacing.md,
    },
    serverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    serverActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    iconButton: {
      padding: theme.spacing.xs,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    toolCount: {
      marginTop: theme.spacing.xs,
    },
    formRow: {
      marginBottom: theme.spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('mcp.title')} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardAvoidingBehavior}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary */}
          <View style={styles.summaryRow}>
            <Ionicons
              name="extension-puzzle-outline"
              size={20}
              color={theme.colors.text.secondary}
            />
            <Text variant="caption" color="secondary">
              {t('mcp.summary', { servers: serversList.length, tools: totalToolCount })}
            </Text>
          </View>

          {/* Server list */}
          <Section title={t('mcp.servers')}>
            {serversList.map((server) => {
              const state = connectionStates[server.id]
              const tools = serverTools[server.id] ?? []
              const error = connectionErrors[server.id]
              const stateColor = getStateColor(state)

              return (
                <Card key={server.id} style={styles.serverCard}>
                  <View style={styles.serverHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading3">{server.name}</Text>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        {server.url}
                      </Text>
                    </View>
                    <View style={styles.serverActions}>
                      {state === 'connected' ? (
                        <TouchableOpacity
                          onPress={() => disconnectServer(server.id)}
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name="pause-circle-outline"
                            size={20}
                            color={theme.colors.text.secondary}
                          />
                        </TouchableOpacity>
                      ) : state === 'connecting' ? (
                        <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                      ) : (
                        <TouchableOpacity
                          onPress={() =>
                            state === 'error'
                              ? reconnectServer(server.id)
                              : connectServer(server.id)
                          }
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name="play-circle-outline"
                            size={20}
                            color={theme.colors.primary}
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemove(server.id, server.name)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.status.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Connection status */}
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
                    <Text variant="caption" style={{ color: stateColor }}>
                      {getStateLabel(state)}
                    </Text>
                  </View>

                  {/* Tool count */}
                  {tools.length > 0 && (
                    <Text variant="caption" color="secondary" style={styles.toolCount}>
                      {t('mcp.toolCount', { count: tools.length })}
                    </Text>
                  )}

                  {/* Error message */}
                  {error && (
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.status.error, marginTop: theme.spacing.xs }}
                      numberOfLines={2}
                    >
                      {error}
                    </Text>
                  )}
                </Card>
              )
            })}

            {serversList.length === 0 && (
              <Text color="secondary" center>
                {t('mcp.noServers')}
              </Text>
            )}
          </Section>

          {/* Add server form */}
          {showForm ? (
            <Section title={t('mcp.addServer')}>
              <View style={styles.formRow}>
                <TextInput
                  label={t('mcp.serverName')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('mcp.serverNamePlaceholder')}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label={t('mcp.serverUrl')}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com/mcp"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.formRow}>
                <Dropdown
                  label={t('mcp.transport')}
                  options={TRANSPORT_OPTIONS}
                  value={transport}
                  onValueChange={(v) => setTransport(v as McpTransport)}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label={t('mcp.apiKey')}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={t('mcp.apiKeyPlaceholder')}
                  secureTextEntry
                />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title={t('common.cancel')}
                  variant="secondary"
                  onPress={resetForm}
                  style={{ flex: 1 }}
                />
                <Button title={t('mcp.add')} onPress={handleAdd} style={{ flex: 1 }} />
              </View>
            </Section>
          ) : (
            <Button
              title={t('mcp.addServer')}
              variant="secondary"
              onPress={() => setShowForm(true)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
