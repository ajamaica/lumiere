import React from 'react'
import { Modal, ModalProps, Pressable, StyleSheet, ViewStyle } from 'react-native'

import { useTheme } from '../../theme'

type ModalPosition = 'center' | 'bottom'

export interface ModalOverlayProps {
  visible: boolean
  onClose: () => void
  /** Position of the content: 'center' (default) or 'bottom' for bottom sheets */
  position?: ModalPosition
  /** Animation type for the modal transition */
  animationType?: ModalProps['animationType']
  /** Width of the content container (default: '85%') */
  width?: ViewStyle['width']
  /** Maximum height of the content container */
  maxHeight?: ViewStyle['maxHeight']
  /** Whether pressing the backdrop closes the modal (default: true) */
  closeOnBackdropPress?: boolean
  children: React.ReactNode
}

export function ModalOverlay({
  visible,
  onClose,
  position = 'center',
  animationType = 'fade',
  width = '85%',
  maxHeight,
  closeOnBackdropPress = true,
  children,
}: ModalOverlayProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: position === 'bottom' ? 'flex-end' : 'center',
      alignItems: 'center',
    },
    contentContainer: {
      width,
      ...(maxHeight ? { maxHeight } : {}),
      backgroundColor: theme.colors.surface,
      borderRadius: position === 'bottom' ? undefined : theme.borderRadius.xl,
      ...(position === 'bottom' && {
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
      }),
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
  })

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={closeOnBackdropPress ? onClose : undefined}>
        <Pressable style={styles.contentContainer} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
