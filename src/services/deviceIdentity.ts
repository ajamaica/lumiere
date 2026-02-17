/**
 * Device Identity — Ed25519 keypair for OpenClaw gateway authentication.
 *
 * The OpenClaw gateway uses a challenge-response handshake:
 * 1. Server sends a `connect.challenge` event with a `nonce`.
 * 2. Client builds a pipe-delimited payload:
 *    `v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce`
 * 3. Client signs the payload with its Ed25519 private key.
 * 4. Server verifies the signature using the stored public key.
 *
 * Device ID = SHA-256(raw 32-byte Ed25519 public key), hex-encoded.
 * Public key and signatures are base64url-encoded on the wire.
 *
 * The private key is persisted in expo-secure-store (native) or localStorage (web)
 * and generated once per device using expo-crypto random bytes.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — @noble/curves v2 uses .js exports; TS resolution can't find the types
import { ed25519 } from '@noble/curves/ed25519.js'
import * as ExpoCrypto from 'expo-crypto'

import { logger } from '../utils/logger'
import { isWeb } from '../utils/platform'

const DEVICE_PRIVATE_KEY = 'lumiere_device_ed25519_key'
const deviceLogger = logger.create('DeviceIdentity')

// ─── Secure storage (platform-aware) ─────────────────────────────────────────

async function secureGet(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(key, { requireAuthentication: false })
  } catch {
    return null
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      deviceLogger.warn(`Failed to store ${key}`, error)
    }
    return
  }
  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(key, value, { requireAuthentication: false })
  } catch (error) {
    deviceLogger.warn(`Failed to store ${key}`, error)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ─── Ed25519 Device Keypair ──────────────────────────────────────────────────

/**
 * Get or create a persistent Ed25519 private key.
 * Uses expo-crypto for random byte generation, stored as hex in secure storage.
 */
async function getOrCreatePrivateKey(): Promise<Uint8Array> {
  const stored = await secureGet(DEVICE_PRIVATE_KEY)
  if (stored) {
    return hexToBytes(stored)
  }

  // Generate 32 random bytes using expo-crypto (native crypto)
  const privateKey = ExpoCrypto.getRandomBytes(32)
  await secureSet(DEVICE_PRIVATE_KEY, bytesToHex(privateKey))
  return privateKey
}

/**
 * Get the raw Ed25519 public key (32 bytes).
 */
async function getRawPublicKey(): Promise<Uint8Array> {
  const privateKey = await getOrCreatePrivateKey()
  return ed25519.getPublicKey(privateKey)
}

/**
 * Get the device's Ed25519 public key as a base64url-encoded string (32 bytes).
 */
export async function getDevicePublicKey(): Promise<string> {
  return bytesToBase64url(await getRawPublicKey())
}

/**
 * Get the device ID as SHA-256(raw_public_key_bytes) hex string.
 * Matches server-side deriveDeviceIdFromPublicKey().
 */
export async function getDeviceId(): Promise<string> {
  const publicKeyBytes = await getRawPublicKey()
  // expo-crypto native expects a TypedArray, not an ArrayBuffer
  const hash = await ExpoCrypto.digest(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    new Uint8Array(publicKeyBytes) as unknown as ArrayBuffer,
  )
  return bytesToHex(new Uint8Array(hash))
}

/**
 * Sign a payload string with the device's Ed25519 private key.
 * Returns a base64url-encoded signature (64 bytes).
 *
 * The payload should be a pipe-delimited string built by buildDeviceAuthPayload().
 */
export async function signPayload(payload: string): Promise<string> {
  const privateKey = await getOrCreatePrivateKey()
  const message = new TextEncoder().encode(payload)
  const signature = ed25519.sign(message, privateKey)
  return bytesToBase64url(signature)
}
