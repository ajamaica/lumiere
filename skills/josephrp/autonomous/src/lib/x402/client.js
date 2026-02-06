/**
 * x402 client: fetch with retry on 402 Payment Required.
 * On 402: parse requirements → build payment (Aptos/EVM) → verify → settle → retry with PAYMENT-SIGNATURE.
 */

import { getFirstPaymentRequirements, isAptosNetwork, isEvmNetwork } from './types.js'

const DEFAULT_MAX_RETRIES = 2
const PAYMENT_SIGNATURE_HEADER = 'PAYMENT-SIGNATURE'

/**
 * Normalize facilitator base URL for /verify and /settle.
 * @param {string} url - Base URL (may end with /facilitator or /)
 * @returns {{ verifyUrl: string, settleUrl: string }}
 */
function normalizeFacilitatorUrl(url) {
  const base = url.replace(/\/+$/, '')
  const hasFacilitator = base.endsWith('/facilitator')
  const prefix = hasFacilitator ? base : base
  return {
    verifyUrl: `${prefix}/verify`,
    settleUrl: `${prefix}/settle`,
  }
}

/** Timeout for verify (ms); slightly above server/facilitator 30s */
const VERIFY_TIMEOUT_MS = 35_000
/** Timeout for settle (ms); slightly above server/facilitator 60s */
const SETTLE_TIMEOUT_MS = 65_000

/**
 * Verify payment with facilitator.
 * @param {string} facilitatorUrl - Facilitator base URL
 * @param {Object} paymentPayload - Payment payload from wallet
 * @param {import('./types.js').PaymentRequirements} paymentRequirements - Payment requirements
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPayment(facilitatorUrl, paymentPayload, paymentRequirements) {
  const { verifyUrl } = normalizeFacilitatorUrl(facilitatorUrl)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 2,
        paymentPayload: {
          x402Version: 2,
          ...paymentPayload,
          network: paymentRequirements.network,
          scheme: paymentRequirements.scheme,
        },
        paymentRequirements,
      }),
      signal: controller.signal,
    })
    const body = await res
      .json()
      .catch(() => ({ isValid: false, invalidReason: 'invalid_response' }))
    if (body && body.isValid === false && body.invalidReason) {
      const extra = [body.message, body.detail, body.error].filter(Boolean).join(' ')
      if (extra) {
        body.invalidReason = body.invalidReason + ` (${extra})`
        console.warn('Facilitator verify failed:', body.invalidReason, body)
      }
    }
    return body
  } catch (e) {
    if (e.name === 'AbortError') {
      return { isValid: false, invalidReason: 'facilitator_timeout: Request timed out' }
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Settle payment with facilitator.
 * @param {string} facilitatorUrl - Facilitator base URL
 * @param {Object} paymentPayload - Payment payload from wallet
 * @param {import('./types.js').PaymentRequirements} paymentRequirements - Payment requirements
 * @param {Object} [verification] - Verification result (optional)
 * @returns {Promise<Object>} Settlement result
 */
export async function settlePayment(
  facilitatorUrl,
  paymentPayload,
  paymentRequirements,
  verification = {},
) {
  const { settleUrl } = normalizeFacilitatorUrl(facilitatorUrl)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SETTLE_TIMEOUT_MS)
  try {
    const res = await fetch(settleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 2,
        paymentPayload: {
          x402Version: 2,
          ...paymentPayload,
          network: paymentRequirements.network,
          scheme: paymentRequirements.scheme,
        },
        paymentRequirements,
        verification,
      }),
      signal: controller.signal,
    })
    return await res.json().catch(() => ({ success: false, errorReason: 'invalid_response' }))
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, errorReason: 'settlement_timeout: Request timed out' }
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch with x402 retry: on 402, pay via facilitator then retry with PAYMENT-SIGNATURE.
 * @param {string} url - Request URL
 * @param {RequestInit} [options] - Fetch options (method, headers, body, etc.)
 * @param {Object} context - x402 context
 * @param {string} context.facilitatorUrl - Facilitator base URL (e.g. https://x402-navy.vercel.app/facilitator)
 * @param {(req: import('./types.js').PaymentRequirements) => Promise<Object>} [context.getAptosPaymentPayload]
 * @param {(req: import('./types.js').PaymentRequirements) => Promise<Object>} [context.getEvmPaymentPayload]
 * @param {number} [context.maxRetries]
 * @returns {Promise<Object>} Parsed JSON response body (after retry if 402)
 */
export async function fetchWithX402Retry(url, options = {}, context = {}) {
  const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES
  const { verifyUrl, settleUrl } = normalizeFacilitatorUrl(context.facilitatorUrl || '')

  const doRequest = async (extraHeaders = {}) => {
    const headers = { ...(options.headers || {}), ...extraHeaders }
    const res = await fetch(url, { ...options, headers })
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')

    if (res.status !== 402) {
      if (typeof body === 'object') return body
      return { raw: body, status: res.status }
    }

    const requirements = getFirstPaymentRequirements(body)
    if (!requirements) {
      const reason = body?.invalidReason || 'missing_payment_requirements'
      throw new Error(`402: ${reason}`)
    }

    const network = requirements.network || ''
    let paymentPayload
    if (isAptosNetwork(network) && context.getAptosPaymentPayload) {
      paymentPayload = await context.getAptosPaymentPayload(requirements)
    } else if (isEvmNetwork(network) && context.getEvmPaymentPayload) {
      paymentPayload = await context.getEvmPaymentPayload(requirements)
    } else {
      throw new Error(`402: unsupported network ${network}`)
    }

    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload: { ...paymentPayload, network, scheme: requirements.scheme },
        paymentRequirements: requirements,
      }),
    })
    const verifyResult = await verifyRes.json().catch(() => ({}))
    if (!verifyResult?.isValid) {
      throw new Error(`402 verify failed: ${verifyResult?.invalidReason || 'invalid'}`)
    }

    const settleRes = await fetch(settleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload: { ...paymentPayload, network, scheme: requirements.scheme },
        paymentRequirements: requirements,
        verification: verifyResult,
      }),
    })
    const settleResult = await settleRes.json().catch(() => ({}))
    if (!settleResult?.success) {
      throw new Error(`402 settle failed: ${settleResult?.errorReason || 'unknown'}`)
    }

    const signatureValue =
      typeof paymentPayload === 'string'
        ? paymentPayload
        : Buffer.isBuffer(paymentPayload)
          ? paymentPayload.toString('base64')
          : JSON.stringify(paymentPayload)
    const retryHeaders = { [PAYMENT_SIGNATURE_HEADER]: signatureValue }
    return doRequest(retryHeaders)
  }

  return doRequest()
}
