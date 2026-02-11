import { ChatSendAttachment } from '../services/molt/types'
import { ProviderAttachment } from '../services/providers/types'

/**
 * Build a data-URI string from raw base64 content and a MIME type.
 *
 * Example: toDataUri('iVBOR…', 'image/png') → 'data:image/png;base64,iVBOR…'
 */
export function toDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}

/**
 * Parse a data-URI into its base64 payload and MIME type.
 * Returns `null` when the string is not a valid data-URI.
 */
export function parseDataUri(dataUri: string): { data: string; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

/**
 * Convert a {@link ProviderAttachment} (raw base64 in `data`) into the
 * {@link ChatSendAttachment} format expected by the gateway `chat.send` RPC
 * (data-URI in `content`).
 */
export function formatAttachmentForGateway(attachment: ProviderAttachment): ChatSendAttachment {
  const mimeType = attachment.mimeType ?? 'application/octet-stream'
  const base64 = attachment.data ?? ''

  // If the data is already a data-URI, pass it through as-is.
  const content = base64.startsWith('data:') ? base64 : toDataUri(base64, mimeType)

  return {
    type: attachment.type,
    mimeType,
    content,
    fileName: attachment.name,
  }
}

/** A prompt image extracted by {@link detectAndLoadPromptImages}. */
export interface PromptImage {
  mimeType: string
  data: string // raw base64
  source: string // the original reference that was matched
}

/**
 * Scan a prompt string for inline image references (data-URIs) and return
 * structured {@link PromptImage} objects for each match.
 *
 * On the server side of the gateway the analogous function also resolves local
 * file-system paths respecting sandbox restrictions. This client-side version
 * only extracts data-URIs since the mobile client does not have arbitrary
 * file-system access.
 */
export function detectAndLoadPromptImages(text: string): PromptImage[] {
  if (!text) return []

  const images: PromptImage[] = []

  // Match data-URI patterns embedded in the text.
  const dataUriRegex = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g
  let match: RegExpExecArray | null
  while ((match = dataUriRegex.exec(text)) !== null) {
    const parsed = parseDataUri(match[0])
    if (parsed) {
      images.push({
        mimeType: parsed.mimeType,
        data: parsed.data,
        source: match[0],
      })
    }
  }

  return images
}
