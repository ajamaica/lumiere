import { File as ExpoFile } from 'expo-file-system'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { ProviderAttachment } from '../services/providers/types'
import { logger } from './logger'

const attachmentLogger = logger.create('Attachments')

/**
 * Read a file URI and return its contents as a base64-encoded string.
 */
async function readFileAsBase64(uri: string): Promise<string> {
  const file = new ExpoFile(uri)
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert a single UI-layer MessageAttachment into the provider-agnostic
 * ProviderAttachment format.
 *
 * - Images use their existing base64 payload.
 * - Files and videos are read from the local URI and encoded to base64.
 */
export async function toProviderAttachment(
  attachment: MessageAttachment,
): Promise<ProviderAttachment | null> {
  if (attachment.type === 'image' && attachment.base64) {
    return {
      type: 'image',
      data: attachment.base64,
      mimeType: attachment.mimeType,
      name: attachment.name,
    }
  }

  if ((attachment.type === 'file' || attachment.type === 'video') && attachment.uri) {
    try {
      const base64 = await readFileAsBase64(attachment.uri)
      return {
        type: attachment.type === 'video' ? 'video' : 'document',
        data: base64,
        mimeType: attachment.mimeType || 'application/octet-stream',
        name: attachment.name,
      }
    } catch (err) {
      attachmentLogger.logError('Failed to read file as base64', err)
      return null
    }
  }

  return null
}

/**
 * Batch-convert an array of MessageAttachments to ProviderAttachments,
 * filtering out any that failed to convert.
 */
export async function toProviderAttachments(
  attachments: MessageAttachment[],
): Promise<ProviderAttachment[] | undefined> {
  if (!attachments.length) return undefined

  const results = await Promise.all(attachments.map(toProviderAttachment))
  const converted = results.filter((a): a is ProviderAttachment => a !== null)
  return converted.length > 0 ? converted : undefined
}
