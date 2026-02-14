import { Directory, File as ExpoFile, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import type { ReceivedFileAttachment } from '../services/providers/types'
import { logger } from './logger'

const fileTransferLogger = logger.create('FileTransfer')

const RECEIVED_FILES_DIR_NAME = 'received-files'

/** Ensure the received-files cache directory exists. */
function ensureDir(): Directory {
  const dir = new Directory(Paths.cache, RECEIVED_FILES_DIR_NAME)
  if (!dir.exists) {
    dir.create()
  }
  return dir
}

/**
 * Save a base64-encoded file received from the gateway to the local cache
 * and return a `file://` URI that can be used by Image / share / etc.
 */
export function saveReceivedFile(attachment: ReceivedFileAttachment): string {
  const dir = ensureDir()

  const timestamp = Date.now()
  const safeName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${timestamp}-${safeName}`

  const file = new ExpoFile(dir, fileName)

  // Decode base64 to bytes, then write
  const binaryString = atob(attachment.content)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  file.write(bytes)

  fileTransferLogger.info(`Saved received file: ${safeName} → ${file.uri}`)
  return file.uri
}

/**
 * Save multiple received files and return their local URIs.
 */
export async function saveReceivedFiles(attachments: ReceivedFileAttachment[]): Promise<string[]> {
  const uris: string[] = []
  for (const attachment of attachments) {
    try {
      const uri = saveReceivedFile(attachment)
      uris.push(uri)
    } catch (err) {
      fileTransferLogger.logError(`Failed to save received file: ${attachment.fileName}`, err)
    }
  }
  return uris
}

/**
 * Share a locally saved file using the system share sheet.
 */
export async function shareFile(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    fileTransferLogger.error('Sharing is not available on this device')
    return
  }
  await Sharing.shareAsync(uri)
}

/**
 * Return true if the mime type represents an image.
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}
