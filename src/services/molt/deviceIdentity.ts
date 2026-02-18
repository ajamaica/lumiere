/**
 * Device Identity for OpenClaw Gateway handshake.
 *
 * Generates and persists an Ed25519 keypair per device.
 * The device ID is the SHA-256 hex digest of the raw 32-byte public key.
 * Challenge payloads are signed with the private key for server verification.
 *
 * All heavy imports (`@noble/curves`, `expo-crypto`) are lazy-loaded via
 * dynamic `require()` inside async functions so this module can be imported
 * at the top level without crashing on startup.
 * Persistence is handled via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { logger } from '../../utils/logger'

const identityLogger = logger.create('DeviceIdentity')

const STORAGE_KEY = 'openclaw_device_identity'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DeviceIdentity {
  deviceId: string
  publicKeyBase64Url: string
  /** Raw 32-byte Ed25519 private key, base64-encoded. */
  privateKeyBase64: string
}

export interface DevicePayload {
  id: string
  publicKey: string
  signature: string
  signedAt: number
  nonce?: string
}

// ─── Encoding helpers ───────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
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

function base64UrlEncode(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Lazy crypto loaders ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ed25519: any = null
function getEd25519() {
  if (!_ed25519) {
    // Lazy require so the ESM module is only resolved when actually needed
    // (during handshake), not at app startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _ed25519 = require('@noble/curves/ed25519').ed25519
  }
  return _ed25519
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _Crypto: any = null
function getCrypto() {
  if (!_Crypto) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _Crypto = require('expo-crypto')
  }
  return _Crypto
}

// ─── Identity lifecycle ─────────────────────────────────────────────────────────

let _cached: DeviceIdentity | null = null

/**
 * Load or create the device's Ed25519 identity.
 *
 * On first call the keypair is generated and persisted to AsyncStorage.
 * Subsequent calls return the cached identity.
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (_cached) return _cached

  // Try loading from storage
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as {
        version?: number
        deviceId?: string
        publicKeyBase64Url?: string
        privateKeyBase64?: string
      }
      if (
        parsed.version === 1 &&
        parsed.deviceId &&
        parsed.publicKeyBase64Url &&
        parsed.privateKeyBase64
      ) {
        _cached = {
          deviceId: parsed.deviceId,
          publicKeyBase64Url: parsed.publicKeyBase64Url,
          privateKeyBase64: parsed.privateKeyBase64,
        }
        identityLogger.info('Device identity loaded from storage')
        return _cached
      }
    }
  } catch {
    identityLogger.error('Failed to load device identity, regenerating')
  }

  // Generate a fresh Ed25519 keypair (lazy-loaded)
  const ed = getEd25519()
  const Crypto = getCrypto()

  const privateKey = new Uint8Array(Crypto.getRandomBytes(32))
  const publicKey = ed.getPublicKey(privateKey) as Uint8Array

  // SHA-256 the raw public key hex to derive the device ID
  const deviceId: string = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytesToHex(publicKey),
    { encoding: Crypto.CryptoEncoding.HEX },
  )
  const publicKeyBase64Url = base64UrlEncode(publicKey)
  const privateKeyBase64 = toBase64(privateKey)

  const identity: DeviceIdentity = { deviceId, publicKeyBase64Url, privateKeyBase64 }
  _cached = identity

  // Persist
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        deviceId,
        publicKeyBase64Url,
        privateKeyBase64,
        createdAtMs: Date.now(),
      }),
    )
    identityLogger.info('Device identity generated and persisted')
  } catch {
    identityLogger.error('Failed to persist device identity')
  }

  return identity
}

// ─── Challenge signing ──────────────────────────────────────────────────────────

/**
 * Build the signed device payload for the `connect` request.
 *
 * The signature covers a pipe-delimited string:
 *   v1: `v1|deviceId|clientId|clientMode|role|scopes|signedAtMs|token`
 *   v2: `v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce`
 *
 * Version is `v2` when a challenge nonce is present, `v1` otherwise.
 */
export async function buildDevicePayload(
  clientId: string,
  clientMode: string,
  role: string,
  scopes: string[],
  token: string,
  nonce?: string,
): Promise<DevicePayload> {
  const identity = await getDeviceIdentity()
  const ed = getEd25519()
  const privateKey = fromBase64(identity.privateKeyBase64)
  const signedAtMs = Date.now()

  const version = nonce ? 'v2' : 'v1'
  const parts = [
    version,
    identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes.join(','),
    String(signedAtMs),
    token || '',
  ]
  if (version === 'v2') {
    parts.push(nonce || '')
  }

  const payload = parts.join('|')
  const messageBytes = new TextEncoder().encode(payload)
  const signatureBytes = ed.sign(messageBytes, privateKey) as Uint8Array

  return {
    id: identity.deviceId,
    publicKey: identity.publicKeyBase64Url,
    signature: base64UrlEncode(signatureBytes),
    signedAt: signedAtMs,
    ...(nonce ? { nonce } : {}),
  }
}
