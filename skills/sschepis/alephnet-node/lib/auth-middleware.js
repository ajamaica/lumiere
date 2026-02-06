/**
 * AlephNet Authentication & Security Middleware
 * Protects node endpoints with KeyTriplet verification and Rate Limiting.
 */

const { verify } = require('./keytriplet')

// ============================================================================
// RATE LIMITER (Token Bucket)
// ============================================================================

const rateLimits = new Map()

function checkRateLimit(ip, endpoint, limit = 100, windowMs = 60000) {
  const key = `${ip}:${endpoint}`
  const now = Date.now()

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  const record = rateLimits.get(key)

  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + windowMs
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * Middleware to protect routes with KeyTriplet signatures
 * Expects headers:
 * - X-Aleph-Fingerprint: <fingerprint>
 * - X-Aleph-Signature: <signature>
 * - X-Aleph-Timestamp: <timestamp>
 * - X-Aleph-PublicKey: <base64_key> (Required for v2 verification if not cached)
 */
function authMiddleware(req, res, next) {
  // 1. Rate Limit Check
  const ip = req.socket.remoteAddress || 'unknown'
  const urlPath = req.url.split('?')[0]

  if (!checkRateLimit(ip, urlPath)) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Too Many Requests' }))
    return
  }

  // 2. Public Endpoints (Skip Auth)
  const publicPaths = [
    '/status',
    '/webrtc/info',
    '/auth/handshake',
    '/learning/status',
    '/nodes',
    '/peers',
  ]

  if (publicPaths.includes(urlPath)) {
    next()
    return
  }

  // 3. Signature Verification
  const fingerprint = req.headers['x-aleph-fingerprint']
  let signature = req.headers['x-aleph-signature']
  const timestamp = req.headers['x-aleph-timestamp']
  const publicKey = req.headers['x-aleph-publickey']

  // For development/bootstrapping, allow a local bypass if configured
  if (process.env.ALEPH_DEV_NO_AUTH === 'true') {
    next()
    return
  }

  if (!fingerprint || !signature || !timestamp) {
    // Fallback check for Bearer
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // TODO: Implement Bearer token validation
    }

    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing AlephNet Authentication Headers' }))
    return
  }

  // Parse v1 signature JSON if needed
  if (signature.startsWith('{') || signature.startsWith('%7B')) {
    try {
      signature = JSON.parse(decodeURIComponent(signature))
    } catch (e) {
      // Assume string
    }
  }

  // Verify Timestamp (Prevent Replay Attacks)
  const now = Date.now()
  const reqTime = parseInt(timestamp, 10)
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) {
    // 5 minute window
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Request timestamp expired or invalid' }))
    return
  }

  try {
    // Reconstruct content to verify (Method + Path + Timestamp)
    const contentToVerify = `${req.method}:${urlPath}:${timestamp}`

    // For v2, we need the public key.
    // If the client didn't send it, we can try to trust the fingerprint for v1 legacy
    // OR fail. For now, we require it for v2.

    const signerKey = publicKey || { fingerprint } // Fallback object for v1

    const result = verify(contentToVerify, signature, signerKey)

    if (!result.valid) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid Signature', details: result.error }))
      return
    }

    // Attach identity to request
    req.identity = { fingerprint, timestamp: reqTime, publicKey }
    next()
  } catch (e) {
    console.error('Auth Error:', e)
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Malformed Signature' }))
  }
}

module.exports = {
  authMiddleware,
  checkRateLimit,
}
