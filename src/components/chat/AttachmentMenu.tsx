import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Theme, useTheme } from '../../theme'

interface AttachmentMenuProps {
  visible: boolean
  onClose: () => void
  onTakePhoto: () => void
  onPickImage: () => void
  onPickFile: () => void
  supportsFileAttachments: boolean
}

export function AttachmentMenu({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onPickFile,
  supportsFileAttachments,
}: AttachmentMenuProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.option}
              onPress={onTakePhoto}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachCamera')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="camera" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>{t('chat.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={onPickImage}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachPhotos')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#AF52DE' }]}>
                <Ionicons name="image" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>{t('chat.photos')}</Text>
            </TouchableOpacity>
            {supportsFileAttachments && (
              <TouchableOpacity
                style={styles.option}
                onPress={onPickFile}
                accessibilityRole="button"
                accessibilityLabel={t('chat.attachFile')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#34C759' }]}>
                  <Ionicons name="folder" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.optionText}>{t('chat.files')}</Text>
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
