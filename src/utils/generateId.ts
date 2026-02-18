/**
 * Generates a unique ID for messages and other entities.
 *
 * Uses crypto.randomUUID() when available (React Native 0.80+),
 * with a fallback that uses crypto.getRandomValues() for
 * cryptographically secure randomness.
 */
export function generateId(prefix: string = 'id'): string {
  // Try crypto.randomUUID first (available in modern RN)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  // Fallback: use crypto.getRandomValues (CSPRNG, not Math.random)
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `${prefix}-${hex}`
}
