import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Encryption configuration
 */
const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from password
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

/**
 * Get encryption key from environment or generate default
 * WARNING: In production, always use a secure key from environment variables
 */
function getEncryptionKey(): string {
  const key = process.env.MASUMI_ENCRYPTION_KEY

  if (!key) {
    console.warn(
      'WARNING: MASUMI_ENCRYPTION_KEY not set! Using default key. ' +
        'This is INSECURE for production. Set MASUMI_ENCRYPTION_KEY in your environment.',
    )
    return 'default-encryption-key-change-me-in-production'
  }

  return key
}

/**
 * Encrypt data using AES-256-GCM
 *
 * Format: salt(32) + iv(16) + tag(16) + encrypted_data
 *
 * @param plaintext - Data to encrypt
 * @returns Base64-encoded encrypted data with salt, iv, and auth tag
 */
export function encrypt(plaintext: string): string {
  const password = getEncryptionKey()

  // Generate salt and IV
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)

  // Derive key
  const key = deriveKey(password, salt)

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Get auth tag
  const tag = cipher.getAuthTag()

  // Combine: salt + iv + tag + encrypted_data
  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')])

  return combined.toString('base64')
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or authentication tag is invalid
 */
export function decrypt(encryptedData: string): string {
  const password = getEncryptionKey()

  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // Derive key
  const key = deriveKey(password, salt)

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // Decrypt
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if encryption key is set and secure
 */
export function isEncryptionKeySecure(): boolean {
  const key = process.env.MASUMI_ENCRYPTION_KEY

  if (!key) {
    return false
  }

  // Check minimum length
  if (key.length < 32) {
    console.warn('WARNING: MASUMI_ENCRYPTION_KEY is too short (< 32 characters)')
    return false
  }

  // Check if it's the default key
  if (key.includes('default') || key.includes('change-me')) {
    console.warn('WARNING: MASUMI_ENCRYPTION_KEY appears to be a default value')
    return false
  }

  return true
}

/**
 * Generate a random encryption key (for initial setup)
 *
 * @returns A cryptographically secure random key (hex-encoded)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}
