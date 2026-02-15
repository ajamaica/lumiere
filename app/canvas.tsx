import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { ScreenHeader } from '../src/components/ui'
import { useMoltGateway } from '../src/services/molt/useMoltGateway'
import { useTheme } from '../src/theme'

export default function CanvasScreen() {
  const { theme } = useTheme()
  const { client } = useMoltGateway()
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Listen for canvas.present events
  useEffect(() => {
    if (!client) return

    const unsubscribe = client.addEventListener((frame) => {
      if (frame.event === 'canvas.present' && frame.payload) {
        const payload = frame.payload as { url?: string }
        if (payload.url) {
          setCanvasUrl(payload.url)
        }
      } else if (frame.event === 'canvas.hide') {
        setCanvasUrl(null)
      }
    })

    return unsubscribe
  }, [client])

  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
  }, [])

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false)
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    webviewContainer: {
      flex: 1,
    },
    webview: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    placeholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.md,
      textAlign: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Canvas" showBack />
      <View style={styles.webviewContainer}>
        {canvasUrl ? (
          <>
            <WebView
              source={{ uri: canvasUrl }}
              style={styles.webview}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
            />
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No canvas content to display.{'\n\n'}
              Waiting for canvas presentation...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
