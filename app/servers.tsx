import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'molt', label: 'Molt Gateway' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'echo', label: 'Echo Server' },
]

export default function ServersScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { serversList, currentServerId, removeServer, switchToServer } = useServers()

  const handleRemoveServer = (id: string) => {
    const server = serversList.find((s) => s.id === id)
    if (!server) return

    Alert.alert('Remove Server', `Are you sure you want to remove "${server.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeServer(id),
      },
    ])
  }

  const handleSwitchServer = (id: string) => {
    if (id === currentServerId) return
    switchToServer(id)
    router.back()
  }

  const providerLabel = (type: ProviderType) =>
    PROVIDER_OPTIONS.find((o) => o.value === type)?.label ?? type

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    serverCard: {
      marginBottom: theme.spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    activeCard: {
      borderColor: theme.colors.primary,
    },
    serverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    serverActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    iconButton: {
      padding: theme.spacing.xs,
    },
    providerBadge: {
      fontSize: 11,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Servers" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Servers">
          {serversList.map((server) => {
            const isActive = server.id === currentServerId

            return (
              <TouchableOpacity key={server.id} onPress={() => handleSwitchServer(server.id)}>
                <Card style={[styles.serverCard, isActive && styles.activeCard]}>
                  <View style={styles.serverHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading3">
                        {server.name}
                        {isActive && ' (Active)'}
                      </Text>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        {server.url}
                      </Text>
                      <Text style={styles.providerBadge}>
                        {providerLabel(server.providerType || 'molt')}
                        {server.model ? ` - ${server.model}` : ''}
                      </Text>
                    </View>
                    <View style={styles.serverActions}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({ pathname: '/edit-server', params: { id: server.id } })
                        }
                        style={styles.iconButton}
                      >
                        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveServer(server.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.status.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          })}

          {serversList.length === 0 && (
            <Text color="secondary" center>
              No servers configured
            </Text>
          )}
        </Section>

        <Button
          title="Add New Server"
          variant="secondary"
          onPress={() => router.push('/add-server')}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
