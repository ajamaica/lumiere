import { useAtom } from 'jotai'
import { useEffect } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { pendingShareMediaAtom, pendingShareTextAtom } from '../store'
import { compressImageToJpeg } from '../utils/compressImage'
import { compressVideo } from '../utils/compressVideo'
import { isNative } from '../utils/platform'

/**
 * Converts pending share-intent media into `MessageAttachment` objects and
 * stages them in the chat input.  Images are compressed to JPEG, videos are
 * compressed on native platforms, and everything else is passed through as a
 * generic file.
 */
export function usePendingShare(
  onFiles: (attachments: MessageAttachment[]) => void,
  onText: (text: string) => void,
) {
  const [pendingMedia, setPendingMedia] = useAtom(pendingShareMediaAtom)
  const [pendingText, setPendingText] = useAtom(pendingShareTextAtom)

  useEffect(() => {
    if (!pendingMedia || pendingMedia.length === 0) return
    ;(async () => {
      const converted: MessageAttachment[] = []

      for (const media of pendingMedia) {
        if (media.mimeType.startsWith('image/')) {
          try {
            const compressed = await compressImageToJpeg(media.uri)
            converted.push({
              type: 'image',
              uri: compressed.uri,
              base64: compressed.base64,
              mimeType: compressed.mimeType,
              name: media.fileName,
            })
          } catch {
            converted.push({
              type: 'image',
              uri: media.uri,
              mimeType: media.mimeType,
              name: media.fileName,
            })
          }
        } else if (media.mimeType.startsWith('video/')) {
          let videoUri = media.uri
          if (isNative) {
            try {
              const compressed = await compressVideo(videoUri)
              videoUri = compressed.uri
            } catch {
              // Use original on failure
            }
          }
          converted.push({
            type: 'video',
            uri: videoUri,
            mimeType: media.mimeType,
            name: media.fileName,
          })
        } else {
          converted.push({
            type: 'file',
            uri: media.uri,
            mimeType: media.mimeType,
            name: media.fileName,
          })
        }
      }

      if (converted.length > 0) {
        onFiles(converted)
      }
      if (pendingText) {
        onText(pendingText)
      }
      setPendingMedia(null)
      setPendingText(null)
    })()
  }, [pendingMedia, pendingText, onFiles, onText, setPendingMedia, setPendingText])
}
