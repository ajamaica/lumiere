import * as SecureStore from 'expo-secure-store'

const TOKEN_PREFIX = 'server_token_'

/**
 * Store a server token securely in the keychain
 * @param serverId - The server's UUID
 * @param token - The authentication token
 */
export async function setServerToken(serverId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(`${TOKEN_PREFIX}${serverId}`, token, {
    requireAuthentication: false,
  })
}

/**
 * Retrieve a server token from the keychain
 * @param serverId - The server's UUID
 * @returns The token or null if not found
 */
export async function getServerToken(serverId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${TOKEN_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    // If keychain access fails (e.g., "User interaction is not allowed"),
    // return null instead of throwing an error
    console.warn(`Failed to retrieve token for server ${serverId}:`, error)
    return null
  }
}

/**
 * Delete a server token from the keychain
 * @param serverId - The server's UUID
 */
export async function deleteServerToken(serverId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${serverId}`, {
      requireAuthentication: false,
    })
  } catch (error) {
    // If keychain deletion fails, log but don't throw
    console.warn(`Failed to delete token for server ${serverId}:`, error)
  }
}
