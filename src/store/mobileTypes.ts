// ─── Mobile API types ───────────────────────────────────

export interface MobileUser {
  userId: string
  email: string
  name: string
  picture: string
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean
  productId: string | null
  expiresDate: number | null
  originalTransactionId: string | null
}

export type InstanceStatus = 'deploying' | 'running' | 'stopped' | 'error' | 'starting'

export interface Instance {
  instanceId: string
  name: string
  status: InstanceStatus
  url: string
  token: string
}

// ─── API response types ─────────────────────────────────

export interface AuthResponse {
  user_id: string
  email: string
  name: string
  picture: string
  session_token: string
}

export interface SubscriptionResponse {
  has_active_subscription: boolean
  product_id: string | null
  expires_date: number | null
  original_transaction_id: string | null
}

export interface InstanceResponse {
  instance_id: string
  name: string
  status: InstanceStatus
  url: string
  token: string
}

export interface MobileApiError {
  detail: string
}
