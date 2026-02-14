import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { compressImageToJpeg } from '../utils/compressImage'
import { compressVideo } from '../utils/compressVideo'
import { logger } from '../utils/logger'
import { isWeb } from '../utils/platform'

const attachmentLogger = logger.create('Attachments')

interface UseAttachmentsOptions {
  disabled: boolean
  supportsImageAttachments: boolean
}

export function useAttachments({ disabled, supportsImageAttachments }: UseAttachmentsOptions) {
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)

  const handleFilesReceived = useCallback((newAttachments: MessageAttachment[]) => {
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const handlePickImage = useCallback(async () => {
    setShowMenu(false)
    // Wait for modal dismiss animation to complete before presenting system picker.
    // Without this delay, the picker silently fails to present on iOS and Android.
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      })

      if (!result.canceled && result.assets.length > 0) {
        setCompressing(true)
        setCompressionProgress(0)
        try {
          const total = result.assets.length
          const newAttachments: MessageAttachment[] = []
          for (let i = 0; i < total; i++) {
            const asset = result.assets[i]
            const compressed = await compressImageToJpeg(asset.uri)
            newAttachments.push({
              type: 'image' as const,
              uri: compressed.uri,
              base64: compressed.base64,
              mimeType: compressed.mimeType,
              name: asset.fileName ?? undefined,
            })
            setCompressionProgress((i + 1) / total)
          }
          setAttachments((prev) => [...prev, ...newAttachments])
        } finally {
          setCompressing(false)
          setCompressionProgress(0)
        }
      }
    } catch (error) {
      attachmentLogger.error('Failed to pick image', error)
    }
  }, [])

  const handlePickVideo = useCallback(async () => {
    setShowMenu(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: true,
        quality: 1,
      })

      if (!result.canceled && result.assets.length > 0) {
        setCompressing(true)
        setCompressionProgress(0)
        try {
          const total = result.assets.length
          const newAttachments: MessageAttachment[] = []
          for (let i = 0; i < total; i++) {
            const asset = result.assets[i]
            let uri = asset.uri
            const mimeType = asset.mimeType ?? 'video/mp4'

            // Compress videos on native platforms
            if (!isWeb) {
              const compressed = await compressVideo(uri, (progress) => {
                setCompressionProgress((i + progress) / total)
              })
              uri = compressed.uri
            }

            newAttachments.push({
              type: 'video' as const,
              uri,
              mimeType,
              name: asset.fileName ?? undefined,
            })
            setCompressionProgress((i + 1) / total)
          }
          setAttachments((prev) => [...prev, ...newAttachments])
        } finally {
          setCompressing(false)
          setCompressionProgress(0)
        }
      }
    } catch (error) {
      attachmentLogger.error('Failed to pick video', error)
    }
  }, [])

  const handlePickFile = useCallback(async () => {
    setShowMenu(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    try {
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
    } catch (error) {
      attachmentLogger.error('Failed to pick file', error)
    }
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  return {
    attachments,
    showMenu,
    setShowMenu,
    compressing,
    compressionProgress,
    handleFilesReceived,
    handlePickImage,
    handlePickVideo,
    handlePickFile,
    handleRemoveAttachment,
    clearAttachments,
    dropPasteEnabled: !disabled && supportsImageAttachments,
  }
}
