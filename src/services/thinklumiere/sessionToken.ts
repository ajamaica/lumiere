import { logger } from '../../utils/logger'
import { isWeb } from '../../utils/platform'

const SESSION_TOKEN_KEY = 'lumiere_session_token'
const log = logger.create('ThinkLumiereSession')

/**
 * Store the ThinkLumiere API session token securely.
 * Native: Expo SecureStore (Keychain/Keystore)
 * Web: encrypted via Web Crypto (AES-GCM) when a crypto key is available,
 *      falls back to localStorage if no password is configured.
 */
export async function setSessionToken(token: string): Promise<void> {
  if (isWeb) {
    try {
      const { getSessionCryptoKey } = await import('../../store/secureAtom')
      const { encryptAndStore } = await import('../webCrypto')
      const key = await getSessionCryptoKey()
      if (key) {
        await encryptAndStore(SESSION_TOKEN_KEY, token, key)
      } else {
        localStorage.setItem(SESSION_TOKEN_KEY, token)
      }
    } catch (error) {
      log.warn('Failed to store session token', error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to store session token in keychain', error)
  }
}

/**
 * Retrieve the ThinkLumiere API session token.
 * @returns The token or null if not found
 */
export async function getSessionToken(): Promise<string | null> {
  if (isWeb) {
    try {
      const { getSessionCryptoKey } = await import('../../store/secureAtom')
      const { loadAndDecrypt } = await import('../webCrypto')
      const key = await getSessionCryptoKey()
      if (key) {
        return await loadAndDecrypt<string | null>(SESSION_TOKEN_KEY, key, null)
      }
      return localStorage.getItem(SESSION_TOKEN_KEY)
    } catch (error) {
      log.warn('Failed to retrieve session token', error)
      return null
    }
  }

  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to retrieve session token from keychain', error)
    return null
  }
}

/**
 * Delete the ThinkLumiere API session token.
 */
export async function deleteSessionToken(): Promise<void> {
  if (isWeb) {
    try {
      const { removeEncrypted } = await import('../webCrypto')
      removeEncrypted(SESSION_TOKEN_KEY)
      // Also remove plaintext fallback if it exists
      localStorage.removeItem(SESSION_TOKEN_KEY)
    } catch (error) {
      log.warn('Failed to delete session token', error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to delete session token from keychain', error)
  }
}
