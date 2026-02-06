/**
 * Shopping Service Client
 *
 * Delegates payment operations to the centralized HeyBoss shopping service.
 * This approach keeps Stripe secret keys secure within HeyBoss infrastructure.
 *
 * Products are managed via HeyBoss dashboard, not local D1.
 */

const DEFAULT_SHOPPING_SERVICE_ENDPOINT = 'https://shopping.heybossai.com'

export interface CheckoutProduct {
  productId: string
  quantity?: number
}

export interface CheckoutRequest {
  products: CheckoutProduct[]
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResponse {
  checkoutUrl: string
  sessionId: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  status: string
  images: string | null
  billingType: string
  billingCycle?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseDetail {
  type: 'digital' | 'subscription'
  downloadUrl?: string
  expiresAt?: string
  status: string
  purchases?: Array<{
    id: string
    productId: string
    productName: string
  }>
}

export interface PurchasedProduct {
  productId: string
  purchaseDate: string
  name: string
  price: number
  currency: string
  status: string
  expiresAt?: string
  orderId?: string
}

export interface AccessCheckResult {
  hasAccess: boolean
  message: string
  product?: Product
}

/**
 * Create a Stripe Checkout session via the shopping service
 */
export async function createCheckoutSession(
  projectId: string,
  customerEmail: string,
  request: CheckoutRequest,
  options?: {
    endpoint?: string
    workerOrigin?: string
  },
): Promise<CheckoutResponse> {
  const endpoint = options?.endpoint || DEFAULT_SHOPPING_SERVICE_ENDPOINT

  const response = await fetch(`${endpoint}/api/payment/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-origin': options?.workerOrigin || '',
      'x-req-id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      projectId,
      customerEmail,
      products: request.products,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any).message || `Failed to create checkout session: HTTP ${response.status}`,
    )
  }

  return response.json()
}

/**
 * Get all products for a project from the shopping service
 */
export async function getProducts(
  projectId: string,
  options?: { endpoint?: string },
): Promise<Product[]> {
  const endpoint = options?.endpoint || DEFAULT_SHOPPING_SERVICE_ENDPOINT

  const response = await fetch(
    `${endpoint}/api/products?projectId=${encodeURIComponent(projectId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-req-id': crypto.randomUUID(),
      },
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as any).message || `Failed to fetch products: HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Get purchase details by Stripe session ID
 * Used after checkout success to verify payment and get download links
 */
export async function getPurchaseDetail(
  projectId: string,
  sessionId: string,
  options?: { endpoint?: string },
): Promise<PurchaseDetail> {
  const endpoint = options?.endpoint || DEFAULT_SHOPPING_SERVICE_ENDPOINT

  const response = await fetch(`${endpoint}/api/products/purchase-detail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-req-id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      projectId,
      sessionId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any).message || `Failed to get purchase detail: HTTP ${response.status}`,
    )
  }

  return response.json()
}

/**
 * Get all purchases for a user by email
 */
export async function getPurchasedProducts(
  projectId: string,
  email: string,
  options?: { endpoint?: string },
): Promise<PurchasedProduct[]> {
  const endpoint = options?.endpoint || DEFAULT_SHOPPING_SERVICE_ENDPOINT

  const response = await fetch(`${endpoint}/api/products/purchased`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-req-id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      projectId,
      email,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any).message || `Failed to get purchased products: HTTP ${response.status}`,
    )
  }

  return response.json()
}

/**
 * Check if a user has access to a specific product
 */
export async function checkProductAccess(
  projectId: string,
  email: string,
  productId: string,
  options?: { endpoint?: string },
): Promise<AccessCheckResult> {
  const endpoint = options?.endpoint || DEFAULT_SHOPPING_SERVICE_ENDPOINT

  const response = await fetch(`${endpoint}/api/products/check-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-req-id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      projectId,
      email,
      productId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as any).message || `Failed to check access: HTTP ${response.status}`)
  }

  return response.json()
}
