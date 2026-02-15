import { logger } from '../../utils/logger'
import { isWeb } from '../../utils/platform'

const SESSION_TOKEN_KEY = 'lumiere_session_token'
const log = logger.create('MobileSession')

/**
 * Store the mobile API session token securely.
 * Native: Expo SecureStore (Keychain/Keystore)
 * Web: localStorage (fallback)
 */
export async function setSessionToken(token: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, token)
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
 * Retrieve the mobile API session token.
 * @returns The token or null if not found
 */
export async function getSessionToken(): Promise<string | null> {
  if (isWeb) {
    try {
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
 * Delete the mobile API session token.
 */
export async function deleteSessionToken(): Promise<void> {
  if (isWeb) {
    try {
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
