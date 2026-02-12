/**
 * Unified attachment conversion pipeline.
 *
 * Centralises all conversions between the three attachment representations
 * used in the app:
 *
 *   MessageAttachment  (UI layer – local URIs / base64 from pickers)
 *        ↓  convertMessageAttachments()
 *   ProviderAttachment (provider-agnostic – base64 data ready for APIs)
 *        ↓  toMoltAttachments()
 *   Molt wire format    (field names expected by the Molt Gateway)
 */

import { File as ExpoFile } from 'expo-file-system'

import { MessageAttachment } from '../components/chat/ChatMessage'
import { ProviderAttachment } from '../services/providers/types'
import { logger } from './logger'

const log = logger.create('Attachments')

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Read a file from a local URI and return its contents as a base64 string.
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

// ─── MessageAttachment → ProviderAttachment ─────────────────────────────────

/**
 * Convert a single UI-layer `MessageAttachment` into a provider-agnostic
 * `ProviderAttachment`.  Images use the pre-computed base64; videos and
 * files are read from their URI.
 *
 * Returns `null` when the attachment cannot be converted (e.g. missing
 * base64 for an image, or a file-read failure).
 */
async function convertOne(attachment: MessageAttachment): Promise<ProviderAttachment | null> {
  if (attachment.type === 'image') {
    if (!attachment.base64) return null
    return {
      type: 'image',
      data: attachment.base64,
      mimeType: attachment.mimeType,
      name: attachment.name,
    }
  }

  // Videos and generic files need to be read from disk.
  if (!attachment.uri) return null

  try {
    const base64 = await readFileAsBase64(attachment.uri)
    return {
      type: attachment.type === 'video' ? 'video' : 'document',
      data: base64,
      mimeType: attachment.mimeType || 'application/octet-stream',
      name: attachment.name,
    }
  } catch (err) {
    log.logError('Failed to read file as base64', err)
    return null
  }
}

/**
 * Convert an array of UI-layer attachments into provider-ready attachments.
 * Attachments that fail to convert are silently dropped (with a log warning).
 */
export async function convertMessageAttachments(
  attachments: MessageAttachment[],
): Promise<ProviderAttachment[]> {
  const results: ProviderAttachment[] = []
  for (const attachment of attachments) {
    const converted = await convertOne(attachment)
    if (converted) {
      results.push(converted)
    }
  }
  return results
}

// ─── ProviderAttachment → Molt wire format ──────────────────────────────────

/** Shape expected by the Molt Gateway `agent.run` RPC. */
export interface MoltWireAttachment {
  type: 'image' | 'audio' | 'video' | 'document'
  content?: string
  mimeType?: string
  fileName?: string
}

/**
 * Map provider attachments to the Molt Gateway wire format.
 */
export function toMoltAttachments(
  attachments: ProviderAttachment[] | undefined,
): MoltWireAttachment[] | undefined {
  if (!attachments?.length) return undefined
  return attachments.map((a) => ({
    type: a.type,
    content: a.data,
    mimeType: a.mimeType,
    fileName: a.name,
  }))
}
