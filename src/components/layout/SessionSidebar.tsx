import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable,ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  onNewSession,
  onResetSession,
  onSelectSession,
  sessions,
  currentSessionKey,
  sessionAliases,
}) => {
  const { theme } = useTheme()
  const router = useRouter()

  // Responsive padding based on fold state
  const containerPadding = useFoldResponsiveValue(
    theme.spacing.sm,  // folded
    theme.spacing.md,  // unfolded
    theme.spacing.sm   // half-folded
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: containerPadding,
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
  })

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sessions</Text>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionButton} onPress={onNewSession}>
          <Ionicons
            name="add-circle"
            size={22}
            color={theme.colors.primary}
            style={styles.actionIcon}
          />
          <Text style={styles.actionText}>New Session</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onResetSession}>
          <Ionicons
            name="refresh"
            size={22}
            color={theme.colors.primary}
            style={styles.actionIcon}
          />
          <Text style={styles.actionText}>Reset Current</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEditSession}>
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
        <Text style={styles.sectionTitle}>All Sessions</Text>
        <ScrollView style={styles.sessionListContainer} showsVerticalScrollIndicator={false}>
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const isActive = session.key === currentSessionKey
              return (
                <Pressable
                  key={session.key}
                  style={[styles.sessionItem, isActive && styles.activeSession]}
                  onPress={() => onSelectSession(session.key)}
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
        </ScrollView>
      </View>
    </View>
  )
}
