import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { ChatScreen } from '../src/components/chat'
import { Button, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { ProviderConfig } from '../src/services/providers'
import { useTheme } from '../src/theme'

export default function HomeScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { getProviderConfig, currentServerId } = useServers()
  const [config, setConfig] = useState<ProviderConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const providerConfig = await getProviderConfig()
        setConfig(providerConfig)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load server configuration'
        setError(message)
        setConfig(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  // Show loading state briefly to prevent flash
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
    )
  }

  // Show error state if configuration failed to load
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
          Connection Error
        </Text>
        <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
          {error}
        </Text>
        <Button title="Go to Settings" onPress={() => router.push('/settings')} />
      </View>
    )
  }

  // Show setup prompt if no server configured
  if (!config) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
          No Server Configured
        </Text>
        <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
          Please add a server in Settings to get started.
        </Text>
        <Button title="Go to Settings" onPress={() => router.push('/settings')} />
      </View>
    )
  }

  return <ChatScreen key={currentServerId} providerConfig={config} />
}
