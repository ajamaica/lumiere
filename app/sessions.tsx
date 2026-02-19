import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  ModalOverlay,
  ScreenHeader,
  Section,
  Text,
} from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import {
  buildCacheKey,
  deleteSessionData,
  ProviderConfig,
  readSessionIndex,
  SessionIndexEntry,
  writeSessionIndex,
} from '../src/services/providers'
import {
  createSessionKey,
  currentSessionKeyAtom,
  isMissionSession,
  sessionAliasesAtom,
} from '../src/store'
import { jotaiStorage } from '../src/store/storage'
import { useTheme } from '../src/theme'
import { useContentContainerStyle, useDeviceType } from '../src/utils/device'
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
  const contentContainerStyle = useContentContainerStyle()
  const deviceType = useDeviceType()
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

  const { connected, connect, disconnect, listSessions, deleteSession, resetSession } =
    useMoltGateway({
      url: config?.url || '',
      token: config?.token || '',
    })

  useEffect(() => {
    if (config && isMoltProvider) {
      connect()
    } else if (config) {
      setLoading(false)
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isMoltProvider])

  const loadMoltSessions = useCallback(async () => {
    if (!connected || !isMoltProvider) return

    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions.filter((s) => !isMissionSession(s.key)))
      }
    } catch (err) {
      sessionsLogger.logError('Failed to fetch sessions', err)
    } finally {
      setLoading(false)
    }
  }, [connected, listSessions, isMoltProvider])

  const loadLocalSessions = useCallback(async () => {
    if (!config || isMoltProvider) return

    try {
      const entries: SessionIndexEntry[] = await readSessionIndex(config.serverId)
      const localSessions: Session[] = entries
        .filter((entry) => !isMissionSession(entry.key))
        .map((entry) => ({
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
    const newSessionKey = createSessionKey('main', `${Date.now()}`)
    setCurrentSessionKey(newSessionKey)
    router.back()
  }

  const handleSelectSession = (sessionKey: string) => {
    if (isMissionSession(sessionKey)) return
    setCurrentSessionKey(sessionKey)
    router.back()
  }

  const formatSessionKey = (key: string) => {
    if (sessionAliases[key]) return sessionAliases[key]
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('sessions.justNow')
    if (minutes < 60) return t('sessions.minutesAgo', { count: minutes })
    if (hours < 24) return t('sessions.hoursAgo', { count: hours })
    return t('sessions.daysAgo', { count: days })
  }

  const handleEditSession = (sessionKey: string) => {
    router.push({ pathname: '/edit-session', params: { key: sessionKey } })
  }

  const handleLongPressSession = (sessionKey: string) => {
    setMenuSessionKey(sessionKey)
  }

  const handleResetSession = () => {
    Alert.alert(t('sessions.resetConfirmTitle'), t('sessions.resetConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sessions.reset'),
        style: 'destructive',
        onPress: async () => {
          // Reset the server-side session if connected to a Molt provider
          if (isMoltProvider && connected) {
            try {
              await resetSession(currentSessionKey)
            } catch (err) {
              sessionsLogger.logError('Failed to reset remote session', err)
            }
          }

          // Clear only the cached messages, keep the session in the index
          const cacheKey = buildCacheKey(config?.serverId, currentSessionKey)
          await jotaiStorage.removeItem(cacheKey)

          // Update the session index entry to reflect 0 messages
          const entries = await readSessionIndex(config?.serverId)
          const updated = entries.map((e) =>
            e.key === currentSessionKey ? { ...e, messageCount: 0, lastActivity: Date.now() } : e,
          )
          await writeSessionIndex(config?.serverId, updated)

          // Update local state
          setSessions((prev) =>
            prev.map((s) =>
              s.key === currentSessionKey ? { ...s, messageCount: 0, lastActivity: Date.now() } : s,
            ),
          )
        },
      },
    ])
  }

  const handleDeleteSession = (sessionKey: string) => {
    setMenuSessionKey(null)
    Alert.alert(t('sessions.deleteConfirmTitle'), t('sessions.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
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
            const newKey = createSessionKey('main', `${Date.now()}`)
            setCurrentSessionKey(newKey)
          }
        },
      },
    ])
  }

  const currentSessionData = sessions.find((s) => s.key === currentSessionKey)
  const otherSessions = sessions.filter((s) => s.key !== currentSessionKey)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    spacer: {
      height: theme.spacing.xl,
    },

    // Current session row
    currentSessionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing.md,
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    currentSessionTextGroup: {
      flex: 1,
    },
    currentSessionNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    currentSessionActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Session list items
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    sessionItemIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionItemContent: {
      flex: 1,
    },
    sessionItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: 2,
    },

    // Bottom button
    bottomButtonContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
      backgroundColor: theme.colors.background,
    },

    // Context menu
    menuGlass: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
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
        <EmptyState
          icon="server-outline"
          title={t('sessions.noServerConfigured')}
          description={t('sessions.noServerMessage')}
          action={{
            title: t('sessions.goToSettings'),
            onPress: () => router.push('/settings'),
          }}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('sessions.title')} showClose />
      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        {/* Current session - compact single row: name + badge + edit + reset */}
        <Section title={t('sessions.currentSession')}>
          <View style={styles.currentSessionCard}>
            <View style={styles.currentSessionTextGroup}>
              <View style={styles.currentSessionNameRow}>
                <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                  {formatSessionKey(currentSessionKey)}
                </Text>
                <Badge label={t('common.active')} variant="success" />
              </View>
              {currentSessionData?.messageCount !== undefined && (
                <Text variant="caption" style={{ marginTop: 2 }}>
                  {t('sessions.messagesCount', { count: currentSessionData.messageCount })}
                  {currentSessionData.lastActivity
                    ? ` · ${formatRelativeTime(currentSessionData.lastActivity)}`
                    : ''}
                </Text>
              )}
            </View>
            <View style={styles.currentSessionActions}>
              <IconButton
                icon="pencil-outline"
                size="sm"
                onPress={() => handleEditSession(currentSessionKey)}
                accessibilityLabel={t('sessions.editSession')}
              />
              <IconButton
                icon="refresh-outline"
                size="sm"
                color={theme.colors.status.error}
                onPress={handleResetSession}
                accessibilityLabel={t('sessions.resetSession')}
              />
            </View>
          </View>
        </Section>

        <View style={styles.spacer} />

        {/* Other sessions */}
        <Section title={t('sessions.availableSessions')}>
          {loading ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
                <Text color="secondary">{t('sessions.loadingSessions')}</Text>
              </View>
            </Card>
          ) : otherSessions.length > 0 ? (
            <Card padded={false}>
              {otherSessions.map((session, index) => (
                <React.Fragment key={session.key}>
                  <TouchableOpacity
                    style={styles.sessionItem}
                    onPress={() => handleSelectSession(session.key)}
                    onLongPress={() => handleLongPressSession(session.key)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={formatSessionKey(session.key)}
                  >
                    <View style={styles.sessionItemIconContainer}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color={theme.colors.text.secondary}
                      />
                    </View>
                    <View style={styles.sessionItemContent}>
                      <Text variant="bodySmall" semibold numberOfLines={1}>
                        {formatSessionKey(session.key)}
                      </Text>
                      <View style={styles.sessionItemMeta}>
                        {session.messageCount !== undefined && (
                          <Text variant="caption">
                            {t('sessions.messagesCount', { count: session.messageCount })}
                          </Text>
                        )}
                        {session.lastActivity && (
                          <>
                            {session.messageCount !== undefined && (
                              <Text variant="caption" color="tertiary">
                                ·
                              </Text>
                            )}
                            <Text variant="caption">
                              {formatRelativeTime(session.lastActivity)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>
                  {index < otherSessions.length - 1 && (
                    <Divider style={{ marginHorizontal: theme.spacing.md }} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title={t('sessions.noSessions')}
              description={t('sessions.noSessionsMessage')}
            />
          )}
        </Section>
      </ScrollView>

      {/* New Session button stuck at the bottom */}
      <View style={styles.bottomButtonContainer}>
        <Button
          title={t('sessions.newSession')}
          onPress={handleNewSession}
          icon={<Ionicons name="add" size={20} color={theme.colors.text.inverse} />}
        />
      </View>

      {/* Long-press context menu */}
      <ModalOverlay
        visible={menuSessionKey !== null}
        onClose={() => setMenuSessionKey(null)}
        width={deviceType === 'phone' ? '75%' : '50%'}
      >
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
              if (key) handleSelectSession(key)
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.primary}
              style={styles.menuItemIcon}
            />
            <Text style={[styles.menuItemText, { color: theme.colors.primary }]}>
              {t('sessions.switchToSession')}
            </Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

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

          <TouchableOpacity style={styles.menuCancelItem} onPress={() => setMenuSessionKey(null)}>
            <Text style={styles.menuItemText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </GlassView>
      </ModalOverlay>
    </SafeAreaView>
  )
}
