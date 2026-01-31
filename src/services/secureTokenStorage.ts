import * as SecureStore from 'expo-secure-store'

const TOKEN_PREFIX = 'server_token_'

/**
 * Store a server token securely in the keychain
 * @param serverId - The server's UUID
 * @param token - The authentication token
 */
export async function setServerToken(serverId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(`${TOKEN_PREFIX}${serverId}`, token)
}

/**
 * Retrieve a server token from the keychain
 * @param serverId - The server's UUID
 * @returns The token or null if not found
 */
export async function getServerToken(serverId: string): Promise<string | null> {
  return await SecureStore.getItemAsync(`${TOKEN_PREFIX}${serverId}`)
}

/**
 * Delete a server token from the keychain
 * @param serverId - The server's UUID
 */
export async function deleteServerToken(serverId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${serverId}`)
}
