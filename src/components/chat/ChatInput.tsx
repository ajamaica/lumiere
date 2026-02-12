import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FlatList,
  Image,
  ImageStyle,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useFileDropPaste } from '../../hooks/useFileDropPaste'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { useVoiceTranscription } from '../../hooks/useVoiceTranscription'
import { ProviderType } from '../../services/providers/types'
import { Theme, useTheme } from '../../theme'
import { compressImageToJpeg } from '../../utils/compressImage'
import { GlassView, isLiquidGlassAvailable } from '../../utils/glassEffect'
import { isWeb } from '../../utils/platform'
import { MessageAttachment } from './ChatMessage'

interface ChatInputProps {
  onSend: (text: string, attachments?: MessageAttachment[]) => void
  onOpenSessionMenu?: () => void
  disabled?: boolean
  queueCount?: number
  supportsImageAttachments?: boolean
  supportsFileAttachments?: boolean
  providerType?: ProviderType
}

export function ChatInput({
  onSend,
  onOpenSessionMenu,
  disabled = false,
  queueCount = 0,
  supportsImageAttachments = true,
  supportsFileAttachments = false,
  providerType,
}: ChatInputProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const { suggestions, hasInput } = useSlashCommands(text, providerType)
  const voice = useVoiceTranscription()
  const glassAvailable = isLiquidGlassAvailable()
  const styles = useMemo(() => createStyles(theme, glassAvailable), [theme, glassAvailable])

  const handleFilesReceived = useCallback((newAttachments: MessageAttachment[]) => {
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const { isDragging } = useFileDropPaste({
    onFiles: handleFilesReceived,
    enabled: !disabled && supportsImageAttachments,
  })

  const handleSend = () => {
    if ((text.trim() || attachments.length > 0) && !disabled) {
      onSend(text.trim(), attachments.length > 0 ? attachments : undefined)
      setText('')
      setAttachments([])
    }
  }

  const handleSelectCommand = (command: string) => {
    setText(command + ' ')
  }

  const handlePickImage = async () => {
    setShowAttachmentMenu(false)
    // Wait for modal dismiss animation to complete before presenting system picker.
    // Without this delay, the picker silently fails to present on iOS and Android.
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    })

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: MessageAttachment[] = await Promise.all(
        result.assets.map(async (asset) => {
          const compressed = await compressImageToJpeg(asset.uri)
          return {
            type: 'image' as const,
            uri: compressed.uri,
            base64: compressed.base64,
            mimeType: compressed.mimeType,
            name: asset.fileName ?? undefined,
          }
        }),
      )
      setAttachments((prev) => [...prev, ...newAttachments])
    }
  }

  const handlePickVideo = async () => {
    setShowAttachmentMenu(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: MessageAttachment[] = result.assets.map((asset) => ({
        type: 'video' as const,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'video/mp4',
        name: asset.fileName ?? undefined,
      }))
      setAttachments((prev) => [...prev, ...newAttachments])
    }
  }

  const handlePickFile = async () => {
    setShowAttachmentMenu(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    })

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: MessageAttachment[] = result.assets.map((asset) => ({
        type: 'file' as const,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        name: asset.name,
      }))
      setAttachments((prev) => [...prev, ...newAttachments])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMicPress = useCallback(async () => {
    if (voice.status === 'idle') {
      await voice.start()
    }
  }, [voice])

  const handleStopRecording = useCallback(async () => {
    const finalText = await voice.stop()
    if (finalText.trim()) {
      setText((prev) => (prev ? prev + ' ' + finalText.trim() : finalText.trim()))
    }
  }, [voice])

  const handleCancelRecording = useCallback(async () => {
    await voice.cancel()
  }, [voice])

  const menuButtonColor = disabled ? theme.colors.text.tertiary : theme.colors.text.secondary
  const hasContent = text.trim() || attachments.length > 0
  const isRecording = voice.status === 'recording'
  const showMic = !hasContent && voice.isAvailable

  const Container = glassAvailable ? GlassView : View
  const containerProps = glassAvailable
    ? {
        style: styles.container,
        glassEffectStyle: 'clear' as const,
      }
    : { style: [styles.container, styles.containerFallback] }

  return (
    <>
      <Modal
        visible={showAttachmentMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAttachmentMenu(false)}>
          <Pressable>
            <View style={styles.attachmentMenu}>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={handlePickImage}
                accessibilityRole="button"
                accessibilityLabel="Attach picture"
              >
                <View style={styles.attachmentIconContainer}>
                  <Ionicons name="image" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.attachmentOptionText}>Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={handlePickVideo}
                accessibilityRole="button"
                accessibilityLabel="Attach video"
              >
                <View style={styles.attachmentIconContainer}>
                  <Ionicons name="videocam" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.attachmentOptionText}>Video</Text>
              </TouchableOpacity>
              {supportsFileAttachments && (
                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={handlePickFile}
                  accessibilityRole="button"
                  accessibilityLabel="Attach file"
                >
                  <View style={styles.attachmentIconContainer}>
                    <Ionicons name="document" size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.attachmentOptionText}>File</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {isDragging && isWeb && (
        <Modal visible transparent animationType="fade">
          <View style={styles.dropOverlay}>
            <View style={styles.dropOverlayContent}>
              <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.dropOverlayTitle}>
                {t('chat.dropFilesHere', 'Drop files here')}
              </Text>
              <Text style={styles.dropOverlaySubtitle}>
                {t('chat.dropFilesSubtitle', 'Images, videos, and documents')}
              </Text>
            </View>
          </View>
        </Modal>
      )}
      {hasInput && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.command}
          style={styles.autocomplete}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.autocompleteItem}
              onPress={() => handleSelectCommand(item.command)}
              accessibilityRole="button"
              accessibilityLabel={`${item.command}: ${item.description}`}
            >
              <Text style={styles.commandText}>{item.command}</Text>
              <Text style={styles.commandDescription} numberOfLines={1}>
                {item.description}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      <View style={styles.background}>
        <Container {...containerProps}>
          {isRecording && (
            <View style={styles.recordingOverlay} accessibilityLiveRegion="polite">
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingLabel}>{t('chat.listening')}</Text>
              </View>
              <Text
                style={styles.transcribedText}
                numberOfLines={3}
                accessibilityLiveRegion="polite"
              >
                {voice.transcribedText || t('chat.startSpeaking')}
              </Text>
              <View style={styles.recordingActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelRecording}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                >
                  <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStopRecording}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.done')}
                >
                  <Ionicons name="checkmark" size={20} color={theme.colors.text.inverse} />
                  <Text style={styles.stopButtonText}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!isRecording && (
            <>
              {attachments.length > 0 && (
                <View style={styles.attachmentPreviewRow}>
                  {attachments.map((attachment, index) => (
                    <View key={index} style={styles.attachmentPreviewItem}>
                      {attachment.type === 'image' ? (
                        <Image
                          source={{ uri: attachment.uri }}
                          style={styles.attachmentPreviewImage as ImageStyle}
                        />
                      ) : (
                        <View style={styles.attachmentPreviewPlaceholder}>
                          <Ionicons
                            name={attachment.type === 'video' ? 'videocam' : 'document'}
                            size={32}
                            color={theme.colors.text.secondary}
                          />
                          {attachment.name && (
                            <Text style={styles.attachmentName} numberOfLines={1}>
                              {attachment.name}
                            </Text>
                          )}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeAttachmentButton}
                        onPress={() => handleRemoveAttachment(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove attachment ${index + 1}`}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.colors.text.inverse} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                maxLength={2000}
                editable={!disabled}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                accessibilityLabel={t('chat.placeholder')}
                accessibilityHint="Type your message here"
              />
              <View style={styles.buttonRow}>
                {onOpenSessionMenu && (
                  <TouchableOpacity
                    style={[styles.menuButton, disabled && styles.buttonDisabled]}
                    onPress={onOpenSessionMenu}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel="Session menu"
                    accessibilityState={{ disabled }}
                  >
                    <Ionicons name="ellipsis-vertical" size={24} color={menuButtonColor} />
                  </TouchableOpacity>
                )}
                {supportsImageAttachments && (
                  <TouchableOpacity
                    style={[styles.menuButton, disabled && styles.buttonDisabled]}
                    onPress={() => setShowAttachmentMenu(true)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel="Add attachment"
                    accessibilityState={{ disabled }}
                  >
                    <Ionicons
                      name="add"
                      size={26}
                      color={disabled ? theme.colors.text.tertiary : theme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.spacer} />
                <View style={styles.sendButtonContainer}>
                  {queueCount > 0 && (
                    <View
                      style={styles.queueBadge}
                      accessibilityLabel={`${queueCount} message${queueCount !== 1 ? 's' : ''} queued`}
                    >
                      <Text style={styles.queueText}>{queueCount}</Text>
                    </View>
                  )}
                  {showMic ? (
                    <TouchableOpacity
                      style={[styles.sendButton, styles.sendButtonInactive]}
                      onPress={handleMicPress}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel="Start voice input"
                      accessibilityState={{ disabled }}
                    >
                      <Ionicons
                        name="mic"
                        size={22}
                        color={disabled ? theme.colors.text.tertiary : theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        hasContent && !disabled
                          ? styles.sendButtonActive
                          : styles.sendButtonInactive,
                      ]}
                      onPress={handleSend}
                      disabled={!hasContent || disabled}
                      accessibilityRole="button"
                      accessibilityLabel="Send message"
                      accessibilityState={{ disabled: !hasContent || disabled }}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={22}
                        color={
                          hasContent && !disabled
                            ? theme.colors.text.inverse
                            : theme.colors.text.tertiary
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </Container>
      </View>
    </>
  )
}

const createStyles = (theme: Theme, _glassAvailable: boolean) =>
  StyleSheet.create({
    background: {
      backgroundColor: 'transparent',
    },
    container: {
      flexDirection: 'column',
      marginHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      backgroundColor: 'transparent',
      borderRadius: 28,
      overflow: 'hidden',
    },
    containerFallback: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    spacer: {
      flex: 1,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonContainer: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    sendButtonInactive: {
      backgroundColor: theme.colors.surface,
    },
    queueBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      marginRight: theme.spacing.xs,
      marginBottom: 2,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    autocomplete: {
      maxHeight: 200,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    autocompleteItem: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    commandText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    commandDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    attachmentPreviewRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    attachmentPreviewItem: {
      position: 'relative',
    },
    attachmentPreviewImage: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.md,
    },
    removeAttachmentButton: {
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
    recordingOverlay: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF3B30',
    },
    recordingLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    transcribedText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      minHeight: 40,
      paddingHorizontal: theme.spacing.xs,
    },
    recordingActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xxl,
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    stopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xxl,
      backgroundColor: theme.colors.primary,
    },
    stopButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.inverse,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      paddingBottom: 100,
    },
    attachmentMenu: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    attachmentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
    },
    attachmentIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    attachmentOptionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    attachmentPreviewPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    attachmentName: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: 4,
      maxWidth: 60,
      textAlign: 'center',
    },
    dropOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropOverlayContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg * 2,
      paddingVertical: theme.spacing.lg * 2,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed' as const,
      backgroundColor: theme.colors.surface,
    },
    dropOverlayTitle: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dropOverlaySubtitle: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })
