/**
 * Password-protected Jotai atom for web.
 *
 * Creates an atom backed by AES-GCM encrypted localStorage.
 * The encryption key is derived from the user's password via PBKDF2
 * and kept only in sessionStorage (cleared when the tab closes).
 *
 * On native platforms this module is never imported — the regular
 * AsyncStorage-backed atoms are used instead.
 */

import { atom, type WritableAtom } from 'jotai'

import { encryptAndStore, loadAndDecrypt } from '../services/webCrypto'
import type { ServersDict } from './types'

// ─── Session key holder ────────────────────────────────────

const SESSION_KEY_NAME = 'lumiere_session_crypto_key'

/**
 * In-memory cache of the CryptoKey for the current session.
 * We also persist a serialised copy in sessionStorage so that
 * a full-page reload inside the same tab doesn't lose it.
 */
let _cachedKey: CryptoKey | null = null

export async function setSessionCryptoKey(key: CryptoKey): Promise<void> {
  _cachedKey = key
  // Export the key as JWK so we can stash it in sessionStorage
  const exported = await crypto.subtle.exportKey('jwk', key)
  sessionStorage.setItem(SESSION_KEY_NAME, JSON.stringify(exported))
}

export async function getSessionCryptoKey(): Promise<CryptoKey | null> {
  if (_cachedKey) return _cachedKey

  const stored = sessionStorage.getItem(SESSION_KEY_NAME)
  if (!stored) return null

  try {
    const jwk = JSON.parse(stored) as JsonWebKey
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ])
    _cachedKey = key
    return key
  } catch {
    sessionStorage.removeItem(SESSION_KEY_NAME)
    return null
  }
}

export function hasSessionCryptoKey(): boolean {
  return _cachedKey !== null || sessionStorage.getItem(SESSION_KEY_NAME) !== null
}

export function clearSessionCryptoKey(): void {
  _cachedKey = null
  sessionStorage.removeItem(SESSION_KEY_NAME)
}

// ─── Encrypted servers atom ────────────────────────────────

const SECURE_SERVERS_STORAGE_KEY = 'servers_encrypted'

/**
 * In-memory atom that holds the decrypted servers dictionary.
 * Writing to this atom also persists the value encrypted in localStorage.
 */
export const secureServersAtom = atom<ServersDict>({})

/**
 * Whether the secure store has been hydrated from encrypted localStorage.
 */
export const secureStoreHydratedAtom = atom<boolean>(false)

/**
 * Load encrypted servers from localStorage into the atom.
 * Call this right after the user enters the correct password.
 */
export async function hydrateSecureServers(
  store: {
    get: (a: typeof secureServersAtom) => ServersDict
    set: <V>(a: WritableAtom<V, [V], void>, v: V) => void
  },
  key: CryptoKey,
): Promise<ServersDict> {
  // Try to load previously-encrypted data from localStorage.
  // Pass `null` as default so we can distinguish "nothing stored" from "empty dict".
  const loaded = await loadAndDecrypt<ServersDict | null>(SECURE_SERVERS_STORAGE_KEY, key, null)

  if (loaded !== null) {
    // Encrypted data exists — restore it into the atom.
    store.set(secureServersAtom, loaded)
  } else {
    // No encrypted data yet (first setup after onboarding).
    // The atom may already contain servers added during onboarding —
    // persist them now so they survive a page reload.
    const current = store.get(secureServersAtom)
    if (Object.keys(current).length > 0) {
      await encryptAndStore(SECURE_SERVERS_STORAGE_KEY, current, key)
    }
  }

  store.set(secureStoreHydratedAtom, true)
  return store.get(secureServersAtom)
}

/**
 * Persist the current value of secureServersAtom to encrypted localStorage.
 */
export async function persistSecureServers(servers: ServersDict): Promise<void> {
  const key = await getSessionCryptoKey()
  if (!key) return
  await encryptAndStore(SECURE_SERVERS_STORAGE_KEY, servers, key)
}
