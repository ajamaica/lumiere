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

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

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
