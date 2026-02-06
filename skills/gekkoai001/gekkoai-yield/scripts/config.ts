import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import {
  type Account,
  type Address,
  createPublicClient,
  createWalletClient,
  fallback,
  type Hex,
  http,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

// Moonwell Flagship USDC Vault on Base
export const VAULT_ADDRESS = '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca' as Address
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address
export const USDC_DECIMALS = 6

// Transaction settings
export const TX_TIMEOUT_MS = 120_000 // 2 minutes
export const TX_CONFIRMATIONS = 1
export const API_RATE_LIMIT_MS = 300
export const POST_TX_DELAY_MS = 1000
export const RPC_RETRY_ATTEMPTS = 3
export const RPC_RETRY_DELAY_MS = 2000 // Start with 2s delay

// Alternative RPC endpoints for Base (fallback if main RPC is rate limited)
export const BASE_RPC_ENDPOINTS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
  'https://base.gateway.tenderly.co',
]

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

// ERC4626 Vault ABI
export const VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

export interface Config {
  wallet: {
    source: 'env'
    envVar: string
  }
  rpc: string
}

export interface Preferences {
  reportFrequency: 'daily' | 'weekly'
  compoundThreshold: number // USD value to trigger compound
  autoCompound: boolean
  rebalanceThreshold: number
  minVaultAllocation: number
}

const PREFERENCES_FILE = join(expandPath('~/.config/gekko-yield'), 'preferences.json')

export function loadPreferences(): Preferences {
  if (!existsSync(PREFERENCES_FILE)) {
    return {
      reportFrequency: 'weekly',
      compoundThreshold: 0.5,
      autoCompound: true,
      rebalanceThreshold: 0.1,
      minVaultAllocation: 0.05,
    }
  }
  return JSON.parse(readFileSync(PREFERENCES_FILE, 'utf-8')) as Preferences
}

export function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return join(process.env.HOME || process.env.USERPROFILE || '', p.slice(2))
  }
  return p
}

/**
 * Unified error handler
 */
export function handleError(err: unknown, context: string): never {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`❌ ${context}: ${message}`)
  process.exit(1)
}

/**
 * Sleep helper
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Rate-limited fetch wrapper
 */
let lastApiCall = 0
export async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastApiCall
  if (elapsed < API_RATE_LIMIT_MS) {
    await sleep(API_RATE_LIMIT_MS - elapsed)
  }
  lastApiCall = Date.now()
  return fetch(url, options)
}

/**
 * Log a transaction for audit trail
 */
export function logTransaction(
  type: 'deposit' | 'withdraw' | 'approve' | 'compound',
  hash: string,
  details: Record<string, unknown>,
): void {
  const logDir = expandPath('~/.config/gekko-yield/logs')
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }

  const entry = {
    timestamp: new Date().toISOString(),
    type,
    hash,
    ...details,
  }

  const logPath = join(logDir, `${new Date().toISOString().slice(0, 7)}.jsonl`)
  appendFileSync(logPath, JSON.stringify(entry) + '\n')
}

/**
 * Get last compound transaction from logs
 */
export function getLastCompound(): { timestamp: string; hash: string; deposited: string } | null {
  const logDir = expandPath('~/.config/gekko-yield/logs')
  if (!existsSync(logDir)) {
    return null
  }

  // Check current month and previous month logs
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)

  const logFiles = [join(logDir, `${currentMonth}.jsonl`), join(logDir, `${prevMonth}.jsonl`)]

  let lastCompound: { timestamp: string; hash: string; deposited: string } | null = null

  for (const logFile of logFiles) {
    if (!existsSync(logFile)) continue

    try {
      const content = readFileSync(logFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      // Read backwards to find most recent compound
      for (let i = lines.length - 1; i >= 0; i--) {
        const entry = JSON.parse(lines[i])
        if (entry.type === 'compound') {
          lastCompound = {
            timestamp: entry.timestamp,
            hash: entry.hash,
            deposited: entry.deposited || '0',
          }
          break
        }
      }

      if (lastCompound) break
    } catch {
      // Skip corrupted log files
      continue
    }
  }

  return lastCompound
}

/**
 * Get total reinvested from all compound transactions
 */
export function getTotalReinvested(): number {
  const logDir = expandPath('~/.config/gekko-yield/logs')
  if (!existsSync(logDir)) {
    return 0
  }

  // Check last 3 months of logs
  const now = new Date()
  const months: string[] = []
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toISOString().slice(0, 7))
  }

  let total = 0

  for (const month of months) {
    const logFile = join(logDir, `${month}.jsonl`)
    if (!existsSync(logFile)) continue

    try {
      const content = readFileSync(logFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      for (const line of lines) {
        const entry = JSON.parse(line)
        if (entry.type === 'compound' && entry.deposited) {
          const deposited = BigInt(entry.deposited)
          total += Number(deposited) / 1e6 // Convert from wei to USDC
        }
      }
    } catch {
      continue
    }
  }

  return total
}

/**
 * Calculate next check date based on report frequency
 */
export function getNextCheckDate(frequency: 'daily' | 'weekly'): string {
  const now = new Date()

  if (frequency === 'daily') {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
  } else {
    // Weekly - next Monday (or today if it's Monday)
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let daysUntilMonday: number

    if (currentDay === 0) {
      // Sunday - next Monday is tomorrow
      daysUntilMonday = 1
    } else if (currentDay === 1) {
      // Monday - next check is next Monday (7 days)
      daysUntilMonday = 7
    } else {
      // Tuesday-Saturday - days until next Monday
      daysUntilMonday = 8 - currentDay
    }

    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    return nextMonday.toLocaleDateString('en-US', { weekday: 'long' })
  }
}

/**
 * Load config
 */
export function loadConfig(): Config {
  const configPath = expandPath('~/.config/gekko-yield/config.json')

  if (!existsSync(configPath)) {
    console.error('❌ Config not found at ~/.config/gekko-yield/config.json')
    console.error('   Run: npx tsx setup.ts')
    process.exit(1)
  }

  return JSON.parse(readFileSync(configPath, 'utf-8')) as Config
}

/**
 * Get private key from environment variable
 */
export function getPrivateKey(config: Config): Hex {
  const envVar = config.wallet.envVar || 'PRIVATE_KEY'
  const key = process.env[envVar]

  if (!key) {
    console.error(`❌ Environment variable ${envVar} not set`)
    console.error(`   Set it with: $env:${envVar}="your-private-key"`)
    process.exit(1)
  }

  return (key.startsWith('0x') ? key : `0x${key}`) as Hex
}

/**
 * Verify contracts are what we expect
 */
export async function verifyContracts(publicClient: PublicClient): Promise<void> {
  const asset = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'asset',
  })

  if (asset.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Vault asset mismatch! Expected USDC, got ${asset}`)
  }

  const decimals = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  if (decimals !== 6) {
    throw new Error(`USDC decimals mismatch! Expected 6, got ${decimals}`)
  }
}

/**
 * Wait for transaction with timeout
 */
export async function waitForTransaction(
  publicClient: PublicClient,
  hash: Hex,
  timeoutMs: number = TX_TIMEOUT_MS,
): Promise<TransactionReceipt> {
  const receiptPromise = publicClient.waitForTransactionReceipt({
    hash,
    confirmations: TX_CONFIRMATIONS,
  })

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Transaction timeout after ${timeoutMs / 1000}s`)),
      timeoutMs,
    ),
  )

  const receipt = await Promise.race([receiptPromise, timeoutPromise])
  await sleep(POST_TX_DELAY_MS)

  return receipt
}

/**
 * Get fresh nonce
 */
export async function getFreshNonce(publicClient: PublicClient, address: Address): Promise<number> {
  return publicClient.getTransactionCount({
    address,
    blockTag: 'pending',
  })
}

/**
 * Simulate and execute contract call with retry logic
 */
export async function simulateAndWrite<TAbi extends readonly unknown[]>(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: {
    address: Address
    abi: TAbi
    functionName: string
    args: readonly unknown[]
    account: Account
    gasMultiplier?: number
  },
): Promise<Hex> {
  const gasMultiplier = params.gasMultiplier ?? 1.5

  // Add delay before simulation to avoid rate limits
  await sleep(500)

  // Simulate first with retry logic
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= RPC_RETRY_ATTEMPTS; attempt++) {
    try {
      await publicClient.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account: params.account,
      } as any)
      break // Success, exit retry loop
    } catch (simError) {
      lastError = simError instanceof Error ? simError : new Error(String(simError))

      // Check if it's a rate limit error
      const isRateLimit =
        (simError as any)?.status === 429 ||
        (simError as any)?.code === -32016 ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('429')

      if (attempt < RPC_RETRY_ATTEMPTS && isRateLimit) {
        const delay = RPC_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(
          `   ⚠️  Rate limited, retrying in ${delay / 1000}s... (attempt ${attempt}/${RPC_RETRY_ATTEMPTS})`,
        )
        await sleep(delay)
        continue
      }

      // If not rate limit or last attempt, throw
      throw new Error(`Simulation failed: ${lastError.message}`)
    }
  }

  // Small delay before gas estimation
  await sleep(300)

  const nonce = await getFreshNonce(publicClient, params.account.address)

  // Estimate gas with retry
  let gasEstimate: bigint
  for (let attempt = 1; attempt <= RPC_RETRY_ATTEMPTS; attempt++) {
    try {
      gasEstimate = await publicClient.estimateContractGas({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account: params.account,
      } as any)
      break
    } catch (gasError) {
      const isRateLimit =
        (gasError as any)?.status === 429 ||
        (gasError as any)?.code === -32016 ||
        String(gasError).includes('rate limit')

      if (attempt < RPC_RETRY_ATTEMPTS && isRateLimit) {
        const delay = RPC_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        await sleep(delay)
        continue
      }
      throw gasError
    }
  }

  const gasWithBuffer = BigInt(Math.ceil(Number(gasEstimate!) * gasMultiplier))

  return walletClient.writeContract({
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    gas: gasWithBuffer,
    nonce,
  } as any)
}

/**
 * Create HTTP transport with retry logic for rate limits
 */
function createRetryTransport(rpcUrl: string) {
  // Create transports for all endpoints, starting with user's preferred one
  const endpoints = [rpcUrl, ...BASE_RPC_ENDPOINTS.filter((url) => url !== rpcUrl)]

  const transports = endpoints.map((url) =>
    http(url, {
      retryCount: RPC_RETRY_ATTEMPTS,
      fetchOptions: {
        signal: AbortSignal.timeout(TX_TIMEOUT_MS),
      },
    }),
  )

  // Use fallback to try endpoints in order
  return fallback(transports, {
    retryCount: RPC_RETRY_ATTEMPTS,
  })
}

/**
 * Get clients with retry logic
 */
export function getClients(config: Config) {
  const privateKey = getPrivateKey(config)
  const account = privateKeyToAccount(privateKey)
  const rpcUrl = config.rpc || 'https://mainnet.base.org'

  const transport = createRetryTransport(rpcUrl)

  const publicClient = createPublicClient({
    chain: base,
    transport,
  })

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport,
  })

  return { publicClient, walletClient, account }
}

export function formatUSDC(amount: bigint): string {
  const num = Number(amount) / 1e6
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

export function parseUSDC(amount: string): bigint {
  const cleaned = amount.replace(/,/g, '')
  const [whole, decimal = ''] = cleaned.split('.')
  const paddedDecimal = decimal.padEnd(6, '0').slice(0, 6)
  const combined = whole + paddedDecimal
  const normalized = combined.replace(/^0+/, '') || '0'
  return BigInt(normalized)
}

export function isValidUSDCAmount(amount: string): boolean {
  return /^[\d,]+(\.\d{0,6})?$/.test(amount.trim())
}

/**
 * Fetch current vault APY from Morpho API
 */
export async function fetchVaultAPY(): Promise<number> {
  try {
    const response = await rateLimitedFetch('https://blue-api.morpho.org/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          vaultByAddress(address: "${VAULT_ADDRESS.toLowerCase()}", chainId: 8453) {
            state { netApy }
          }
        }`,
      }),
    })

    const data = (await response.json()) as {
      data?: { vaultByAddress?: { state?: { netApy?: number } } }
    }

    const apy = data?.data?.vaultByAddress?.state?.netApy
    return typeof apy === 'number' ? apy * 100 : 0
  } catch {
    return 0
  }
}

/**
 * Verify allowance
 */
export async function verifyAllowance(
  publicClient: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
  requiredAmount: bigint,
  maxRetries: number = 10,
  retryDelayMs: number = 500,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    })

    if (allowance >= requiredAmount) {
      return true
    }

    if (i < maxRetries - 1) {
      await sleep(retryDelayMs)
    }
  }

  return false
}

/**
 * Approve and verify
 */
export async function approveAndVerify(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Account,
  token: Address,
  spender: Address,
  amount: bigint,
  tokenSymbol: string = 'token',
): Promise<Hex> {
  const approveHash = await simulateAndWrite(publicClient, walletClient, {
    address: token,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
    account,
  })

  await waitForTransaction(publicClient, approveHash)

  logTransaction('approve', approveHash, {
    token: tokenSymbol,
    spender,
    amount: amount.toString(),
  })

  const verified = await verifyAllowance(publicClient, token, account.address, spender, amount)

  if (!verified) {
    throw new Error(`Allowance verification failed for ${tokenSymbol}`)
  }

  return approveHash
}
