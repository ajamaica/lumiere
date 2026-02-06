import { promises as fs } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

import { Network } from '../../../shared/types/config'
import { decrypt, encrypt } from './encryption'

/**
 * Stored credential structure
 */
export interface StoredCredentials {
  version: '1.0'
  agentIdentifier: string
  network: Network
  walletAddress: string
  walletVkey: string
  encryptedMnemonic: string
  apiKey?: string // Optional: Payment API key
  registryUrl?: string // Optional: Public registry URL
  createdAt: string
  updatedAt: string
}

/**
 * Get default credentials directory path
 */
function getCredentialsDir(): string {
  return join(homedir(), '.openclaw', 'credentials', 'cardano-wallet')
}

/**
 * Get credentials file path for an agent
 */
function getCredentialsPath(agentIdentifier: string, network: Network): string {
  const filename = `${agentIdentifier}_${network.toLowerCase()}.json`
  return join(getCredentialsDir(), filename)
}

/**
 * Ensure credentials directory exists with secure permissions
 */
async function ensureCredentialsDir(): Promise<void> {
  const dir = getCredentialsDir()

  try {
    await fs.access(dir)
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  }

  // Set secure permissions (read/write for owner only)
  await fs.chmod(dir, 0o700)
}

/**
 * Save credentials to encrypted file
 *
 * @param credentials - Credential data to save
 * @param mnemonic - Plaintext mnemonic (will be encrypted)
 * @returns Path to saved credentials file
 */
export async function saveCredentials(credentials: {
  agentIdentifier: string
  network: Network
  walletAddress: string
  walletVkey: string
  mnemonic: string
  apiKey?: string
  registryUrl?: string
}): Promise<string> {
  await ensureCredentialsDir()

  // Encrypt mnemonic
  const encryptedMnemonic = encrypt(credentials.mnemonic)

  const now = new Date().toISOString()

  const storedCreds: StoredCredentials = {
    version: '1.0',
    agentIdentifier: credentials.agentIdentifier,
    network: credentials.network,
    walletAddress: credentials.walletAddress,
    walletVkey: credentials.walletVkey,
    encryptedMnemonic,
    apiKey: credentials.apiKey,
    registryUrl: credentials.registryUrl,
    createdAt: now,
    updatedAt: now,
  }

  const filePath = getCredentialsPath(credentials.agentIdentifier, credentials.network)

  // Write file with secure permissions
  await fs.writeFile(filePath, JSON.stringify(storedCreds, null, 2), { mode: 0o600 })

  // Double-check permissions
  await fs.chmod(filePath, 0o600)

  return filePath
}

/**
 * Load credentials from encrypted file
 *
 * @param agentIdentifier - Agent identifier
 * @param network - Cardano network
 * @returns Decrypted credentials with plaintext mnemonic
 */
export async function loadCredentials(
  agentIdentifier: string,
  network: Network,
): Promise<StoredCredentials & { mnemonic: string }> {
  const filePath = getCredentialsPath(agentIdentifier, network)

  try {
    const fileContent = await fs.readFile(filePath, 'utf8')
    const storedCreds: StoredCredentials = JSON.parse(fileContent)

    // Decrypt mnemonic
    const mnemonic = decrypt(storedCreds.encryptedMnemonic)

    return {
      ...storedCreds,
      mnemonic,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Credentials not found for agent ${agentIdentifier} on ${network}. ` +
          `Expected path: ${filePath}`,
      )
    }
    throw error
  }
}

/**
 * Check if credentials exist for an agent
 *
 * @param agentIdentifier - Agent identifier
 * @param network - Cardano network
 * @returns true if credentials file exists
 */
export async function credentialsExist(
  agentIdentifier: string,
  network: Network,
): Promise<boolean> {
  const filePath = getCredentialsPath(agentIdentifier, network)

  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Update credentials (e.g., add API key after registration)
 *
 * @param agentIdentifier - Agent identifier
 * @param network - Cardano network
 * @param updates - Fields to update
 */
export async function updateCredentials(
  agentIdentifier: string,
  network: Network,
  updates: Partial<Pick<StoredCredentials, 'apiKey' | 'registryUrl'>>,
): Promise<void> {
  const creds = await loadCredentials(agentIdentifier, network)

  const updated: StoredCredentials = {
    ...creds,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  const filePath = getCredentialsPath(agentIdentifier, network)

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), { mode: 0o600 })
}

/**
 * Delete credentials file
 *
 * @param agentIdentifier - Agent identifier
 * @param network - Cardano network
 */
export async function deleteCredentials(agentIdentifier: string, network: Network): Promise<void> {
  const filePath = getCredentialsPath(agentIdentifier, network)

  try {
    await fs.unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    // File doesn't exist, nothing to delete
  }
}

/**
 * List all stored credentials
 *
 * @returns Array of {agentIdentifier, network} for all stored credentials
 */
export async function listAllCredentials(): Promise<
  Array<{ agentIdentifier: string; network: Network }>
> {
  const dir = getCredentialsDir()

  try {
    const files = await fs.readdir(dir)

    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const parts = file.replace('.json', '').split('_')
        const network = parts.pop() as Network
        const agentIdentifier = parts.join('_')

        return { agentIdentifier, network }
      })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Export credentials for backup (encrypted)
 *
 * @param agentIdentifier - Agent identifier
 * @param network - Cardano network
 * @returns JSON string of encrypted credentials
 */
export async function exportCredentials(
  agentIdentifier: string,
  network: Network,
): Promise<string> {
  const filePath = getCredentialsPath(agentIdentifier, network)
  const fileContent = await fs.readFile(filePath, 'utf8')

  return fileContent
}

/**
 * Import credentials from backup
 *
 * @param credentialsJson - JSON string from exportCredentials()
 * @returns Path to imported credentials file
 */
export async function importCredentials(credentialsJson: string): Promise<string> {
  await ensureCredentialsDir()

  const creds: StoredCredentials = JSON.parse(credentialsJson)
  const filePath = getCredentialsPath(creds.agentIdentifier, creds.network)

  await fs.writeFile(filePath, credentialsJson, { mode: 0o600 })
  await fs.chmod(filePath, 0o600)

  return filePath
}
