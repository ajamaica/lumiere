import { z } from 'zod'

/**
 * Payment state according to Masumi protocol
 */
export const PaymentStateSchema = z.enum([
  'WaitingForExternalAction',
  'FundsLocked',
  'SubmitResultRequested',
  'AuthorizeRefundRequested',
  'Withdrawn',
  'RefundWithdrawn',
  'Disputed',
  'FundsOrDatumInvalid',
  'ResultSubmitted',
  'DisputedWithdrawn',
])

export type PaymentState = z.infer<typeof PaymentStateSchema>

/**
 * Next action for payment
 */
export const PaymentActionSchema = z.enum([
  'None',
  'Ignore',
  'WaitingForManualAction',
  'WaitingForExternalAction',
  'SubmitResultRequested',
  'SubmitResultInitiated',
  'WithdrawRequested',
  'WithdrawInitiated',
  'AuthorizeRefundRequested',
  'AuthorizeRefundInitiated',
])

export type PaymentAction = z.infer<typeof PaymentActionSchema>

/**
 * Payment amount
 */
export interface PaymentAmount {
  amount: string
  unit: string
}

/**
 * Payment request/response structure
 */
export interface PaymentRequest {
  id: string
  blockchainIdentifier: string
  agentIdentifier: string
  identifierFromPurchaser: string
  inputHash?: string
  payByTime: string // Unix timestamp (milliseconds)
  submitResultTime: string
  unlockTime: string
  externalDisputeUnlockTime: string
  requestedFunds?: PaymentAmount[]
  onChainState: PaymentState | null
  NextAction: {
    requestedAction: PaymentAction
    errorType: string | null
    errorNote: string | null
    resultHash: string | null
  }
  resultHash?: string | null
  metadata?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Parameters for creating a payment request
 */
export interface CreatePaymentParams {
  identifierFromPurchaser: string
  inputData?: Record<string, unknown>
  payByTime?: Date
  submitResultTime?: Date
  metadata?: string
}

/**
 * Payment status change event
 */
export interface PaymentStateChangeEvent {
  blockchainIdentifier: string
  previousState: PaymentState | null
  newState: PaymentState | null
  payment: PaymentRequest
}

/**
 * Wallet balance response
 */
export interface WalletBalance {
  ada: string
  tokens: Record<string, string>
}

/**
 * Payment list response
 */
export interface PaymentListResponse {
  payments: PaymentRequest[]
  nextCursorId?: string
}
