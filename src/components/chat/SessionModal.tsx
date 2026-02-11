import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../../theme'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

interface SessionModalProps {
  visible: boolean
  onClose: () => void
  onNewSession: () => void
  onSelectSession: (sessionKey: string) => void
  sessions: Session[]
  currentSessionKey: string
  sessionAliases?: Record<string, string>
}

export function SessionModal({
  visible,
  onClose,
  onNewSession,
  onSelectSession,
  sessions,
  currentSessionKey,
  sessionAliases = {},
}: SessionModalProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      width: '85%',
      maxHeight: '70%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    closeButton: {
      padding: theme.spacing.xs,
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
    sessionList: {
      maxHeight: 200,
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
    },
  })

  const formatSessionKey = (key: string) => {
    // Check if there's an alias
    if (sessionAliases[key]) {
      return sessionAliases[key]
    }
    // Extract readable part from session key
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Sessions</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  onNewSession()
                  onClose()
                }}
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
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Sessions</Text>
              <ScrollView style={styles.sessionList}>
                {sessions.length > 0 ? (
                  sessions.map((session) => {
                    const isActive = session.key === currentSessionKey
                    return (
                      <TouchableOpacity
                        key={session.key}
                        style={[styles.sessionItem, isActive && styles.activeSession]}
                        onPress={() => {
                          onSelectSession(session.key)
                          onClose()
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
                          size={20}
                          color={isActive ? theme.colors.primary : theme.colors.text.tertiary}
                        />
                      </TouchableOpacity>
                    )
                  })
                ) : (
                  <Text style={styles.emptyText}>No sessions available</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
