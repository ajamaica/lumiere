// Main exports
export { MonarchClient } from './client/MonarchClient'

// Types
export * from './types'

// Authentication
export type { LoginOptions, MFAOptions } from './client/auth'
export { AuthenticationService, SessionStorage } from './client/auth'

// GraphQL
export type { GraphQLRequestOptions } from './client/graphql'
export { GraphQLClient } from './client/graphql'

// Optimization utilities for MCP and other integrations
export { getQueryForVerbosity } from './client/graphql/operations'
export { ResponseFormatter, type VerbosityLevel } from './client/ResponseFormatter'

// Cache
export { MemoryCache, MultiLevelCache, PersistentCache } from './cache'

// API modules
export type { AccountsAPI } from './api/accounts'
export type { BudgetsAPI } from './api/budgets'
export type { TransactionsAPI } from './api/transactions'

// Utilities
export { EncryptionService } from './utils/encryption'
export {
  handleGraphQLErrors,
  handleHTTPResponse,
  isRetryableError,
  MonarchAPIError,
  MonarchAuthError,
  MonarchConfigError,
  MonarchError,
  MonarchGraphQLError,
  MonarchMFARequiredError,
  MonarchNetworkError,
  MonarchRateLimitError,
  MonarchSessionExpiredError,
  MonarchValidationError,
  retryWithBackoff,
} from './utils/errors'
export { createLogger, logger } from './utils/logger'

// Default export
import { MonarchClient as Client } from './client/MonarchClient'
export default Client
