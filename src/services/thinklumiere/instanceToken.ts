import { logger } from '../../utils/logger'
import { isWeb } from '../../utils/platform'

const INSTANCE_TOKEN_KEY = 'lumiere_instance_token'
const log = logger.create('InstanceToken')

/**
 * Store the instance token securely.
 * Native: Expo SecureStore (Keychain/Keystore)
 * Web: encrypted via Web Crypto (AES-GCM) when a crypto key is available,
 *      falls back to localStorage if no password is configured.
 */
export async function setInstanceToken(token: string): Promise<void> {
  if (isWeb) {
    try {
      const { getSessionCryptoKey } = await import('../../store/secureAtom')
      const { encryptAndStore } = await import('../webCrypto')
      const key = await getSessionCryptoKey()
      if (key) {
        await encryptAndStore(INSTANCE_TOKEN_KEY, token, key)
      } else {
        localStorage.setItem(INSTANCE_TOKEN_KEY, token)
      }
    } catch (error) {
      log.warn('Failed to store instance token', error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(INSTANCE_TOKEN_KEY, token, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to store instance token in keychain', error)
  }
}

/**
 * Retrieve the instance token.
 * @returns The token or null if not found
 */
export async function getInstanceToken(): Promise<string | null> {
  if (isWeb) {
    try {
      const { getSessionCryptoKey } = await import('../../store/secureAtom')
      const { loadAndDecrypt } = await import('../webCrypto')
      const key = await getSessionCryptoKey()
      if (key) {
        return await loadAndDecrypt<string | null>(INSTANCE_TOKEN_KEY, key, null)
      }
      return localStorage.getItem(INSTANCE_TOKEN_KEY)
    } catch (error) {
      log.warn('Failed to retrieve instance token', error)
      return null
    }
  }

  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(INSTANCE_TOKEN_KEY, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to retrieve instance token from keychain', error)
    return null
  }
}

/**
 * Delete the instance token.
 */
export async function deleteInstanceToken(): Promise<void> {
  if (isWeb) {
    try {
      const { removeEncrypted } = await import('../webCrypto')
      removeEncrypted(INSTANCE_TOKEN_KEY)
      // Also remove plaintext fallback if it exists
      localStorage.removeItem(INSTANCE_TOKEN_KEY)
    } catch (error) {
      log.warn('Failed to delete instance token', error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(INSTANCE_TOKEN_KEY, {
      requireAuthentication: false,
    })
  } catch (error) {
    log.warn('Failed to delete instance token from keychain', error)
  }
}
