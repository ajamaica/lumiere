import { useAtom } from 'jotai'
import { useCallback, useState } from 'react'

import { mobileApi, MobileApiRequestError } from '../services/mobile/api'
import { subscriptionStatusAtom } from '../store/mobileAtoms'
import type { SubscriptionStatus } from '../store/mobileTypes'
import { logger } from '../utils/logger'

const log = logger.create('useSubscription')

export interface UseSubscriptionResult {
  /** Current subscription status */
  subscription: SubscriptionStatus
  /** Whether a subscription operation is in progress */
  loading: boolean
  /** Last error from a subscription operation */
  error: string | null
  /** Verify an Apple subscription with the backend (call after StoreKit purchase + on launch) */
  verifyAppleSubscription: (
    params: { transactionId: string } | { receiptData: string },
  ) => Promise<SubscriptionStatus>
  /** Check subscription status from the backend (lightweight, no Apple re-verification) */
  checkStatus: () => Promise<SubscriptionStatus>
}

function mapSubscriptionResponse(response: {
  has_active_subscription: boolean
  product_id: string | null
  expires_date: number | null
  original_transaction_id: string | null
}): SubscriptionStatus {
  return {
    hasActiveSubscription: response.has_active_subscription,
    productId: response.product_id,
    expiresDate: response.expires_date,
    originalTransactionId: response.original_transaction_id,
  }
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useAtom(subscriptionStatusAtom)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyAppleSubscription = useCallback(
    async (
      params: { transactionId: string } | { receiptData: string },
    ): Promise<SubscriptionStatus> => {
      setLoading(true)
      setError(null)

      try {
        const response = await mobileApi.verifyAppleSubscription(params)
        const status = mapSubscriptionResponse(response)
        setSubscription(status)
        log.info('Subscription verified', { active: status.hasActiveSubscription })
        return status
      } catch (err) {
        const message =
          err instanceof MobileApiRequestError
            ? err.message
            : 'Failed to verify subscription. Please try again.'
        setError(message)
        log.logError('Subscription verification failed', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setSubscription],
  )

  const checkStatus = useCallback(async (): Promise<SubscriptionStatus> => {
    setLoading(true)
    setError(null)

    try {
      const response = await mobileApi.getSubscriptionStatus()
      const status = mapSubscriptionResponse(response)
      setSubscription(status)
      log.debug('Subscription status checked', { active: status.hasActiveSubscription })
      return status
    } catch (err) {
      const message =
        err instanceof MobileApiRequestError ? err.message : 'Failed to check subscription status.'
      setError(message)
      log.logError('Subscription status check failed', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setSubscription])

  return {
    subscription,
    loading,
    error,
    verifyAppleSubscription,
    checkStatus,
  }
}
