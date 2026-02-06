// gen_qweather_token.js
// 零依赖：用 Node crypto 生成 Ed25519 (EdDSA) JWT，便于去 QWeather 控制台验证

const fs = require('fs')
const path = require('path')
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
  return { token, payload, header }
}

const { token, payload } = generateJwtEd25519(
  CONFIG.PROJECT_ID,
  CONFIG.CREDENTIALS_ID,
  CONFIG.PRIVATE_KEY_PATH,
)

console.log('JWT TOKEN:')
console.log(token)
console.log('\nPayload preview:')
console.log(payload)
