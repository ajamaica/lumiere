import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useAtom } from 'jotai'
import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { currentSessionKeyAtom, TriggerConfig, triggersAtom } from '../src/store'
import { useTheme } from '../src/theme'

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return slug
}

const CARD_GAP = 12
const SCREEN_PADDING = 16

// Deterministic icon based on trigger id
const TRIGGER_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'flash',
  'rocket',
  'paper-plane',
  'chatbubble',
  'bulb',
  'terminal',
  'code-slash',
  'send',
  'sparkles',
  'planet',
  'radio',
  'navigate',
]

function getTriggerIcon(id: string): keyof typeof Ionicons.glyphMap {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return TRIGGER_ICONS[Math.abs(hash) % TRIGGER_ICONS.length]
}

export default function TriggersScreen() {
  const { theme } = useTheme()
  const { currentServer, currentServerId } = useServers()
  const [triggers, setTriggers] = useAtom(triggersAtom)
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)

  const [isCreating, setIsCreating] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  const triggersList = useMemo(
    () => Object.values(triggers).sort((a, b) => b.createdAt - a.createdAt),
    [triggers],
  )

  const screenWidth = Dimensions.get('window').width
  const cardWidth = (screenWidth - SCREEN_PADDING * 2 - CARD_GAP) / 2

  const handleCreate = useCallback(() => {
    if (!newMessage.trim()) {
      Alert.alert('Required', 'Please enter a message for the trigger.')
      return
    }
    if (!currentServerId || !currentServer) {
      Alert.alert('No Server', 'Please select a server first in Settings.')
      return
    }

    const slug = generateSlug()
    const trigger: TriggerConfig = {
      id: slug,
      message: newMessage.trim(),
      sessionKey: currentSessionKey,
      serverId: currentServerId,
      createdAt: Date.now(),
    }

    setTriggers({ ...triggers, [slug]: trigger })
    setNewMessage('')
    setIsCreating(false)

    const deepLink = `lumiere://trigger/autotrigger/${slug}`
    Alert.alert('Trigger Created', `Your deep link:\n\n${deepLink}`, [
      {
        text: 'Copy Link',
        onPress: () => Clipboard.setStringAsync(deepLink),
      },
      { text: 'OK' },
    ])
  }, [newMessage, currentServerId, currentServer, currentSessionKey, triggers, setTriggers])

  const handleDelete = useCallback(
    (slug: string) => {
      Alert.alert('Delete Trigger', 'Are you sure you want to delete this trigger?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = { ...triggers }
            delete updated[slug]
            setTriggers(updated)
          },
        },
      ])
    },
    [triggers, setTriggers],
  )

  const handleCopyLink = useCallback((slug: string) => {
    const deepLink = `lumiere://trigger/autotrigger/${slug}`
    Clipboard.setStringAsync(deepLink)
    Alert.alert('Copied', 'Deep link copied to clipboard.')
  }, [])

  const formatSessionKey = (key: string) => {
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollContent: {
          padding: SCREEN_PADDING,
          paddingBottom: theme.spacing.xxxl,
        },
        // Grid layout
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: CARD_GAP,
        },
        // Trigger card — Apple Shortcuts style tile
        card: {
          width: cardWidth,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          overflow: 'hidden',
        },
        cardIconArea: {
          height: 72,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cardIconCircle: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.25)',
        },
        cardBody: {
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        },
        cardMessage: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        },
        cardMeta: {
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.sm,
        },
        cardActions: {
          flexDirection: 'row',
          gap: theme.spacing.xs,
        },
        cardActionBtn: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: theme.colors.surfaceVariant,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Empty state
        emptyState: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: theme.spacing.xxxl * 2,
          paddingHorizontal: theme.spacing.xl,
        },
        emptyIconCircle: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: theme.colors.primary + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
        },
        // Create form card
        createCard: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
        },
        createHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          gap: theme.spacing.sm,
        },
        createIconCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.primary + '18',
          alignItems: 'center',
          justifyContent: 'center',
        },
        createMeta: {
          marginBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        formButtons: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
        },
        // Section header
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        },
        sectionTitle: {
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
        },
        countBadge: {
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.secondary,
        },
      }),
    [theme, cardWidth],
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Triggers"
        showBack
        right={
          !isCreating ? (
            <TouchableOpacity
              onPress={() => setIsCreating(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Create new trigger"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Create trigger form */}
        {isCreating && (
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <View style={styles.createIconCircle}>
                <Ionicons name="flash" size={18} color={theme.colors.primary} />
              </View>
              <Text variant="heading3" style={{ color: theme.colors.text.primary, flex: 1 }}>
                New Trigger
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCreating(false)
                  setNewMessage('')
                }}
                accessibilityLabel="Close create form"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Message"
              placeholder="Message to auto-send..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={8}
              style={{ minHeight: 160, textAlignVertical: 'top' }}
            />

            <View style={styles.createMeta}>
              <Ionicons name="server-outline" size={14} color={theme.colors.text.secondary} />
              <Text variant="caption" color="secondary">
                {currentServer?.name || 'No server'}
              </Text>
              <Text variant="caption" color="tertiary">
                {'  '}|{'  '}
              </Text>
              <Ionicons name="git-branch-outline" size={14} color={theme.colors.text.secondary} />
              <Text variant="caption" color="secondary">
                {formatSessionKey(currentSessionKey)}
              </Text>
            </View>

            <View style={styles.formButtons}>
              <Button title="Create Trigger" onPress={handleCreate} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Triggers grid */}
        {triggersList.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Shortcuts</Text>
              <Text style={styles.countBadge}>{triggersList.length}</Text>
            </View>
            <View style={styles.grid}>
              {triggersList.map((trigger) => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  styles={styles}
                  theme={theme}
                  onCopy={handleCopyLink}
                  onDelete={handleDelete}
                  formatSessionKey={formatSessionKey}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="flash-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text
              variant="heading3"
              center
              style={{ marginBottom: theme.spacing.sm, color: theme.colors.text.primary }}
            >
              No Triggers Yet
            </Text>
            <Text variant="body" color="secondary" center>
              Create triggers to auto-send messages via deep links. Tap{' '}
              <Text variant="body" style={{ color: theme.colors.primary }}>
                +
              </Text>{' '}
              to get started.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/** Individual trigger tile card, Apple Shortcuts style */
function TriggerCard({
  trigger,
  styles,
  theme,
  onCopy,
  onDelete,
  formatSessionKey,
}: {
  trigger: TriggerConfig
  styles: ReturnType<typeof StyleSheet.create>
  theme: ReturnType<typeof useTheme>['theme']
  onCopy: (id: string) => void
  onDelete: (id: string) => void
  formatSessionKey: (key: string) => string
}) {
  const icon = getTriggerIcon(trigger.id)

  return (
    <View style={styles.card}>
      {/* Colored icon header area */}
      <View style={[styles.cardIconArea, { backgroundColor: theme.colors.primary + '18' }]}>
        <View style={styles.cardIconCircle}>
          <Ionicons name={icon} size={22} color={theme.colors.primary} />
        </View>
      </View>

      {/* Card content */}
      <View style={styles.cardBody}>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {trigger.message}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatSessionKey(trigger.sessionKey)} &middot;{' '}
          {new Date(trigger.createdAt).toLocaleDateString()}
        </Text>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => onCopy(trigger.id)}
            accessibilityLabel="Copy deep link"
            accessibilityRole="button"
          >
            <Ionicons name="link-outline" size={15} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => onDelete(trigger.id)}
            accessibilityLabel="Delete trigger"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={15} color={theme.colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
