import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useAtom } from 'jotai'
import React, { useCallback, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActionRow, Button, ScreenHeader, Section, Text, TextInput } from '../src/components/ui'
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
          padding: theme.spacing.lg,
        },
        createForm: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
        },
        formButtons: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
        },
        triggerItem: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
        },
        triggerHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xs,
        },
        triggerSlug: {
          fontFamily: 'monospace',
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.primary,
        },
        triggerActions: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
        },
        triggerMessage: {
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        },
        triggerMeta: {
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.tertiary,
        },
        infoBox: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
        },
      }),
    [theme],
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Triggers" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="About">
          <View style={styles.infoBox}>
            <Text variant="caption" color="secondary">
              Triggers let you create deep links that automatically send a message when opened.
              Format: lumiere://trigger/autotrigger/{'<slug>'}
            </Text>
          </View>
        </Section>

        <Section title="Actions">
          {isCreating ? (
            <View style={styles.createForm}>
              <TextInput
                label="Message"
                placeholder="Message to auto-send..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Server: {currentServer?.name || 'None'} | Session:{' '}
                {formatSessionKey(currentSessionKey)}
              </Text>
              <View style={styles.formButtons}>
                <Button title="Create Trigger" onPress={handleCreate} />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setIsCreating(false)
                    setNewMessage('')
                  }}
                />
              </View>
            </View>
          ) : (
            <ActionRow
              icon="flash-outline"
              label="New Trigger"
              onPress={() => setIsCreating(true)}
            />
          )}
        </Section>

        <Section title={`Triggers (${triggersList.length})`}>
          {triggersList.length === 0 ? (
            <Text color="secondary" center>
              No triggers yet. Create one above.
            </Text>
          ) : (
            triggersList.map((trigger) => (
              <View key={trigger.id} style={styles.triggerItem}>
                <View style={styles.triggerHeader}>
                  <Text style={styles.triggerSlug}>{trigger.id}</Text>
                  <View style={styles.triggerActions}>
                    <TouchableOpacity onPress={() => handleCopyLink(trigger.id)}>
                      <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(trigger.id)}>
                      <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.triggerMessage}>{trigger.message}</Text>
                <Text style={styles.triggerMeta}>
                  Session: {formatSessionKey(trigger.sessionKey)} | Created:{' '}
                  {new Date(trigger.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
