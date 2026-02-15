import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'

import { canvasContentAtom, canvasVisibleAtom } from '../../store'
import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'

export function CanvasViewer() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [visible, setVisible] = useAtom(canvasVisibleAtom)
  const [content, setContent] = useAtom(canvasContentAtom)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const styles = useMemo(() => createStyles(theme), [theme])

  const handleClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  const handleClear = useCallback(() => {
    setContent(null)
    setVisible(false)
  }, [setContent, setVisible])

  if (!content) return null

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
            <iframe
              ref={iframeRef}
              srcDoc={content.html}
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 0,
                backgroundColor: '#ffffff',
              }}
              title={content.title || t('canvas.title')}
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
