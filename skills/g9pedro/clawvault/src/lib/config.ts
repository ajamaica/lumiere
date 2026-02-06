import * as path from 'path'

/**
 * Get the vault path from CLAWVAULT_PATH env var or throw
 */
export function getVaultPath(): string {
  const vaultPath = process.env.CLAWVAULT_PATH
  if (!vaultPath) {
    throw new Error('CLAWVAULT_PATH environment variable not set')
  }
  return path.resolve(vaultPath)
}
