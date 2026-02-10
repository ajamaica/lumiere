import { Platform } from 'react-native'

import { logger } from '../utils/logger'

const TOKEN_PREFIX = 'server_token_'
const tokenLogger = logger.create('SecureToken')

/**
 * Store a server token securely in the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @param token - The authentication token
 */
export async function setServerToken(serverId: string, token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(`${TOKEN_PREFIX}${serverId}`, token)
    } catch (error) {
      tokenLogger.warn(`Failed to store token for server ${serverId}`, error)
    }
    return
  }

  const SecureStore = await import('expo-secure-store')
  await SecureStore.setItemAsync(`${TOKEN_PREFIX}${serverId}`, token, {
    requireAuthentication: false,
  })
}

/**
 * Retrieve a server token from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @returns The token or null if not found
 */
export async function getServerToken(serverId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(`${TOKEN_PREFIX}${serverId}`)
    } catch (error) {
      tokenLogger.warn(`Failed to retrieve token for server ${serverId}`, error)
      return null
    }
  }

  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(`${TOKEN_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    // If keychain access fails (e.g., "User interaction is not allowed"),
    // return null instead of throwing an error
    tokenLogger.warn(`Failed to retrieve token for server ${serverId}`, error)
    return null
  }
}

/**
 * Delete a server token from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 */
export async function deleteServerToken(serverId: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(`${TOKEN_PREFIX}${serverId}`)
    } catch (error) {
      tokenLogger.warn(`Failed to delete token for server ${serverId}`, error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    // If keychain deletion fails, log but don't throw
    tokenLogger.warn(`Failed to delete token for server ${serverId}`, error)
  }
}
