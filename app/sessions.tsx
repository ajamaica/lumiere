import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import {
  deleteSessionData,
  ProviderConfig,
  readSessionIndex,
  SessionIndexEntry,
} from '../src/services/providers'
import { currentSessionKeyAtom, sessionAliasesAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { GlassView } from '../src/utils/glassEffect'
import { logger } from '../src/utils/logger'

const sessionsLogger = logger.create('Sessions')

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

export default function SessionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [sessionAliases] = useAtom(sessionAliasesAtom)
  const [config, setConfig] = useState<ProviderConfig | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [menuSessionKey, setMenuSessionKey] = useState<string | null>(null)

  // Molt provider uses server-side sessions via WebSocket gateway
  const isMoltProvider = config?.type === 'molt'

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, disconnect, listSessions, deleteSession } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config && isMoltProvider) {
      connect()
    } else if (config) {
      // For non-Molt providers, load sessions from the local index
      setLoading(false)
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isMoltProvider])

  // Load sessions from Molt gateway (server-side sessions)
  const loadMoltSessions = useCallback(async () => {
    if (!connected || !isMoltProvider) return

    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)
      }
    } catch (err) {
      sessionsLogger.logError('Failed to fetch sessions', err)
    } finally {
      setLoading(false)
    }
  }, [connected, listSessions, isMoltProvider])

  // Load sessions from local session index (for non-Molt providers)
  const loadLocalSessions = useCallback(async () => {
    if (!config || isMoltProvider) return

    try {
      const entries: SessionIndexEntry[] = await readSessionIndex(config.serverId)
      const localSessions: Session[] = entries.map((entry) => ({
        key: entry.key,
        messageCount: entry.messageCount,
        lastActivity: entry.lastActivity,
      }))
      setSessions(localSessions)
    } catch (err) {
      sessionsLogger.logError('Failed to load local sessions', err)
    } finally {
      setLoading(false)
    }
  }, [config, isMoltProvider])

  useEffect(() => {
    if (isMoltProvider) {
      loadMoltSessions()
    } else {
      loadLocalSessions()
    }
  }, [loadMoltSessions, loadLocalSessions, isMoltProvider])

  const handleNewSession = () => {
    const newSessionKey = `agent:main:${Date.now()}`
    setCurrentSessionKey(newSessionKey)
    router.back()
  }

  const handleSelectSession = (sessionKey: string) => {
    setCurrentSessionKey(sessionKey)
    router.back()
  }

  const formatSessionKey = (key: string) => {
    if (sessionAliases[key]) return sessionAliases[key]
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const handleEditSession = (sessionKey: string) => {
    router.push({ pathname: '/edit-session', params: { key: sessionKey } })
  }

  const handleLongPressSession = (sessionKey: string) => {
    setMenuSessionKey(sessionKey)
  }

  const handleDeleteSession = (sessionKey: string) => {
    setMenuSessionKey(null)
    Alert.alert(t('sessions.deleteConfirmTitle'), t('sessions.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          // Delete from the remote Molt server if this is a Molt provider
          if (isMoltProvider && connected) {
            try {
              await deleteSession(sessionKey)
            } catch (err) {
              sessionsLogger.logError('Failed to delete remote session', err)
            }
          }
          await deleteSessionData(config?.serverId, sessionKey)
          setSessions((prev) => prev.filter((s) => s.key !== sessionKey))
          if (sessionKey === currentSessionKey) {
            const newKey = `agent:main:${Date.now()}`
            setCurrentSessionKey(newKey)
          }
        },
      },
    ])
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    spacer: {
      height: theme.spacing.lg,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionIcon: {
      marginRight: theme.spacing.sm,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      flex: 1,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionContent: {
      flex: 1,
    },
    sessionActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    sessionActionButton: {
      padding: theme.spacing.xs,
    },
    menuOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    menuContainer: {
      width: '75%',
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    menuGlass: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm,
    },
    menuHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    menuItemIcon: {
      marginRight: theme.spacing.md,
    },
    menuItemText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    menuItemDestructive: {
      color: theme.colors.status.error,
    },
    menuDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.divider,
    },
    menuCancelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
  })

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('sessions.title')} showClose />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('sessions.noServerConfigured')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('sessions.noServerMessage')}
          </Text>
          <Button title={t('sessions.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('sessions.title')} showClose />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current session info at top */}
        <Section>
          <SettingRow
            icon="chatbubble-outline"
            label={formatSessionKey(currentSessionKey)}
            subtitle={t('sessions.currentSession')}
            onPress={() => handleEditSession(currentSessionKey)}
            showDivider={false}
          />
        </Section>

        <View style={styles.spacer} />

        {/* Actions group */}
        <Section title={t('sessions.actions')}>
          <TouchableOpacity style={styles.actionButton} onPress={handleNewSession}>
            <Ionicons
              name="add-circle"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>{t('sessions.newSession')}</Text>
          </TouchableOpacity>
        </Section>

        {/* Available sessions */}
        <Section title={t('sessions.availableSessions')} showDivider>
          {loading ? (
            <SettingRow
              icon="hourglass-outline"
              label={t('sessions.loadingSessions')}
              showDivider={false}
            />
          ) : sessions.length > 0 ? (
            sessions.map((session, index) => {
              const isActive = session.key === currentSessionKey
              return (
                <View key={session.key} style={styles.sessionRow}>
                  <View style={styles.sessionContent}>
                    <SettingRow
                      icon={isActive ? 'checkmark-circle' : 'radio-button-off-outline'}
                      iconColor={isActive ? theme.colors.primary : undefined}
                      label={formatSessionKey(session.key)}
                      subtitle={
                        session.messageCount !== undefined
                          ? t('sessions.messagesCount', { count: session.messageCount })
                          : undefined
                      }
                      value={isActive ? t('common.active') : undefined}
                      onPress={() => handleSelectSession(session.key)}
                      onLongPress={() => handleLongPressSession(session.key)}
                      showDivider={index < sessions.length - 1}
                    />
                  </View>
                </View>
              )
            })
          ) : (
            <SettingRow
              icon="albums-outline"
              label={t('sessions.noSessions')}
              subtitle={t('sessions.noSessionsMessage')}
              showDivider={false}
            />
          )}
        </Section>
      </ScrollView>

      {/* Long-press context menu */}
      <Modal
        visible={menuSessionKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuSessionKey(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuSessionKey(null)}
        >
          <View style={styles.menuContainer}>
            <GlassView style={styles.menuGlass}>
              <View style={styles.menuHeader}>
                <Text variant="heading3" numberOfLines={1}>
                  {menuSessionKey ? formatSessionKey(menuSessionKey) : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const key = menuSessionKey
                  setMenuSessionKey(null)
                  if (key) handleEditSession(key)
                }}
              >
                <Ionicons
                  name="pencil-outline"
                  size={20}
                  color={theme.colors.text.primary}
                  style={styles.menuItemIcon}
                />
                <Text style={styles.menuItemText}>{t('sessions.editSession')}</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (menuSessionKey) handleDeleteSession(menuSessionKey)
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.colors.status.error}
                  style={styles.menuItemIcon}
                />
                <Text style={[styles.menuItemText, styles.menuItemDestructive]}>
                  {t('sessions.deleteSession')}
                </Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuCancelItem}
                onPress={() => setMenuSessionKey(null)}
              >
                <Text style={styles.menuItemText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </GlassView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}
