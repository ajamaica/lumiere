// qweather_jwt_session.js
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const CONFIG = require('./qweather_config')

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function loadPrivateKey() {
  const keyPath = path.isAbsolute(CONFIG.PRIVATE_KEY_PATH)
    ? CONFIG.PRIVATE_KEY_PATH
    : path.join(__dirname, CONFIG.PRIVATE_KEY_PATH)

  return fs.readFileSync(keyPath, 'utf8')
}

function generateJwtEd25519(PROJECT_ID, CREDENTIALS_ID, PRIVATE_KEY_PATH) {
  const now = Math.floor(Date.now() / 1000)

  // QWeather 建议：iat = now - 30，防时钟偏差
  const payload = {
    sub: PROJECT_ID,
    iat: now - 30,
    exp: now - 30 + 900, // 15 min
  }

  const header = {
    alg: 'EdDSA',
    kid: CREDENTIALS_ID,
    typ: 'JWT',
  }

  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const privateKeyPem = loadPrivateKey(PRIVATE_KEY_PATH)

  // Ed25519 签名：crypto.sign(null, data, privateKey)
  const signature = crypto.sign(null, Buffer.from(signingInput), privateKeyPem)
  const encodedSig = base64url(signature)

  const token = `${signingInput}.${encodedSig}`
  return token
}

let cache = null // { token: string, expMs: number }

// 仅用于解析 exp / sub（不校验签名）
function decodePayload(token) {
  const [, payloadB64] = token.split('.')
  const json = Buffer.from(payloadB64, 'base64url').toString('utf8')
  return JSON.parse(json)
}

async function getQWeatherJwt({ debug = false } = {}) {
  // 命中缓存
  if (cache && Date.now() < cache.expMs - 60_000) {
    return cache.token
  }

  const keyPath = path.isAbsolute(CONFIG.PRIVATE_KEY_PATH)
    ? CONFIG.PRIVATE_KEY_PATH
    : path.join(__dirname, CONFIG.PRIVATE_KEY_PATH)

  // ✅ 只做一件事：调用你“已经验证正确”的生成函数
  const token = generateJwtEd25519(CONFIG.PROJECT_ID, CONFIG.CREDENTIALS_ID, keyPath)

  if (!token || typeof token !== 'string') {
    throw new Error('JWT generate failed: empty token')
  }

  const payload = decodePayload(token)
  if (!payload?.exp) {
    throw new Error('JWT generate failed: cannot decode exp')
  }

  cache = {
    token,
    expMs: payload.exp * 1000,
  }

  if (debug) {
    console.log('[QWEATHER JWT]', {
      sub: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
    })
  }

  return token
}

function clearQWeatherJwtCache() {
  cache = null
}

module.exports = {
  getQWeatherJwt,
  clearQWeatherJwtCache,
}
