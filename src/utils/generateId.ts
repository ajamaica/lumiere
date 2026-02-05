/**
 * Generates a unique ID for messages and other entities.
 *
 * Uses crypto.randomUUID() when available (React Native 0.80+),
 * with a fallback for older environments that combines timestamp
 * with random characters to avoid collision.
 */
export function generateId(prefix: string = 'id'): string {
  // Try crypto.randomUUID first (available in modern RN)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  // Fallback: timestamp + random suffix
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  const extraRandom = Math.random().toString(36).substring(2, 6)

  return `${prefix}-${timestamp}-${randomPart}${extraRandom}`
}
