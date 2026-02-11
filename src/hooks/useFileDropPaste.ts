import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { compressImageToJpeg } from '../utils/compressImage'

/**
 * Read a web File object and convert it to a MessageAttachment.
 * Images are read as data-URLs so the base64 payload is available for
 * provider upload; other file types get an object-URL for local preview.
 */
async function processWebFile(file: globalThis.File): Promise<MessageAttachment> {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage) {
    // Read the file as a data-URL, then compress and convert to JPEG.
    const dataUrl = await readAsDataURL(file)
    const compressed = await compressImageToJpeg(dataUrl)
    return {
      type: 'image',
      uri: compressed.uri,
      base64: compressed.base64,
      mimeType: compressed.mimeType,
      name: file.name,
    }
  }

  // For videos and generic files we only need a blob URL for local preview.
  const uri = URL.createObjectURL(file)

  if (isVideo) {
    return {
      type: 'video',
      uri,
      mimeType: file.type || 'video/mp4',
      name: file.name,
    }
  }

  return {
    type: 'file',
    uri,
    mimeType: file.type || 'application/octet-stream',
    name: file.name,
  }
}

function readAsDataURL(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface UseFileDropPasteOptions {
  /** Called when files are received via paste or drag-and-drop. */
  onFiles: (attachments: MessageAttachment[]) => void
  /** Disable listeners (e.g. when the input is disabled). */
  enabled?: boolean
}

/**
 * Hook that listens for clipboard paste and drag-and-drop events at the
 * document level (web only) and converts incoming files into
 * `MessageAttachment` objects.
 *
 * On native platforms (iOS / Android) this is a no-op — file selection is
 * handled through the existing pickers (`expo-image-picker` /
 * `expo-document-picker`).
 */
export function useFileDropPaste({ onFiles, enabled = true }: UseFileDropPasteOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)

  const processFiles = useCallback(
    async (files: globalThis.File[]) => {
      if (files.length === 0) return
      const attachments = await Promise.all(files.map(processWebFile))
      onFiles(attachments)
    },
    [onFiles],
  )

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return

    const handlePaste = (e: Event) => {
      const clipboardEvent = e as ClipboardEvent
      const items = clipboardEvent.clipboardData?.items
      if (!items) return

      const files: globalThis.File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        processFiles(files)
      }
    }

    const handleDragEnter = (e: Event) => {
      e.preventDefault()
      dragCounterRef.current++
      const dragEvent = e as DragEvent
      if (dragEvent.dataTransfer?.types?.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: Event) => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: Event) => {
      e.preventDefault()
    }

    const handleDrop = (e: Event) => {
      e.preventDefault()
      setIsDragging(false)
      dragCounterRef.current = 0

      const dragEvent = e as DragEvent
      const files = dragEvent.dataTransfer?.files
      if (files && files.length > 0) {
        processFiles(Array.from(files))
      }
    }

    document.addEventListener('paste', handlePaste)
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [enabled, processFiles])

  return { isDragging }
}
