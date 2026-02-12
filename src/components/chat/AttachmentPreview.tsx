import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { Image, ImageStyle, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Theme, useTheme } from '../../theme'
import { MessageAttachment } from './ChatMessage'

interface AttachmentPreviewProps {
  attachments: MessageAttachment[]
  onRemove: (index: number) => void
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (attachments.length === 0) return null

  return (
    <View style={styles.row}>
      {attachments.map((attachment, index) => (
        <View key={index} style={styles.item}>
          {attachment.type === 'image' ? (
            <Image source={{ uri: attachment.uri }} style={styles.image as ImageStyle} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name={attachment.type === 'video' ? 'videocam' : 'document'}
                size={32}
                color={theme.colors.text.secondary}
              />
              {attachment.name && (
                <Text style={styles.name} numberOfLines={1}>
                  {attachment.name}
                </Text>
              )}
            </View>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove attachment ${index + 1}`}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    item: {
      position: 'relative',
    },
    image: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.md,
    },
    placeholder: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    name: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: 4,
      maxWidth: 60,
      textAlign: 'center',
    },
    removeButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
