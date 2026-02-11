import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import type { AgentInfo } from '../../services/providers'
import { useTheme } from '../../theme'
import { Text } from '../ui'

interface AgentPickerProps {
  visible: boolean
  onClose: () => void
  agents: Record<string, AgentInfo>
  currentAgentId: string
  onSelectAgent: (agentId: string) => void
  loading?: boolean
}

export function AgentPicker({
  visible,
  onClose,
  agents,
  currentAgentId,
  onSelectAgent,
  loading = false,
}: AgentPickerProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const agentEntries = Object.entries(agents)

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    menu: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxHeight: 400,
      overflow: 'hidden',
    },
    menuHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    menuItem: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    menuItemActive: {
      backgroundColor: theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    menuItemTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    menuItemMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    unavailableText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.error,
      marginTop: 2,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    emptyContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    loadingContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menu}>
          <View style={styles.menuHeader}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {t('agents.selectAgent')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                <Text color="secondary">{t('agents.loading')}</Text>
              </View>
            ) : agentEntries.length > 0 ? (
              agentEntries.map(([agentId, agentStatus], index) => {
                const isActive = agentId === currentAgentId
                return (
                  <React.Fragment key={agentId}>
                    {index > 0 && <View style={styles.separator} />}
                    <TouchableOpacity
                      style={[styles.menuItem, isActive && styles.menuItemActive]}
                      onPress={() => {
                        onSelectAgent(agentId)
                        onClose()
                      }}
                      disabled={!agentStatus.available}
                    >
                      <View style={styles.menuItemContent}>
                        <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                          {agentId}
                        </Text>
                        {agentStatus.available ? (
                          <Text style={styles.menuItemMeta}>{t('agents.available')}</Text>
                        ) : (
                          <Text style={styles.unavailableText}>
                            {agentStatus.error || t('agents.unavailable')}
                          </Text>
                        )}
                      </View>
                      {isActive && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                )
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text color="secondary">{t('agents.noAgents')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
