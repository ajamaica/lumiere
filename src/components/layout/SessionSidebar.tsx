import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ServerConfig } from '../../store'
import { useTheme } from '../../theme'
import { useFoldResponsiveValue } from '../../utils/device'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

interface ServerWithSessions {
  server: ServerConfig
  sessions: Session[]
  connected: boolean
}

interface SessionSidebarProps {
  onNewSession: () => void
  onResetSession: () => void
  onSelectSession: (sessionKey: string) => void
  onSwitchServer?: (serverId: string) => void
  sessions: Session[]
  currentSessionKey: string
  sessionAliases: Record<string, string>
  supportsServerSessions?: boolean
  // New props for multi-server display
  servers?: ServerWithSessions[]
  currentServerId?: string
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  onNewSession,
  onResetSession,
  onSelectSession,
  onSwitchServer,
  sessions,
  currentSessionKey,
  sessionAliases,
  supportsServerSessions = true,
  servers,
  currentServerId,
}) => {
  const { theme } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Track which servers are expanded (default: all expanded)
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set(servers?.map((s) => s.server.id) || []),
  )

  // Responsive padding based on fold state
  const containerPadding = useFoldResponsiveValue(
    theme.spacing.sm, // folded
    theme.spacing.md, // unfolded
    theme.spacing.sm, // half-folded
  )

  // Toggle server expansion
  const toggleServerExpansion = (serverId: string) => {
    setExpandedServers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(serverId)) {
        newSet.delete(serverId)
      } else {
        newSet.add(serverId)
      }
      return newSet
    })
  }

  // Handle server selection
  const handleServerSelect = (serverId: string) => {
    if (onSwitchServer) {
      onSwitchServer(serverId)
    }
  }

  const formatSessionKey = (key: string) => {
    // Check if there's an alias
    if (sessionAliases[key]) {
      return sessionAliases[key]
    }
    // Extract readable part from session key
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const handleEditSession = () => {
    router.push({
      pathname: '/edit-session',
      params: { key: currentSessionKey },
    })
  }

  const handleOpenSettings = () => {
    router.push('/settings')
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: containerPadding,
      paddingTop: insets.top + containerPadding,
    },
    contentContainer: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
      paddingBottom: insets.bottom,
      marginTop: theme.spacing.md,
    },
    footerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    footerIcon: {
      marginRight: theme.spacing.sm,
    },
    footerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
    sessionListContainer: {
      flex: 1,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xs,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeSession: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    sessionTextContainer: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    sessionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sessionMeta: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      padding: theme.spacing.lg,
      fontStyle: 'italic',
    },
    editButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
    serverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeServerHeader: {
      backgroundColor: theme.colors.primary + '10',
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    serverHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    serverIcon: {
      marginRight: theme.spacing.sm,
    },
    serverTextContainer: {
      flex: 1,
    },
    serverName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    serverUrl: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    serverChevron: {
      marginLeft: theme.spacing.sm,
    },
    serverSessionsContainer: {
      marginLeft: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    serverSessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeServerSession: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    serverBadge: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  })

  return (
    <View style={styles.container}>
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Sessions
          </Text>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNewSession}
            accessibilityRole="button"
            accessibilityLabel="New Session"
          >
            <Ionicons
              name="add-circle"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>New Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onResetSession}
            accessibilityRole="button"
            accessibilityLabel="Reset Current"
          >
            <Ionicons
              name="refresh"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Reset Current</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEditSession}
            accessibilityRole="button"
            accessibilityLabel="Edit Current"
          >
            <Ionicons
              name="create"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Edit Current</Text>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        <View style={styles.section}>
          {supportsServerSessions && (
            <Text style={styles.sectionTitle}>
              {servers && servers.length > 0 ? 'Servers & Sessions' : 'All Sessions'}
            </Text>
          )}
          <ScrollView style={styles.sessionListContainer} showsVerticalScrollIndicator={false}>
            {servers && servers.length > 0 ? (
              // Multi-server display for tablet/foldable
              <>
                {servers.map((serverData) => {
                  const isActiveServer = serverData.server.id === currentServerId
                  const isExpanded = expandedServers.has(serverData.server.id)
                  const serverSessions = serverData.sessions || []

                  return (
                    <View key={serverData.server.id}>
                      {/* Server Header */}
                      <Pressable
                        style={[styles.serverHeader, isActiveServer && styles.activeServerHeader]}
                        onPress={() => handleServerSelect(serverData.server.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Server: ${serverData.server.name}`}
                        accessibilityState={{ selected: isActiveServer }}
                      >
                        <View style={styles.serverHeaderLeft}>
                          <Ionicons
                            name="server"
                            size={20}
                            color={
                              isActiveServer ? theme.colors.primary : theme.colors.text.secondary
                            }
                            style={styles.serverIcon}
                          />
                          <View style={styles.serverTextContainer}>
                            <Text style={styles.serverName} numberOfLines={1}>
                              {serverData.server.name}
                            </Text>
                            <Text style={styles.serverBadge} numberOfLines={1}>
                              {serverData.server.providerType} • {serverSessions.length} session
                              {serverSessions.length !== 1 ? 's' : ''}
                              {!serverData.connected && ' • Offline'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation()
                            toggleServerExpansion(serverData.server.id)
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={isExpanded ? 'Collapse' : 'Expand'}
                          style={styles.serverChevron}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={20}
                            color={theme.colors.text.tertiary}
                          />
                        </TouchableOpacity>
                      </Pressable>

                      {/* Server Sessions (when expanded) */}
                      {isExpanded && (
                        <View style={styles.serverSessionsContainer}>
                          {serverSessions.length > 0 ? (
                            serverSessions.map((session) => {
                              const isActive = session.key === currentSessionKey && isActiveServer
                              return (
                                <Pressable
                                  key={session.key}
                                  style={[
                                    styles.serverSessionItem,
                                    isActive && styles.activeServerSession,
                                  ]}
                                  onPress={() => {
                                    handleServerSelect(serverData.server.id)
                                    onSelectSession(session.key)
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${formatSessionKey(session.key)}${session.messageCount !== undefined ? `, ${session.messageCount} message${session.messageCount !== 1 ? 's' : ''}` : ''}`}
                                  accessibilityState={{ selected: isActive }}
                                >
                                  <View style={styles.sessionTextContainer}>
                                    <Text style={styles.sessionText} numberOfLines={1}>
                                      {formatSessionKey(session.key)}
                                    </Text>
                                    {session.messageCount !== undefined && (
                                      <Text style={styles.sessionMeta}>
                                        {session.messageCount} message
                                        {session.messageCount !== 1 ? 's' : ''}
                                      </Text>
                                    )}
                                  </View>
                                  <Ionicons
                                    name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                                    size={18}
                                    color={
                                      isActive ? theme.colors.primary : theme.colors.text.tertiary
                                    }
                                  />
                                </Pressable>
                              )
                            })
                          ) : (
                            <Text style={styles.emptyText}>No sessions</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </>
            ) : (
              // Single server display (fallback)
              <>
                {sessions.length > 0 ? (
                  sessions.map((session) => {
                    const isActive = session.key === currentSessionKey
                    return (
                      <Pressable
                        key={session.key}
                        style={[styles.sessionItem, isActive && styles.activeSession]}
                        onPress={() => onSelectSession(session.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${formatSessionKey(session.key)}${session.messageCount !== undefined ? `, ${session.messageCount} message${session.messageCount !== 1 ? 's' : ''}` : ''}`}
                        accessibilityState={{ selected: isActive }}
                      >
                        <View style={styles.sessionTextContainer}>
                          <Text style={styles.sessionText} numberOfLines={1}>
                            {formatSessionKey(session.key)}
                          </Text>
                          {session.messageCount !== undefined && (
                            <Text style={styles.sessionMeta}>
                              {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                        <Ionicons
                          name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                          size={20}
                          color={isActive ? theme.colors.primary : theme.colors.text.tertiary}
                        />
                      </Pressable>
                    )
                  })
                ) : (
                  <Text style={styles.emptyText}>No sessions available</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Footer with Settings */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={handleOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={theme.colors.text.secondary}
            style={styles.footerIcon}
          />
          <Text style={styles.footerText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
