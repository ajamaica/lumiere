import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useAttachments } from '../../hooks/useAttachments'
import { useFileDropPaste } from '../../hooks/useFileDropPaste'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { useVoiceTranscription } from '../../hooks/useVoiceTranscription'
import { ProviderType } from '../../services/providers/types'
import { Theme, useTheme } from '../../theme'
import { GlassView, isLiquidGlassAvailable } from '../../utils/glassEffect'
import { isWeb } from '../../utils/platform'
import { AttachmentMenu } from './AttachmentMenu'
import { AttachmentPreview } from './AttachmentPreview'
import { MessageAttachment } from './ChatMessage'
import { RecordingOverlay } from './RecordingOverlay'

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
  const { suggestions, hasInput } = useSlashCommands(text, providerType)
  const voice = useVoiceTranscription()
  const glassAvailable = isLiquidGlassAvailable()
  const styles = useMemo(() => createStyles(theme, glassAvailable), [theme, glassAvailable])

  const attach = useAttachments({ disabled, supportsImageAttachments })

  const { isDragging } = useFileDropPaste({
    onFiles: attach.handleFilesReceived,
    enabled: attach.dropPasteEnabled,
  })

  const handleSend = () => {
    if ((text.trim() || attach.attachments.length > 0) && !disabled) {
      onSend(text.trim(), attach.attachments.length > 0 ? attach.attachments : undefined)
      setText('')
      attach.clearAttachments()
    }
  }

  const handleSelectCommand = (command: string) => {
    setText(command + ' ')
  }

  const handleStopRecording = useCallback(async () => {
    const finalText = await voice.stop()
    if (finalText.trim()) {
      setText((prev) => (prev ? prev + ' ' + finalText.trim() : finalText.trim()))
    }
  }, [voice])

  const handleCancelRecording = useCallback(async () => {
    await voice.cancel()
  }, [voice])

  const handleMicPress = useCallback(async () => {
    if (voice.status === 'idle') {
      await voice.start()
    }
  }, [voice])

  const menuButtonColor = disabled ? theme.colors.text.tertiary : theme.colors.text.secondary
  const hasContent = text.trim() || attach.attachments.length > 0
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
      <AttachmentMenu
        visible={attach.showMenu}
        onClose={() => attach.setShowMenu(false)}
        onPickImage={attach.handlePickImage}
        onPickVideo={attach.handlePickVideo}
        onPickFile={attach.handlePickFile}
        supportsFileAttachments={supportsFileAttachments}
      />
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
            <RecordingOverlay
              transcribedText={voice.transcribedText}
              onStop={handleStopRecording}
              onCancel={handleCancelRecording}
            />
          )}
          {!isRecording && (
            <>
              <AttachmentPreview
                attachments={attach.attachments}
                onRemove={attach.handleRemoveAttachment}
              />
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
                    accessibilityLabel={t('accessibility.sessionMenu')}
                    accessibilityState={{ disabled }}
                  >
                    <Ionicons name="ellipsis-vertical" size={24} color={menuButtonColor} />
                  </TouchableOpacity>
                )}
                {supportsImageAttachments && (
                  <TouchableOpacity
                    style={[styles.menuButton, disabled && styles.buttonDisabled]}
                    onPress={() => attach.setShowMenu(true)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={t('accessibility.addAttachment')}
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
                      accessibilityLabel={t('accessibility.messagesQueued', { count: queueCount })}
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
                      accessibilityLabel={t('accessibility.startVoiceInput')}
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
                      accessibilityLabel={t('accessibility.sendMessage')}
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
