import { ErrorCode } from '../types/index.js'

// Re-export ErrorCode for convenience
export { ErrorCode }

/**
 * Base error class for all Mamo errors
 */
export class MamoError extends Error {
  public readonly code: ErrorCode
  public readonly details?: unknown

  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN, details?: unknown) {
    super(message)
    this.name = 'MamoError'
    this.code = code
    this.details = details

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * Error for missing environment variables
 */
export class MissingEnvVarError extends MamoError {
  constructor(varName: string) {
    super(`Environment variable ${varName} is not set`, ErrorCode.MISSING_ENV_VAR, { varName })
    this.name = 'MissingEnvVarError'
  }
}

/**
 * Error for insufficient token balance
 */
export class InsufficientBalanceError extends MamoError {
  public readonly required: bigint
  public readonly available: bigint
  public readonly tokenSymbol: string

  constructor(tokenSymbol: string, required: bigint, available: bigint) {
    super(
      `Insufficient ${tokenSymbol} balance. Required: ${required.toString()}, Available: ${available.toString()}`,
      ErrorCode.INSUFFICIENT_BALANCE,
      { tokenSymbol, required: required.toString(), available: available.toString() },
    )
    this.name = 'InsufficientBalanceError'
    this.required = required
    this.available = available
    this.tokenSymbol = tokenSymbol
  }
}

/**
 * Error for insufficient ETH for gas
 */
export class InsufficientGasError extends MamoError {
  public readonly ethBalance: bigint

  constructor(ethBalance: bigint) {
    super(
      `Insufficient ETH for gas. Current balance: ${ethBalance.toString()}`,
      ErrorCode.INSUFFICIENT_GAS,
      { ethBalance: ethBalance.toString() },
    )
    this.name = 'InsufficientGasError'
    this.ethBalance = ethBalance
  }
}

/**
 * Error when no strategy is found for a token
 */
export class NoStrategyFoundError extends MamoError {
  public readonly tokenSymbol?: string

  constructor(message: string, tokenSymbol?: string) {
    super(message, ErrorCode.NO_STRATEGY_FOUND, { tokenSymbol })
    this.name = 'NoStrategyFoundError'
    this.tokenSymbol = tokenSymbol
  }
}

/**
 * Error when strategy already exists
 */
export class StrategyExistsError extends MamoError {
  public readonly strategyAddress: string

  constructor(strategyType: string, strategyAddress: string) {
    super(
      `Strategy ${strategyType} already exists at ${strategyAddress}`,
      ErrorCode.STRATEGY_EXISTS,
      { strategyType, strategyAddress },
    )
    this.name = 'StrategyExistsError'
    this.strategyAddress = strategyAddress
  }
}

/**
 * Error when user is not the owner of a strategy
 */
export class NotOwnerError extends MamoError {
  public readonly actualOwner: string

  constructor(strategyAddress: string, actualOwner: string) {
    super(
      `You are not the owner of strategy ${strategyAddress}. Owner: ${actualOwner}`,
      ErrorCode.NOT_OWNER,
      { strategyAddress, actualOwner },
    )
    this.name = 'NotOwnerError'
    this.actualOwner = actualOwner
  }
}

/**
 * Error for failed transactions
 */
export class TransactionFailedError extends MamoError {
  public readonly txHash: string

  constructor(txHash: string, reason?: string) {
    super(
      `Transaction reverted: ${txHash}${reason ? `. Reason: ${reason}` : ''}`,
      ErrorCode.TRANSACTION_FAILED,
      { txHash, reason },
    )
    this.name = 'TransactionFailedError'
    this.txHash = txHash
  }
}

/**
 * Error for API failures
 */
export class ApiError extends MamoError {
  public readonly statusCode?: number
  public readonly endpoint: string

  constructor(endpoint: string, message: string, statusCode?: number) {
    super(`API error for ${endpoint}: ${message}`, ErrorCode.API_ERROR, { endpoint, statusCode })
    this.name = 'ApiError'
    this.endpoint = endpoint
    this.statusCode = statusCode
  }
}

/**
 * Error for invalid arguments
 */
export class InvalidArgumentError extends MamoError {
  constructor(message: string) {
    super(message, ErrorCode.INVALID_ARGUMENT)
    this.name = 'InvalidArgumentError'
  }
}
