import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Theme, useTheme } from '../../theme'

interface AttachmentMenuProps {
  visible: boolean
  onClose: () => void
  onPickImage: () => void
  onPickVideo: () => void
  onPickFile: () => void
  supportsFileAttachments: boolean
}

export function AttachmentMenu({
  visible,
  onClose,
  onPickImage,
  onPickVideo,
  onPickFile,
  supportsFileAttachments,
}: AttachmentMenuProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.option}
              onPress={onPickImage}
              accessibilityRole="button"
              accessibilityLabel="Attach picture"
            >
              <View style={styles.iconContainer}>
                <Ionicons name="image" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.optionText}>Picture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={onPickVideo}
              accessibilityRole="button"
              accessibilityLabel="Attach video"
            >
              <View style={styles.iconContainer}>
                <Ionicons name="videocam" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.optionText}>Video</Text>
            </TouchableOpacity>
            {supportsFileAttachments && (
              <TouchableOpacity
                style={styles.option}
                onPress={onPickFile}
                accessibilityRole="button"
                accessibilityLabel="Attach file"
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="document" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.optionText}>File</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      paddingBottom: 100,
    },
    menu: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    optionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  })
