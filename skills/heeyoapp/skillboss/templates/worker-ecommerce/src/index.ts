/**
 * E-commerce Worker Template (v2 - Shopping Service Pattern)
 *
 * This Worker delegates payment processing to the HeyBoss shopping service.
 * Products are managed via HeyBoss dashboard, not local D1.
 *
 * API Endpoints:
 * - GET  /api/products                    - List products from shopping service
 * - POST /api/create-checkout-session     - Create Stripe checkout (via shopping service)
 * - GET  /api/products/purchase-detail    - Get purchase details by session ID
 * - GET  /api/purchased-products          - Get user's purchase history
 * - GET  /api/products/:productId/check-access - Check if user has access
 *
 * Authentication:
 * - Uses @hey-boss/users-service for user authentication
 * - Admin bypass: Users with email matching USER_EMAIL env var skip purchase checks
 */

import {
  authMiddleware,
  deleteSession,
  exchangeCodeForSessionToken,
  getCurrentUser,
  getOAuthRedirectUrl,
  sendOTP,
  SESSION_TOKEN_COOKIE_NAME,
  verifyOTP,
} from '@hey-boss/users-service/backend'
import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { cors } from 'hono/cors'

import {
  checkProductAccess,
  createCheckoutSession,
  getProducts,
  getPurchaseDetail,
  getPurchasedProducts,
} from '../lib/shopping-client'

// Environment bindings type
interface Env {
  PROJECT_ID: string
  USER_EMAIL?: string // Admin email for bypass
  SHOPPING_SERVICE_ENDPOINT?: string // Optional override
}

// User context from authentication
interface UserContext {
  id: string
  email: string
}

const app = new Hono<{ Bindings: Env; Variables: { user?: UserContext } }>()

// Enable CORS
app.use('*', cors())

// =================================================================
// == Authentication Routes (DO NOT MODIFY)
// =================================================================

app.get('/api/oauth/google/redirect_url', async (c) => {
  const origin = c.req.query('originUrl') || ''
  const redirectUrl = await getOAuthRedirectUrl('google', {
    originUrl: origin,
  })
  return c.json({ redirectUrl }, 200)
})

app.post('/api/sessions', async (c) => {
  const body = await c.req.json()
  if (!body.code) {
    return c.json({ error: 'No authorization code provided' }, 400)
  }
  const sessionToken = await exchangeCodeForSessionToken(body.code, c.env.PROJECT_ID)
  setCookie(c, SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60,
  })
  return c.json({ success: true }, 200)
})

app.get('/api/users/me', authMiddleware, async (c) => {
  // @ts-ignore
  return c.json(c.get('user'))
})

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, SESSION_TOKEN_COOKIE_NAME)
  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken)
  }
  setCookie(c, SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  })
  return c.json({ success: true }, 200)
})

app.post('/api/send-otp', async (c) => {
  const body = await c.req.json()
  const email = body.email
  if (!email) {
    return c.json({ error: 'No email provided' }, 400)
  }
  const data = await sendOTP(email, c.env.PROJECT_ID)
  if (data.error) {
    return c.json({ error: data.error }, 400)
  }
  return c.json({ success: true }, 200)
})

app.post('/api/verify-otp', async (c) => {
  const body = await c.req.json()
  const { email, otp } = body
  if (!email) return c.json({ error: 'No email provided' }, 400)
  if (!otp) return c.json({ error: 'No otp provided' }, 400)

  const data = await verifyOTP(email, otp)
  if (data.error) {
    return c.json({ error: data.error }, 400)
  }

  setCookie(c, SESSION_TOKEN_COOKIE_NAME, data.sessionToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60,
  })
  return c.json({ success: true }, 200)
})

// =================================================================
// == E-commerce Routes (Shopping Service Pattern)
// =================================================================

// GET /api/products - List products from shopping service
app.get('/api/products', async (c) => {
  try {
    const products = await getProducts(c.env.PROJECT_ID, {
      endpoint: c.env.SHOPPING_SERVICE_ENDPOINT,
    })
    return c.json(products)
  } catch (error: any) {
    console.error('Failed to fetch products:', error)
    return c.json({ error: error.message || 'Failed to fetch products' }, 500)
  }
})

// POST /api/create-checkout-session - Delegate to shopping service
app.post('/api/create-checkout-session', async (c) => {
  // Get user from session
  let user: UserContext | null = null
  const sessionToken = getCookie(c, SESSION_TOKEN_COOKIE_NAME)
  if (sessionToken) {
    try {
      user = (await getCurrentUser(sessionToken)) as UserContext
    } catch {
      // User not logged in
    }
  }

  if (!user) {
    return c.json(
      {
        requestId: crypto.randomUUID(),
        code: 'UNAUTHORIZED',
        message: 'Please login to purchase',
      },
      401,
    )
  }

  const body = await c.req.json()
  const { products: cartItems, successRouter, cancelRouter } = body

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return c.json(
      {
        requestId: crypto.randomUUID(),
        code: 'BAD_REQUEST',
        message: 'Products array is required',
      },
      400,
    )
  }

  // Get the origin from request
  const url = new URL(c.req.url)
  const origin = c.req.header('Origin') || c.req.header('Referer')?.replace(/\/$/, '') || url.origin

  try {
    const result = await createCheckoutSession(
      c.env.PROJECT_ID,
      user.email,
      {
        products: cartItems,
        successUrl: `${origin}${successRouter}`,
        cancelUrl: `${origin}${cancelRouter}`,
      },
      {
        endpoint: c.env.SHOPPING_SERVICE_ENDPOINT,
        workerOrigin: origin,
      },
    )

    return c.json({ checkoutUrl: result.checkoutUrl, sessionId: result.sessionId })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return c.json(
      {
        requestId: crypto.randomUUID(),
        code: 'PAYMENT_ERROR',
        message: error.message || 'Failed to create checkout session',
      },
      500,
    )
  }
})

// GET /api/products/purchase-detail - Get purchase details by session ID
app.get('/api/products/purchase-detail', async (c) => {
  const sessionId = c.req.query('sessionId')

  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400)
  }

  try {
    const result = await getPurchaseDetail(c.env.PROJECT_ID, sessionId, {
      endpoint: c.env.SHOPPING_SERVICE_ENDPOINT,
    })
    return c.json(result)
  } catch (error: any) {
    console.error('Failed to get purchase detail:', error)
    return c.json({ error: error.message || 'Failed to get purchase detail' }, 500)
  }
})

// GET /api/purchased-products - Get user's purchase history
app.get('/api/purchased-products', authMiddleware, async (c) => {
  // @ts-ignore
  const user = c.get('user') as UserContext

  try {
    const purchases = await getPurchasedProducts(c.env.PROJECT_ID, user.email, {
      endpoint: c.env.SHOPPING_SERVICE_ENDPOINT,
    })
    return c.json(purchases)
  } catch (error: any) {
    console.error('Failed to get purchased products:', error)
    return c.json({ error: error.message || 'Failed to get purchased products' }, 500)
  }
})

// GET /api/products/:productId/check-access - Check if user has access to product
app.get('/api/products/:productId/check-access', async (c) => {
  const productId = c.req.param('productId')

  // Get user from session
  let user: UserContext | null = null
  const sessionToken = getCookie(c, SESSION_TOKEN_COOKIE_NAME)
  if (sessionToken) {
    try {
      user = (await getCurrentUser(sessionToken)) as UserContext
    } catch {
      // User not logged in
    }
  }

  if (!user) {
    return c.json({
      hasAccess: false,
      message: 'Please login to access this content',
    })
  }

  // Admin bypass
  if (c.env.USER_EMAIL && user.email === c.env.USER_EMAIL) {
    return c.json({
      hasAccess: true,
      message: 'Admin access granted',
    })
  }

  try {
    const result = await checkProductAccess(c.env.PROJECT_ID, user.email, productId, {
      endpoint: c.env.SHOPPING_SERVICE_ENDPOINT,
    })
    return c.json(result)
  } catch (error: any) {
    console.error('Failed to check access:', error)
    return c.json({
      hasAccess: false,
      message: error.message || 'Failed to check access',
    })
  }
})

export default app
