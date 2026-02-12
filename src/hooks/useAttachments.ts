import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { compressImageToJpeg } from '../utils/compressImage'

interface UseAttachmentsOptions {
  disabled: boolean
  supportsImageAttachments: boolean
}

export function useAttachments({ disabled, supportsImageAttachments }: UseAttachmentsOptions) {
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showMenu, setShowMenu] = useState(false)

  const handleFilesReceived = useCallback((newAttachments: MessageAttachment[]) => {
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const handlePickImage = useCallback(async () => {
    setShowMenu(false)
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
  }, [])

  const handlePickVideo = useCallback(async () => {
    setShowMenu(false)
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
  }, [])

  const handlePickFile = useCallback(async () => {
    setShowMenu(false)
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
    handleFilesReceived,
    handlePickImage,
    handlePickVideo,
    handlePickFile,
    handleRemoveAttachment,
    clearAttachments,
    dropPasteEnabled: !disabled && supportsImageAttachments,
  }
}
