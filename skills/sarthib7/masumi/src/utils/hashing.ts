import canonicaljson from 'canonicaljson'
import { createHash } from 'crypto'

/**
 * Create input hash according to MIP-004 specification
 *
 * Uses JCS (RFC 8785) canonical JSON serialization for deterministic hashing
 *
 * @param inputData - The input data object to hash
 * @param identifierFromPurchaser - The purchaser's identifier
 * @returns SHA-256 hash in hexadecimal format
 */
export function createMasumiInputHash(
  inputData: Record<string, unknown>,
  identifierFromPurchaser: string,
): string {
  // Step 1: Serialize input data using JCS (canonical JSON)
  const canonicalJson = canonicaljson.stringify(inputData)

  // Step 2: Create pre-image: identifier;canonical_json
  const preImage = `${identifierFromPurchaser};${canonicalJson}`

  // Step 3: SHA-256 hash
  return createHash('sha256').update(preImage, 'utf8').digest('hex')
}

/**
 * Create output hash according to MIP-004 specification
 *
 * Uses JSON string escaping for output data
 *
 * @param outputData - The output data string to hash
 * @param identifierFromPurchaser - The purchaser's identifier
 * @returns SHA-256 hash in hexadecimal format
 */
export function createMasumiOutputHash(
  outputData: string,
  identifierFromPurchaser: string,
): string {
  // Step 1: Escape output string using JSON encoding
  // Remove quotes from JSON.stringify result
  const escapedOutput = JSON.stringify(outputData).slice(1, -1)

  // Step 2: Create pre-image: identifier;escaped_output
  const preImage = `${identifierFromPurchaser};${escapedOutput}`

  // Step 3: SHA-256 hash
  return createHash('sha256').update(preImage, 'utf8').digest('hex')
}

/**
 * Generate a random hex identifier (for purchaser IDs)
 *
 * @param length - Length of the identifier in characters (default: 26)
 * @returns Random hexadecimal identifier
 */
export function generateRandomIdentifier(length: number = 26): string {
  const bytes = Math.ceil(length / 2)
  const randomBytes = createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')

  return randomBytes.slice(0, length)
}
