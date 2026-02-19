import { Ionicons } from '@expo/vector-icons'
import { useAtom, useAtomValue } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'

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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  const { processNextAction, handleBridgeMessage, clear } = useCanvasActions()

  const handleClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  const handleClear = useCallback(() => {
    clear()
  }, [clear])

  // Send a command to the iframe via postMessage
  const sendCommand = useCallback((command: CanvasBridgeCommand) => {
    if (!iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.postMessage(command, '*')
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
      // 'present' is handled via content atom, not via iframe command
    }
  }, [actionQueue, visible, processNextAction, sendCommand])

  // Listen for postMessage from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as CanvasBridgeMessage | undefined
      if (data?.source === 'lumiere-canvas') {
        handleBridgeMessage(data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleBridgeMessage])

  // Inject bridge script into iframe once loaded
  const handleIframeLoad = useCallback(() => {
    const win = iframeRef.current?.contentWindow as
      | (Window & { eval?: (code: string) => unknown })
      | null
    if (!win) return
    try {
      win.eval?.(CANVAS_BRIDGE_SCRIPT)
    } catch {
      // Cross-origin iframes will reject eval — bridge script won't work for URL sources
      // in sandboxed iframes. The bridge is pre-injected via srcDoc for HTML sources.
    }
  }, [])

  if (!content) return null

  // For HTML source, inject the bridge script into the document
  const srcDocWithBridge =
    content.source === 'html' && content.html
      ? content.html.replace('</body>', `<script>${CANVAS_BRIDGE_SCRIPT}</script></body>`)
      : content.html || ''

  const isUrlSource = content.source === 'url' && content.url

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
              {isUrlSource && (
                <Ionicons
                  name="globe-outline"
                  size={12}
                  color={theme.colors.text.secondary}
                  style={{ marginLeft: theme.spacing.xs }}
                />
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
            {isUrlSource ? (
              <iframe
                ref={iframeRef}
                src={content.url}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleIframeLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 0,
                  backgroundColor: theme.colors.surface,
                }}
                title={content.title || t('canvas.title')}
              />
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={srcDocWithBridge}
                sandbox="allow-scripts allow-same-origin"
                onLoad={handleIframeLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 0,
                  backgroundColor: theme.colors.surface,
                }}
                title={content.title || t('canvas.title')}
              />
            )}
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
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    container: {
      width: '100%',
      maxWidth: 900,
      height: '85%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    content: {
      flex: 1,
    },
  })
