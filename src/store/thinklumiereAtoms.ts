import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'
import type { Instance, SubscriptionStatus, ThinkLumiereUser } from './thinklumiereTypes'

/** Authenticated ThinkLumiere user (persisted across restarts) */
export const thinklumiereUserAtom = atomWithStorage<ThinkLumiereUser | null>(
  'thinklumiereUser',
  null,
  storage,
)

/** Subscription status (persisted across restarts) */
export const subscriptionStatusAtom = atomWithStorage<SubscriptionStatus>(
  'subscriptionStatus',
  {
    hasActiveSubscription: false,
    productId: null,
    expiresDate: null,
    originalTransactionId: null,
  },
  storage,
)

/** User's server instance (persisted across restarts) */
export const instanceAtom = atomWithStorage<Instance | null>(
  'thinklumiereInstance',
  null,
  storage,
)

/** Whether the ThinkLumiere session token is loaded and valid (transient) */
export const thinklumiereAuthenticatedAtom = atom(false)
