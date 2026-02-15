import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Instance, MobileUser, SubscriptionStatus } from './mobileTypes'
import { storage } from './storage'

/** Authenticated mobile user (persisted across restarts) */
export const mobileUserAtom = atomWithStorage<MobileUser | null>('mobileUser', null, storage)

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
export const instanceAtom = atomWithStorage<Instance | null>('mobileInstance', null, storage)

/** Whether the mobile session token is loaded and valid (transient) */
export const mobileAuthenticatedAtom = atom(false)
