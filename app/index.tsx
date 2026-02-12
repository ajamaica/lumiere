import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { ChatScreen } from '../src/components/chat/ChatScreen'
import { ChatWithSidebar } from '../src/components/chat/ChatWithSidebar'
import { Button, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { ProviderConfig } from '../src/services/providers'
import { useTheme } from '../src/theme'
import { isAppClip } from '../src/utils/appClip'

/** Static Echo provider config used in App Clip mode. */
const APP_CLIP_ECHO_CONFIG: ProviderConfig = {
  type: 'echo',
  url: '',
  token: '',
  serverId: 'app-clip-echo',
}

export default function HomeScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const [config, setConfig] = useState<ProviderConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isAppClip)

  // In App Clip mode, use the Echo provider directly — no server lookup needed.
  const effectiveConfig = useMemo(() => (isAppClip ? APP_CLIP_ECHO_CONFIG : config), [config])

  useEffect(() => {
    if (isAppClip) return // Skip server lookup in App Clip mode
    const loadConfig = async () => {
      // Only show loading on initial load, not when switching servers
      if (!config) {
        setIsLoading(true)
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {t('home.connectionError')}
        </Text>
        <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
          {error}
        </Text>
        <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
      </View>
    )
  }

  // Show setup prompt if no server configured
  if (!effectiveConfig) {
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
          {t('home.noServerConfigured')}
        </Text>
        <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
          {t('home.noServerMessage')}
        </Text>
        <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
      </View>
    )
  }

  // App Clip: render ChatScreen directly without the sidebar
  if (isAppClip) {
    return <ChatScreen providerConfig={effectiveConfig} />
  }

  return <ChatWithSidebar providerConfig={effectiveConfig} />
}
