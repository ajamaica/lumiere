import { logger } from '../utils/logger'
import { isWeb } from '../utils/platform'

const TOKEN_PREFIX = 'server_token_'
const PASSWORD_PREFIX = 'server_password_'
const tokenLogger = logger.create('SecureToken')

/**
 * Store a server token securely in the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @param token - The authentication token
 */
export async function setServerToken(serverId: string, token: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(`${TOKEN_PREFIX}${serverId}`, token)
    } catch (error) {
      tokenLogger.warn(`Failed to store token for server ${serverId}`, error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(`${TOKEN_PREFIX}${serverId}`, token, {
      requireAuthentication: false,
    })
  } catch (error) {
    // If keychain storage fails, log but don't throw
    tokenLogger.warn(`Failed to store token for server ${serverId}`, error)
  }
}

/**
 * Retrieve a server token from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @returns The token or null if not found
 */
export async function getServerToken(serverId: string): Promise<string | null> {
  if (isWeb) {
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
 * Store a server gateway password securely in the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @param password - The gateway password
 */
export async function setServerPassword(serverId: string, password: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(`${PASSWORD_PREFIX}${serverId}`, password)
    } catch (error) {
      tokenLogger.warn(`Failed to store password for server ${serverId}`, error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(`${PASSWORD_PREFIX}${serverId}`, password, {
      requireAuthentication: false,
    })
  } catch (error) {
    tokenLogger.warn(`Failed to store password for server ${serverId}`, error)
  }
}

/**
 * Retrieve a server gateway password from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 * @returns The password or null if not found
 */
export async function getServerPassword(serverId: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(`${PASSWORD_PREFIX}${serverId}`)
    } catch (error) {
      tokenLogger.warn(`Failed to retrieve password for server ${serverId}`, error)
      return null
    }
  }

  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(`${PASSWORD_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    tokenLogger.warn(`Failed to retrieve password for server ${serverId}`, error)
    return null
  }
}

/**
 * Delete a server gateway password from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 */
export async function deleteServerPassword(serverId: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(`${PASSWORD_PREFIX}${serverId}`)
    } catch (error) {
      tokenLogger.warn(`Failed to delete password for server ${serverId}`, error)
    }
    return
  }

  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(`${PASSWORD_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    tokenLogger.warn(`Failed to delete password for server ${serverId}`, error)
  }
}

/**
 * Delete a server token from the keychain (native) or localStorage (web)
 * @param serverId - The server's UUID
 */
export async function deleteServerToken(serverId: string): Promise<void> {
  if (isWeb) {
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
