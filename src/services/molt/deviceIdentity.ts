/**
 * Device identity for the OpenClaw gateway handshake.
 *
 * Generates an Ed25519 keypair on first launch, persists it securely, and
 * provides helpers to build + sign the device auth payload required by the
 * gateway `connect` handshake (v2 protocol with nonce).
 *
 * Crypto: tweetnacl (pure-JS Ed25519)
 * Hashing: expo-crypto (SHA-256 for device ID derivation)
 * Storage: expo-secure-store (native) / localStorage (web)
 */

import * as Crypto from 'expo-crypto'
import { getRandomBytes } from 'expo-crypto'
import nacl from 'tweetnacl'

import { logger } from '../../utils/logger'
import { isWeb } from '../../utils/platform'

// ─── PRNG setup ──────────────────────────────────────────────────────────────
// React Native doesn't provide crypto.getRandomValues. Tell tweetnacl to
// use expo-crypto's secure random source instead.
nacl.setPRNG((x: Uint8Array, n: number) => {
  const randomBytes = getRandomBytes(n)
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i]
  }
})

const identityLogger = logger.create('DeviceIdentity')

const IDENTITY_STORAGE_KEY = 'openclaw_device_identity'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeviceIdentity {
  /** SHA-256 hex hash of the raw 32-byte public key. */
  deviceId: string
  /** Raw 32-byte Ed25519 public key. */
  publicKey: Uint8Array
  /** 64-byte Ed25519 secret key (private 32 + public 32). */
  secretKey: Uint8Array
}

export interface DeviceAuthPayload {
  id: string
  publicKey: string
  signature: string
  signedAt: number
  nonce?: string
}

interface StoredIdentity {
  version: 1
  deviceId: string
  /** Base64-encoded 32-byte public key. */
  publicKeyB64: string
  /** Base64-encoded 64-byte secret key. */
  secretKeyB64: string
}

// ─── Base64url helpers ────────────────────────────────────────────────────────

function base64UrlEncode(bytes: Uint8Array): string {
  // Convert Uint8Array → regular base64 string
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(binary)
  // Convert to base64url (no padding)
  return b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── SHA-256 hashing ──────────────────────────────────────────────────────────

async function sha256Hex(data: Uint8Array): Promise<string> {
  // expo-crypto's native module expects a standalone TypedArray, not a slice
  // or a view over a SharedArrayBuffer. Copy into a fresh Uint8Array.
  const copy = new Uint8Array(data)
  const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, copy)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Secure storage abstraction ───────────────────────────────────────────────

async function storeIdentity(stored: StoredIdentity): Promise<void> {
  const json = JSON.stringify(stored)

  if (isWeb) {
    try {
      localStorage.setItem(IDENTITY_STORAGE_KEY, json)
    } catch (error) {
      identityLogger.warn('Failed to store device identity (web)', error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(IDENTITY_STORAGE_KEY, json, {
      requireAuthentication: false,
    })
  } catch (error) {
    identityLogger.warn('Failed to store device identity (native)', error)
  }
}

async function loadStoredIdentity(): Promise<StoredIdentity | null> {
  let json: string | null = null

  if (isWeb) {
    try {
      json = localStorage.getItem(IDENTITY_STORAGE_KEY)
    } catch {
      return null
    }
  } else {
    try {
      const SecureStore = await import('expo-secure-store')
      json = await SecureStore.getItemAsync(IDENTITY_STORAGE_KEY, {
        requireAuthentication: false,
      })
    } catch {
      return null
    }
  }

  if (!json) return null

  try {
    const parsed = JSON.parse(json) as StoredIdentity
    if (
      parsed?.version === 1 &&
      typeof parsed.deviceId === 'string' &&
      typeof parsed.publicKeyB64 === 'string' &&
      typeof parsed.secretKeyB64 === 'string'
    ) {
      return parsed
    }
  } catch {
    // Corrupted data — will regenerate
  }

  return null
}

// ─── Identity lifecycle ───────────────────────────────────────────────────────

/** Cached identity so we only generate / load once per session. */
let cachedIdentity: DeviceIdentity | null = null

/**
 * Load or create the device Ed25519 identity. The keypair is persisted
 * in secure storage so subsequent launches reuse the same device ID.
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cachedIdentity) return cachedIdentity

  // Try loading from storage
  const stored = await loadStoredIdentity()
  if (stored) {
    const publicKey = base64Decode(stored.publicKeyB64)
    const secretKey = base64Decode(stored.secretKeyB64)

    // Verify the deviceId matches
    const derivedId = await sha256Hex(publicKey)
    const deviceId = derivedId === stored.deviceId ? stored.deviceId : derivedId

    cachedIdentity = { deviceId, publicKey, secretKey }
    identityLogger.info('Loaded device identity', { deviceId })
    return cachedIdentity
  }

  // Generate new keypair
  const keyPair = nacl.sign.keyPair()
  const deviceId = await sha256Hex(keyPair.publicKey)

  cachedIdentity = {
    deviceId,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  }

  // Persist
  await storeIdentity({
    version: 1,
    deviceId,
    publicKeyB64: base64Encode(keyPair.publicKey),
    secretKeyB64: base64Encode(keyPair.secretKey),
  })

  identityLogger.info('Generated new device identity', { deviceId })
  return cachedIdentity
}

// ─── Auth payload construction & signing ──────────────────────────────────────

/**
 * Build the pipe-delimited auth payload string (v2 format with nonce).
 *
 * Format: `v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce`
 */
export function buildDeviceAuthPayload(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token?: string
  nonce?: string
}): string {
  const version = params.nonce ? 'v2' : 'v1'
  const scopes = params.scopes.join(',')
  const token = params.token ?? ''
  const base = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
  ]
  if (version === 'v2') {
    base.push(params.nonce ?? '')
  }
  return base.join('|')
}

/**
 * Sign a UTF-8 payload string with the device's Ed25519 secret key.
 * Returns the detached signature as a base64url string (no padding).
 */
export function signPayload(secretKey: Uint8Array, payload: string): string {
  const messageBytes = new TextEncoder().encode(payload)
  const signature = nacl.sign.detached(messageBytes, secretKey)
  return base64UrlEncode(signature)
}

/**
 * Build the full signed device object for the gateway `connect` request.
 *
 * When `nonce` is provided the payload uses the v2 format (with challenge).
 * When omitted it falls back to v1 (no challenge / no nonce).
 */
export async function buildSignedDevice(params: {
  identity: DeviceIdentity
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  token?: string
  nonce?: string
}): Promise<DeviceAuthPayload> {
  const signedAt = Date.now()

  const payload = buildDeviceAuthPayload({
    deviceId: params.identity.deviceId,
    clientId: params.clientId,
    clientMode: params.clientMode,
    role: params.role,
    scopes: params.scopes,
    signedAtMs: signedAt,
    token: params.token,
    nonce: params.nonce,
  })

  const signature = signPayload(params.identity.secretKey, payload)

  const device: DeviceAuthPayload = {
    id: params.identity.deviceId,
    publicKey: base64UrlEncode(params.identity.publicKey),
    signature,
    signedAt,
  }

  if (params.nonce) {
    device.nonce = params.nonce
  }

  return device
}
