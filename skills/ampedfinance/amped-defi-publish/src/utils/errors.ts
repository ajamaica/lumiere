/**
 * Error Handling Utilities
 *
 * Provides standardized error handling, error codes, and user-friendly error messages
 * for all Amped DeFi operations.
 */

/**
 * Standard error codes for Amped DeFi operations
 */
export enum ErrorCode {
  // Policy errors
  POLICY_SLIPPAGE_EXCEEDED = 'POLICY_SLIPPAGE_EXCEEDED',
  POLICY_SPEND_LIMIT_EXCEEDED = 'POLICY_SPEND_LIMIT_EXCEEDED',
  POLICY_CHAIN_NOT_ALLOWED = 'POLICY_CHAIN_NOT_ALLOWED',
  POLICY_TOKEN_NOT_ALLOWED = 'POLICY_TOKEN_NOT_ALLOWED',
  POLICY_RECIPIENT_BLOCKED = 'POLICY_RECIPIENT_BLOCKED',

  // Wallet errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_INVALID_ADDRESS = 'WALLET_INVALID_ADDRESS',
  WALLET_MISSING_PRIVATE_KEY = 'WALLET_MISSING_PRIVATE_KEY',
  WALLET_RESOLUTION_FAILED = 'WALLET_RESOLUTION_FAILED',

  // Chain/Provider errors
  CHAIN_NOT_SUPPORTED = 'CHAIN_NOT_SUPPORTED',
  RPC_URL_NOT_CONFIGURED = 'RPC_URL_NOT_CONFIGURED',
  PROVIDER_CREATION_FAILED = 'PROVIDER_CREATION_FAILED',
  SONIC_PROVIDER_REQUIRED = 'SONIC_PROVIDER_REQUIRED',

  // Token errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  TOKEN_NOT_SUPPORTED = 'TOKEN_NOT_SUPPORTED',
  TOKEN_DECIMALS_NOT_FOUND = 'TOKEN_DECIMALS_NOT_FOUND',

  // Operation errors
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  QUOTE_NOT_FOUND = 'QUOTE_NOT_FOUND',
  BRIDGE_NOT_AVAILABLE = 'BRIDGE_NOT_AVAILABLE',
  SWAP_EXECUTION_FAILED = 'SWAP_EXECUTION_FAILED',
  BRIDGE_EXECUTION_FAILED = 'BRIDGE_EXECUTION_FAILED',
  MM_HEALTH_FACTOR_LOW = 'MM_HEALTH_FACTOR_LOW',
  MM_CROSS_CHAIN_NOT_SUPPORTED = 'MM_CROSS_CHAIN_NOT_SUPPORTED',
  MM_INSUFFICIENT_COLLATERAL = 'MM_INSUFFICIENT_COLLATERAL',
  MM_POSITION_NOT_FOUND = 'MM_POSITION_NOT_FOUND',

  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_SIMULATION_FAILED = 'TRANSACTION_SIMULATION_FAILED',

  // SDK/Configuration errors
  SDK_NOT_INITIALIZED = 'SDK_NOT_INITIALIZED',
  SDK_INITIALIZATION_FAILED = 'SDK_INITIALIZATION_FAILED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',

  // Unknown/Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Structured error information
 */
export interface AmpedError {
  code: ErrorCode
  message: string
  severity: ErrorSeverity
  remediation?: string
  details?: Record<string, unknown>
  cause?: Error
}

/**
 * Error context for logging
 */
export interface ErrorContext {
  operation?: string
  walletId?: string
  chainId?: string
  chainIds?: string[]
  token?: string
  tokens?: string[]
  amount?: string
  requestId?: string
  txHash?: string
  [key: string]: unknown
}

/**
 * Amped DeFi Error class
 */
export class AmpedDefiError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly remediation?: string
  public readonly details?: Record<string, unknown>
  public readonly context?: ErrorContext

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      severity?: ErrorSeverity
      remediation?: string
      details?: Record<string, unknown>
      context?: ErrorContext
      cause?: Error
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'AmpedDefiError'
    this.code = code
    this.severity = options?.severity || ErrorSeverity.ERROR
    this.remediation = options?.remediation
    this.details = options?.details
    this.context = options?.context

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AmpedDefiError)
    }
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): AmpedError {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      remediation: this.remediation,
      details: this.details,
    }
  }

  /**
   * Get user-friendly error message
   */
  toUserMessage(): string {
    let msg = `[${this.code}] ${this.message}`
    if (this.remediation) {
      msg += `\n\nSuggestion: ${this.remediation}`
    }
    return msg
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a policy error
 */
export function createPolicyError(
  code: ErrorCode,
  message: string,
  details?: { current?: unknown; limit?: unknown; [key: string]: unknown },
  context?: ErrorContext,
): AmpedDefiError {
  const remediation = getPolicyRemediation(code, details)
  return new AmpedDefiError(code, message, {
    severity: ErrorSeverity.WARNING,
    remediation,
    details,
    context,
  })
}

/**
 * Create a wallet error
 */
export function createWalletError(
  code: ErrorCode,
  walletId: string,
  cause?: Error,
  context?: ErrorContext,
): AmpedDefiError {
  const message = getWalletErrorMessage(code, walletId)
  return new AmpedDefiError(code, message, {
    severity: ErrorSeverity.ERROR,
    remediation: getWalletRemediation(code),
    context: { ...context, walletId },
    cause,
  })
}

/**
 * Create a transaction error
 */
export function createTransactionError(
  code: ErrorCode,
  message: string,
  txHash?: string,
  cause?: Error,
  context?: ErrorContext,
): AmpedDefiError {
  return new AmpedDefiError(code, message, {
    severity: ErrorSeverity.ERROR,
    remediation: getTransactionRemediation(code),
    details: txHash ? { txHash } : undefined,
    context: txHash ? { ...context, txHash } : context,
    cause,
  })
}

/**
 * Create an SDK error
 */
export function createSDKError(
  code: ErrorCode,
  message: string,
  cause?: Error,
  context?: ErrorContext,
): AmpedDefiError {
  return new AmpedDefiError(code, message, {
    severity: ErrorSeverity.CRITICAL,
    remediation:
      'Please check your configuration and try again. If the issue persists, contact support.',
    context,
    cause,
  })
}

/**
 * Wrap an unknown error into an AmpedDefiError
 */
export function wrapError(
  error: unknown,
  fallbackCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  context?: ErrorContext,
): AmpedDefiError {
  if (error instanceof AmpedDefiError) {
    return error
  }

  if (error instanceof Error) {
    // Try to infer error code from message
    const code = inferErrorCode(error.message) || fallbackCode
    return new AmpedDefiError(code, error.message, {
      severity: ErrorSeverity.ERROR,
      context,
      cause: error,
    })
  }

  return new AmpedDefiError(fallbackCode, String(error), {
    severity: ErrorSeverity.ERROR,
    context,
  })
}

// ============================================================================
// Remediation Helpers
// ============================================================================

function getPolicyRemediation(code: ErrorCode, details?: Record<string, unknown>): string {
  switch (code) {
    case ErrorCode.POLICY_SLIPPAGE_EXCEEDED:
      return `Slippage ${details?.current} bps exceeds limit of ${details?.limit} bps. Increase maxSlippageBps in your policy configuration or wait for better market conditions.`
    case ErrorCode.POLICY_SPEND_LIMIT_EXCEEDED:
      return `Reduce the operation amount or request a policy limit increase. Current limit: ${details?.limit}`
    case ErrorCode.POLICY_CHAIN_NOT_ALLOWED:
      return `Add the chain to your allowedChains policy configuration or use a different chain.`
    case ErrorCode.POLICY_TOKEN_NOT_ALLOWED:
      return `Add the token to your allowedTokensByChain policy configuration or use a different token.`
    case ErrorCode.POLICY_RECIPIENT_BLOCKED:
      return `Use a different recipient address. This address has been blocked by policy.`
    default:
      return 'Review your policy configuration or contact your administrator.'
  }
}

function getWalletRemediation(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.WALLET_NOT_FOUND:
      return 'Check your AMPED_OC_WALLETS_JSON configuration and ensure the walletId is correct.'
    case ErrorCode.WALLET_INVALID_ADDRESS:
      return 'Verify the wallet address format (should be 0x-prefixed Ethereum address).'
    case ErrorCode.WALLET_MISSING_PRIVATE_KEY:
      return 'Add the private key to your wallet configuration for execute mode, or switch to prepare mode.'
    default:
      return 'Check your wallet configuration and try again.'
  }
}

function getTransactionRemediation(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.TRANSACTION_FAILED:
      return 'Check the transaction on a block explorer for revert reasons. You may need to adjust parameters or try again later.'
    case ErrorCode.TRANSACTION_TIMEOUT:
      return 'The operation timed out. You can check the status later using the transaction hash.'
    case ErrorCode.TRANSACTION_REJECTED:
      return 'The transaction was rejected. This may be due to network congestion or insufficient gas.'
    case ErrorCode.TRANSACTION_SIMULATION_FAILED:
      return 'The transaction would fail if executed. Check your balances, allowances, and parameters.'
    default:
      return 'Try again or contact support if the issue persists.'
  }
}

function getWalletErrorMessage(code: ErrorCode, walletId: string): string {
  switch (code) {
    case ErrorCode.WALLET_NOT_FOUND:
      return `Wallet not found: ${walletId}`
    case ErrorCode.WALLET_INVALID_ADDRESS:
      return `Wallet ${walletId} has an invalid address`
    case ErrorCode.WALLET_MISSING_PRIVATE_KEY:
      return `Wallet ${walletId} is missing private key (required in execute mode)`
    default:
      return `Wallet error for ${walletId}`
  }
}

function inferErrorCode(message: string): ErrorCode | null {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('insufficient balance')) return ErrorCode.INSUFFICIENT_BALANCE
  if (lowerMsg.includes('allowance')) return ErrorCode.INSUFFICIENT_ALLOWANCE
  if (lowerMsg.includes('slippage')) return ErrorCode.POLICY_SLIPPAGE_EXCEEDED
  if (lowerMsg.includes('health factor')) return ErrorCode.MM_HEALTH_FACTOR_LOW
  if (lowerMsg.includes('timeout')) return ErrorCode.TRANSACTION_TIMEOUT
  if (lowerMsg.includes('rejected')) return ErrorCode.TRANSACTION_REJECTED
  if (lowerMsg.includes('simulation')) return ErrorCode.TRANSACTION_SIMULATION_FAILED
  if (lowerMsg.includes('not initialized')) return ErrorCode.SDK_NOT_INITIALIZED
  if (lowerMsg.includes('bridge') && lowerMsg.includes('not')) return ErrorCode.BRIDGE_NOT_AVAILABLE
  if (lowerMsg.includes('quote') && lowerMsg.includes('expir')) return ErrorCode.QUOTE_EXPIRED

  return null
}

// ============================================================================
// Logging and Observability
// ============================================================================

/**
 * Log an error with structured context
 */
export function logError(error: AmpedDefiError | Error, context?: ErrorContext): void {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    component: 'amped-defi',
    level: error instanceof AmpedDefiError ? error.severity : 'error',
    code: error instanceof AmpedDefiError ? error.code : ErrorCode.UNKNOWN_ERROR,
    message: error.message,
    context,
    stack: error.stack,
    cause: error.cause,
  }

  // Log as JSON for structured logging systems
  console.error(JSON.stringify(structuredLog, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: AmpedDefiError | Error): boolean {
  if (error instanceof AmpedDefiError) {
    const retryableCodes = [
      ErrorCode.TRANSACTION_TIMEOUT,
      ErrorCode.RPC_URL_NOT_CONFIGURED,
      ErrorCode.SDK_NOT_INITIALIZED,
      ErrorCode.UNKNOWN_ERROR,
    ]
    return retryableCodes.includes(error.code)
  }

  // For generic errors, check message patterns
  const lowerMsg = error.message.toLowerCase()
  return (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('connection') ||
    lowerMsg.includes('rate limit')
  )
}

/**
 * Get retry delay in milliseconds with exponential backoff
 */
export function getRetryDelay(attempt: number, baseDelay = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Cap at 30 seconds
}
