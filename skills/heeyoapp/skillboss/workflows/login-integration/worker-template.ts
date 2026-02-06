/**
 * HeyBoss Worker Template with Authentication
 *
 * This template includes all required auth routes for login integration.
 * Copy this file to your project's src/index.ts and customize the
 * "YOUR ROUTES HERE" section with your own API endpoints.
 *
 * Required dependencies (add to package.json):
 *   - hono
 *   - @hey-boss/users-service
 *
 * Required wrangler.toml config:
 *   [vars]
 *   PROJECT_ID = "your-project-id"
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

const app = new Hono<{
  Bindings: {
    DB: D1Database
    PROJECT_ID: string
    ASSETS?: { fetch: typeof fetch }
    // Add your other bindings here (KV, R2, etc.)
  }
}>()

// =================================================================
// == AUTHENTICATION ROUTES - DO NOT MODIFY                        ==
// =================================================================
// These routes are required for @hey-boss/users-service/react to work.
// They handle Google OAuth, Email OTP, session management, and logout.
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
    maxAge: 1 * 24 * 60 * 60, // 1 day
  })

  return c.json({ success: true }, 200)
})

app.get('/api/users/me', authMiddleware, async (c) => {
  // @ts-ignore - user is set by authMiddleware
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
  const email = body.email
  const otp = body.otp
  if (!email) {
    return c.json({ error: 'No email provided' }, 400)
  }
  if (!otp) {
    return c.json({ error: 'No otp provided' }, 400)
  }
  const data = await verifyOTP(email, otp)

  if (data.error) {
    return c.json({ error: data.error }, 400)
  }
  const sessionToken = data.sessionToken

  setCookie(c, SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 1 * 24 * 60 * 60, // 1 day
  })
  return c.json({ success: true, data }, 200)
})

// =================================================================
// == END OF AUTHENTICATION ROUTES                                 ==
// =================================================================

// =================================================================
// == YOUR ROUTES HERE                                             ==
// =================================================================
// Add your custom API routes below. Examples:
//
// Public route (no auth required):
// app.get("/api/products", async (c) => {
//   const result = await c.env.DB.prepare("SELECT * FROM products").all();
//   return c.json(result.results);
// });
//
// Protected route (requires login):
// app.get("/api/orders", authMiddleware, async (c) => {
//   const user = c.get("user");
//   const result = await c.env.DB.prepare(
//     "SELECT * FROM orders WHERE user_email = ?1"
//   ).bind(user.email).all();
//   return c.json(result.results);
// });
// =================================================================

// Example: Simple health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =================================================================
// == STATIC ASSETS (React App)                                    ==
// =================================================================
// This serves your React app from the dist/ folder.
// Must be the LAST route to act as a catch-all for SPA routing.
// =================================================================

app.get('*', async (c) => {
  if (c.env.ASSETS) {
    const response = await c.env.ASSETS.fetch(c.req.raw)
    if (response.status !== 404) {
      return response
    }
    // SPA fallback - serve index.html for client-side routing
    const url = new URL(c.req.url)
    return c.env.ASSETS.fetch(new Request(new URL('/', url).toString(), c.req.raw))
  }
  return c.text('Not Found', 404)
})

export default app
