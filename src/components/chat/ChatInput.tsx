import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { useAttachments } from '../../hooks/useAttachments'
import { useFileDropPaste } from '../../hooks/useFileDropPaste'
import { usePendingShare } from '../../hooks/usePendingShare'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { useVoiceTranscription } from '../../hooks/useVoiceTranscription'
import { ProviderType } from '../../services/providers/types'
import { Theme, useTheme } from '../../theme'
import { GlassView, isLiquidGlassAvailable } from '../../utils/glassEffect'
import { isWeb } from '../../utils/platform'
import { AttachmentMenu } from './AttachmentMenu'
import { AttachmentPreview } from './AttachmentPreview'
import { MessageAttachment } from './ChatMessage'
import { DropOverlay } from './DropOverlay'
import { InputButtonRow } from './InputButtonRow'
import { RecordingOverlay } from './RecordingOverlay'
import { SlashCommandAutocomplete } from './SlashCommandAutocomplete'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInputProps {
  onSend: (text: string, attachments?: MessageAttachment[]) => void
  onOpenSessionMenu?: () => void
  disabled?: boolean
  queueCount?: number
  supportsImageAttachments?: boolean
  supportsFileAttachments?: boolean
  providerType?: ProviderType
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const glassAvailable = isLiquidGlassAvailable()
  const styles = useMemo(() => createStyles(theme, glassAvailable), [theme, glassAvailable])

  // --- hooks ---------------------------------------------------------------

  const { suggestions, hasInput } = useSlashCommands(text, providerType)
  const voice = useVoiceTranscription()
  const attach = useAttachments({ disabled, supportsImageAttachments })
  const { isDragging } = useFileDropPaste({
    onFiles: attach.handleFilesReceived,
    enabled: attach.dropPasteEnabled,
  })

  usePendingShare(attach.handleFilesReceived, setText)

  // --- derived state -------------------------------------------------------

  const hasContent = !!(text.trim() || attach.attachments.length > 0)
  const isRecording = voice.status === 'recording'
  const isBusy = disabled || attach.compressing
  const showMic = !hasContent && voice.isAvailable

  // --- handlers ------------------------------------------------------------

  const handleSend = useCallback(() => {
    if ((text.trim() || attach.attachments.length > 0) && !isBusy) {
      onSend(text.trim(), attach.attachments.length > 0 ? attach.attachments : undefined)
      setText('')
      attach.clearAttachments()
    }
  }, [text, attach, isBusy, onSend])

  const handleSelectCommand = useCallback((command: string) => {
    setText(command + ' ')
  }, [])

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

  // --- container -----------------------------------------------------------

  const Container = glassAvailable ? GlassView : View
  const containerProps = glassAvailable
    ? { style: styles.container, glassEffectStyle: 'clear' as const }
    : { style: [styles.container, styles.containerFallback] }

  // --- render --------------------------------------------------------------

  return (
    <>
      <AttachmentMenu
        visible={attach.showMenu}
        onClose={() => attach.setShowMenu(false)}
        onTakePhoto={attach.handleTakePhoto}
        onPickImage={attach.handlePickImage}
        onPickFile={attach.handlePickFile}
        supportsFileAttachments={supportsFileAttachments}
      />

      {isDragging && isWeb && <DropOverlay />}

      {hasInput && suggestions.length > 0 && (
        <SlashCommandAutocomplete suggestions={suggestions} onSelect={handleSelectCommand} />
      )}

      <View style={styles.background}>
        <Container {...containerProps}>
          {isRecording ? (
            <RecordingOverlay
              transcribedText={voice.transcribedText}
              onStop={handleStopRecording}
              onCancel={handleCancelRecording}
            />
          ) : (
            <>
              {attach.compressing && (
                <View style={styles.compressionBar}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.compressionText}>
                    {t('chat.compressing')}
                    {attach.compressionProgress > 0 &&
                      ` ${Math.round(attach.compressionProgress * 100)}%`}
                  </Text>
                </View>
              )}

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
                editable={!isBusy}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                accessibilityLabel={t('chat.placeholder')}
                accessibilityHint={t('accessibility.messageInputHint', 'Type your message here')}
              />

              <InputButtonRow
                disabled={disabled}
                hasContent={hasContent}
                isBusy={isBusy}
                showMic={showMic}
                queueCount={queueCount}
                onOpenSessionMenu={onOpenSessionMenu}
                onOpenAttachmentMenu={() => attach.setShowMenu(true)}
                onSend={handleSend}
                onMicPress={handleMicPress}
                supportsImageAttachments={supportsImageAttachments}
              />
            </>
          )}
        </Container>
      </View>
    </>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    compressionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    compressionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  })
