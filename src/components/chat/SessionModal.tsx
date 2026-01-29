import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Modal, ScrollView,StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
  onResetSession: () => void
  onSelectSession: (sessionKey: string) => void
  sessions: Session[]
  currentSessionKey: string
}

export function SessionModal({
  visible,
  onClose,
  onNewSession,
  onResetSession,
  onSelectSession,
  sessions,
  currentSessionKey,
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
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    actionIcon: {
      marginRight: theme.spacing.md,
    },
    actionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
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
      marginBottom: theme.spacing.sm,
    },
    activeSession: {
      backgroundColor: theme.colors.primary + '20',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    sessionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      flex: 1,
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
    // Extract readable part from session key
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString()
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
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>New Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  onResetSession()
                  onClose()
                }}
              >
                <Ionicons
                  name="refresh-outline"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>Reset Current Session</Text>
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
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionText}>
                            {formatSessionKey(session.key)}
                            {isActive && ' (Active)'}
                          </Text>
                          {session.messageCount !== undefined && (
                            <Text style={styles.sessionMeta}>{session.messageCount} messages</Text>
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
