import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getProviderIcon } from '../../config/providerOptions'
import type { ServerConfig } from '../../store'
import { useTheme } from '../../theme'
import { useFoldResponsiveValue } from '../../utils/device'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

interface SessionSidebarProps {
  onNewSession: () => void
  onResetSession: () => void
  onSelectSession: (sessionKey: string) => void
  sessions: Session[]
  currentSessionKey: string
  sessionAliases: Record<string, string>
  supportsServerSessions?: boolean
  servers: ServerConfig[]
  currentServerId: string
  onSwitchServer: (serverId: string) => void
  loadingSessions?: boolean
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  onNewSession,
  onResetSession,
  onSelectSession,
  sessions,
  currentSessionKey,
  sessionAliases,
  supportsServerSessions = false,
  servers,
  currentServerId,
  onSwitchServer,
  loadingSessions = false,
}) => {
  const { theme } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Responsive padding based on fold state
  const containerPadding = useFoldResponsiveValue(
    theme.spacing.sm, // folded
    theme.spacing.md, // unfolded
    theme.spacing.sm, // half-folded
  )

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
    serversSection: {
      flex: 1,
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
    serverSection: {
      marginBottom: theme.spacing.md,
    },
    serverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    activeServerHeader: {
      backgroundColor: theme.colors.primary + '10',
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    inactiveServerHeader: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    serverName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    sessionListIndent: {
      marginTop: theme.spacing.xs,
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
  })

  return (
    <View style={styles.container}>
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {supportsServerSessions ? 'Sessions' : 'Servers'}
          </Text>
        </View>

        {/* Actions Section */}
        {(
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
        )}

        {/* Servers & Sessions List */}
        <View style={styles.serversSection}>
          <Text style={styles.sectionTitle}>Servers</Text>
          <ScrollView style={styles.sessionListContainer} showsVerticalScrollIndicator={false}>
            {servers.length > 0 ? (
              servers.map((server) => {
                const isActiveServer = server.id === currentServerId
                return (
                  <View key={server.id} style={styles.serverSection}>
                    {/* Server Header */}
                    <Pressable
                      style={[
                        styles.serverHeader,
                        isActiveServer ? styles.activeServerHeader : styles.inactiveServerHeader,
                      ]}
                      onPress={() => {
                        if (!isActiveServer) {
                          onSwitchServer(server.id)
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${server.name}${isActiveServer ? ' (Active)' : ''}`}
                      accessibilityState={{ expanded: isActiveServer }}
                    >
                      {getProviderIcon(
                        server.providerType,
                        isActiveServer ? theme.colors.primary : theme.colors.text.secondary,
                      ) || (
                        <Ionicons
                          name={isActiveServer ? 'cloud' : 'cloud-outline'}
                          size={18}
                          color={
                            isActiveServer ? theme.colors.primary : theme.colors.text.secondary
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.serverName,
                          isActiveServer && { color: theme.colors.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {server.name}
                      </Text>
                      <Ionicons
                        name={isActiveServer ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={isActiveServer ? theme.colors.primary : theme.colors.text.tertiary}
                      />
                    </Pressable>

                    {/* Sessions (only for active server) */}
                    {isActiveServer && (
                      <View style={styles.sessionListIndent}>
                        {loadingSessions ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.primary}
                            style={{ paddingVertical: theme.spacing.lg }}
                          />
                        ) : sessions.length > 0 ? (
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
                                      {session.messageCount} message
                                      {session.messageCount !== 1 ? 's' : ''}
                                    </Text>
                                  )}
                                </View>
                                <Ionicons
                                  name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                                  size={20}
                                  color={
                                    isActive ? theme.colors.primary : theme.colors.text.tertiary
                                  }
                                />
                              </Pressable>
                            )
                          })
                        ) : (
                          <Text style={styles.emptyText}>No sessions available</Text>
                        )}
                      </View>
                    )}
                  </View>
                )
              })
            ) : (
              <Text style={styles.emptyText}>No servers configured</Text>
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
