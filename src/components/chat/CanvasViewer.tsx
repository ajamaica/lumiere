import { Ionicons } from '@expo/vector-icons'
import { useAtom, useAtomValue } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'

import {
  CANVAS_BRIDGE_SCRIPT,
  type CanvasBridgeCommand,
  type CanvasBridgeMessage,
  useCanvasActions,
} from '../../hooks/useCanvasActions'
import { canvasActionQueueAtom, canvasContentAtom, canvasVisibleAtom } from '../../store'
import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'

export function CanvasViewer() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [visible, setVisible] = useAtom(canvasVisibleAtom)
  const [content] = useAtom(canvasContentAtom)
  const actionQueue = useAtomValue(canvasActionQueueAtom)
  const webViewRef = useRef<WebView>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  const { processNextAction, handleBridgeMessage, clear } = useCanvasActions()

  const handleClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  const handleClear = useCallback(() => {
    clear()
  }, [clear])

  // Send a command to the WebView via injected JavaScript
  const sendCommand = useCallback((command: CanvasBridgeCommand) => {
    if (!webViewRef.current) return
    const json = JSON.stringify(command)
    webViewRef.current.injectJavaScript(`window.postMessage(${json}, '*'); true;`)
  }, [])

  // Process action queue when items are added
  useEffect(() => {
    if (actionQueue.length === 0 || !visible) return

    const action = processNextAction()
    if (!action) return

    switch (action.type) {
      case 'eval':
        if (action.script) {
          sendCommand({ type: 'eval', actionId: action.id, script: action.script })
        }
        break
      case 'snapshot':
        sendCommand({ type: 'snapshot', actionId: action.id })
        break
      case 'navigate':
        if (action.url) {
          sendCommand({ type: 'navigate', actionId: action.id, url: action.url })
        }
        break
      // 'present' is handled via content atom, not via WebView command
    }
  }, [actionQueue, visible, processNextAction, sendCommand])

  // Handle messages from the WebView bridge
  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data: CanvasBridgeMessage = JSON.parse(event.nativeEvent.data)
        if (data.source === 'lumiere-canvas') {
          handleBridgeMessage(data)
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [handleBridgeMessage],
  )

  if (!content) return null

  const webViewSource =
    content.source === 'url' && content.url ? { uri: content.url } : { html: content.html || '' }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="easel-outline" size={20} color={theme.colors.primary} />
              <Text variant="body" style={styles.title} numberOfLines={1}>
                {content.title || t('canvas.title')}
              </Text>
              {content.source === 'url' && (
                <View style={styles.urlBadge}>
                  <Ionicons name="globe-outline" size={12} color={theme.colors.text.secondary} />
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleClear}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('canvas.clear')}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('canvas.close')}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.content}>
            <WebView
              ref={webViewRef}
              source={webViewSource}
              style={styles.webView}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              scrollEnabled={true}
              injectedJavaScript={CANVAS_BRIDGE_SCRIPT}
              onMessage={handleWebViewMessage}
              accessibilityLabel={content.title || t('canvas.title')}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      height: '80%',
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    title: {
      fontWeight: '600',
      color: theme.colors.text.primary,
      flex: 1,
    },
    urlBadge: {
      marginLeft: theme.spacing.xs,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    content: {
      flex: 1,
    },
    webView: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  })
