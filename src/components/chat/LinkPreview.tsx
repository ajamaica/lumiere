import * as WebBrowser from 'expo-web-browser'
import React, { useCallback, useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { Theme, useTheme } from '../../theme'
import { webStyle } from '../../utils/platform'
import { UrlMetadata } from '../../utils/urlMetadata'

interface LinkPreviewProps {
  metadata: UrlMetadata
}

export function LinkPreview({ metadata }: LinkPreviewProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [imageError, setImageError] = useState(false)
  const [faviconError, setFaviconError] = useState(false)

  const handlePress = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync(metadata.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: theme.colors.primary,
      })
    } catch {
      // Silently fail
    }
  }, [metadata.url, theme.colors.primary])

  const showImage = metadata.image && !imageError
  const showFavicon = metadata.favicon && !faviconError && !showImage

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={`Link preview: ${metadata.title ?? metadata.hostname}`}
    >
      {showImage && (
        <Image
          source={{ uri: metadata.image! }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => setImageError(true)}
          accessibilityLabel="Link thumbnail"
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          {showFavicon && (
            <Image
              source={{ uri: metadata.favicon! }}
              style={styles.favicon}
              resizeMode="contain"
              onError={() => setFaviconError(true)}
            />
          )}
          <Text style={styles.hostname} numberOfLines={1}>
            {metadata.hostname}
          </Text>
        </View>
        {metadata.title && (
          <Text style={styles.title} numberOfLines={2}>
            {metadata.title}
          </Text>
        )}
        {metadata.description && (
          <Text style={styles.description} numberOfLines={2}>
            {metadata.description}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
      ...webStyle({ cursor: 'pointer' as const }),
    },
    pressed: {
      opacity: 0.7,
    },
    thumbnail: {
      width: 80,
      height: 80,
    },
    content: {
      flex: 1,
      padding: theme.spacing.sm,
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    favicon: {
      width: 14,
      height: 14,
      marginRight: theme.spacing.xs,
      borderRadius: 2,
    },
    hostname: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.message.agentText,
      marginBottom: 2,
    },
    description: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.xs * 1.4,
    },
  })
