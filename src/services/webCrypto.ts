/**
 * Web Crypto utilities for password-based encryption.
 * Uses PBKDF2 for key derivation and AES-GCM for symmetric encryption.
 * Web-only — relies on the SubtleCrypto API available in all modern browsers.
 */

const PBKDF2_ITERATIONS = 600_000
const KEY_LENGTH = 256
const SALT_LENGTH = 16 // bytes
const IV_LENGTH = 12 // bytes (96-bit, recommended for AES-GCM)
const VERIFICATION_PLAINTEXT = 'lumiere-password-verification-v1'

// localStorage keys
const STORAGE_PREFIX = 'lumiere_secure_'
const SALT_KEY = `${STORAGE_PREFIX}salt`
const VERIFICATION_KEY = `${STORAGE_PREFIX}verification`

// ─── Helpers ───────────────────────────────────────────────

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── Key derivation ────────────────────────────────────────

async function importPasswordKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encode(password) as BufferSource, 'PBKDF2', false, [
    'deriveKey',
  ])
}

async function deriveAESKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ─── Encrypt / Decrypt ─────────────────────────────────────

/**
 * Encrypt arbitrary text. Returns a base64 string that contains the IV + ciphertext.
 */
async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = randomBytes(IV_LENGTH)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encode(plaintext) as BufferSource,
  )
  // Concatenate IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return toBase64(combined)
}

/**
 * Decrypt a base64 string produced by `encrypt`. Returns the original plaintext.
 * Throws on wrong password / corrupted data.
 */
async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const combined = fromBase64(encoded)
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return decode(plaintext)
}

// ─── Salt management ───────────────────────────────────────

function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY)
  if (stored) return fromBase64(stored)
  const salt = randomBytes(SALT_LENGTH)
  localStorage.setItem(SALT_KEY, toBase64(salt))
  return salt
}

function getSalt(): Uint8Array | null {
  const stored = localStorage.getItem(SALT_KEY)
  return stored ? fromBase64(stored) : null
}

// ─── Public API ────────────────────────────────────────────

/**
 * Returns true if a password has been set up before (i.e. verification data exists).
 */
export function isPasswordConfigured(): boolean {
  return localStorage.getItem(VERIFICATION_KEY) !== null
}

/**
 * Create a new password. Stores salt + encrypted verification string in localStorage.
 * Call this only during first-time setup.
 */
export async function setupPassword(password: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt()
  const key = await deriveAESKey(password, salt)
  const verificationCipher = await encrypt(VERIFICATION_PLAINTEXT, key)
  localStorage.setItem(VERIFICATION_KEY, verificationCipher)
  return key
}

/**
 * Verify a password against the stored verification data.
 * Returns the derived CryptoKey on success, or null on failure.
 */
export async function verifyPassword(password: string): Promise<CryptoKey | null> {
  const salt = getSalt()
  if (!salt) return null
  const verificationCipher = localStorage.getItem(VERIFICATION_KEY)
  if (!verificationCipher) return null

  try {
    const key = await deriveAESKey(password, salt)
    const decrypted = await decrypt(verificationCipher, key)
    if (decrypted === VERIFICATION_PLAINTEXT) return key
    return null
  } catch {
    // Decryption failure means wrong password
    return null
  }
}

/**
 * Encrypt a JSON-serialisable value and store it in localStorage.
 */
export async function encryptAndStore(
  storageKey: string,
  value: unknown,
  key: CryptoKey,
): Promise<void> {
  const json = JSON.stringify(value)
  const cipher = await encrypt(json, key)
  localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, cipher)
}

/**
 * Load and decrypt a value from localStorage.
 * Returns the parsed value, or `defaultValue` if the key doesn't exist.
 */
export async function loadAndDecrypt<T>(
  storageKey: string,
  key: CryptoKey,
  defaultValue: T,
): Promise<T> {
  const cipher = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
  if (!cipher) return defaultValue

  try {
    const json = await decrypt(cipher, key)
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

/**
 * Remove an encrypted value from localStorage.
 */
export function removeEncrypted(storageKey: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`)
}
