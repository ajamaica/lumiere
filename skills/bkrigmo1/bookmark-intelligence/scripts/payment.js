#!/usr/bin/env node
/**
 * Payment Integration System
 * Supports Stripe and crypto payments
 */

import crypto from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const PAYMENT_CONFIG_FILE = join(SKILL_DIR, 'payment-config.json')
const PAYMENTS_DB_FILE = join(SKILL_DIR, 'payments.json')

// Default payment configuration (seller must customize)
const DEFAULT_PAYMENT_CONFIG = {
  stripe: {
    enabled: true,
    testMode: true,
    publicKey: 'pk_test_REPLACE_WITH_YOUR_KEY',
    secretKey: 'sk_test_REPLACE_WITH_YOUR_KEY',
    webhookSecret: 'whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET',
  },
  crypto: {
    enabled: true,
    network: 'polygon',
    token: 'USDC',
    walletAddress: '0x0000000000000000000000000000000000000000', // Seller must configure
    confirmations: 2,
  },
  pricing: {
    pro: {
      monthly: 9.0,
      yearly: 90.0, // 2 months free
    },
    enterprise: {
      monthly: 29.0,
      yearly: 290.0,
    },
  },
}

// Load payment configuration
function loadPaymentConfig() {
  if (!existsSync(PAYMENT_CONFIG_FILE)) {
    savePaymentConfig(DEFAULT_PAYMENT_CONFIG)
    return DEFAULT_PAYMENT_CONFIG
  }

  try {
    return JSON.parse(readFileSync(PAYMENT_CONFIG_FILE, 'utf8'))
  } catch (error) {
    console.error('Error loading payment config:', error.message)
    return DEFAULT_PAYMENT_CONFIG
  }
}

// Save payment configuration
function savePaymentConfig(config) {
  try {
    writeFileSync(PAYMENT_CONFIG_FILE, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error('Error saving payment config:', error.message)
    return false
  }
}

// Load payments database
function loadPaymentsDB() {
  if (!existsSync(PAYMENTS_DB_FILE)) {
    return { payments: [] }
  }

  try {
    return JSON.parse(readFileSync(PAYMENTS_DB_FILE, 'utf8'))
  } catch (error) {
    console.error('Error loading payments DB:', error.message)
    return { payments: [] }
  }
}

// Save payments database
function savePaymentsDB(db) {
  try {
    writeFileSync(PAYMENTS_DB_FILE, JSON.stringify(db, null, 2))
    return true
  } catch (error) {
    console.error('Error saving payments DB:', error.message)
    return false
  }
}

// Generate license key
function generateLicenseKey(tier) {
  const tierPrefix =
    {
      pro: 'PRO',
      enterprise: 'ENT',
    }[tier] || 'FREE'

  const randomHex = crypto.randomBytes(12).toString('hex').toUpperCase()
  return `${tierPrefix}-${randomHex}`
}

// Generate Stripe payment link
export function generateStripeLink(tier, period = 'monthly', email = null) {
  const config = loadPaymentConfig()

  if (!config.stripe.enabled) {
    return { success: false, error: 'Stripe not enabled' }
  }

  const price = config.pricing[tier]?.[period]
  if (!price) {
    return { success: false, error: 'Invalid tier or period' }
  }

  // Generate payment ID for tracking
  const paymentId = crypto.randomBytes(16).toString('hex')

  // Store pending payment
  const db = loadPaymentsDB()
  db.payments.push({
    id: paymentId,
    method: 'stripe',
    tier,
    period,
    amount: price,
    currency: 'USD',
    status: 'pending',
    createdAt: new Date().toISOString(),
    email: email || null,
  })
  savePaymentsDB(db)

  // In production, this would create a Stripe Checkout session
  // For MVP, we return a placeholder URL with instructions
  const stripeLink = `https://checkout.stripe.com/pay/${paymentId}`

  return {
    success: true,
    paymentId,
    link: stripeLink,
    amount: price,
    currency: 'USD',
    instructions: config.stripe.testMode
      ? 'TEST MODE: Use card 4242 4242 4242 4242, any future expiry, any CVC'
      : 'Complete payment to activate license',
  }
}

// Generate crypto payment instructions
export function generateCryptoPayment(tier, period = 'monthly', email = null) {
  const config = loadPaymentConfig()

  if (!config.crypto.enabled) {
    return { success: false, error: 'Crypto payments not enabled' }
  }

  if (config.crypto.walletAddress === '0x0000000000000000000000000000000000000000') {
    return { success: false, error: 'Crypto wallet not configured by seller' }
  }

  const price = config.pricing[tier]?.[period]
  if (!price) {
    return { success: false, error: 'Invalid tier or period' }
  }

  // Generate payment ID for tracking
  const paymentId = crypto.randomBytes(16).toString('hex')

  // Store pending payment
  const db = loadPaymentsDB()
  db.payments.push({
    id: paymentId,
    method: 'crypto',
    tier,
    period,
    amount: price,
    currency: 'USD',
    cryptoAmount: price, // In production, fetch live USDC rate
    cryptoToken: config.crypto.token,
    network: config.crypto.network,
    walletAddress: config.crypto.walletAddress,
    status: 'pending',
    createdAt: new Date().toISOString(),
    email: email || null,
  })
  savePaymentsDB(db)

  return {
    success: true,
    paymentId,
    instructions: {
      network: config.crypto.network.toUpperCase(),
      token: config.crypto.token,
      amount: price,
      walletAddress: config.crypto.walletAddress,
      memo: paymentId.substring(0, 8), // Use first 8 chars as payment reference
      confirmationsRequired: config.crypto.confirmations,
    },
    message: `Send ${price} ${config.crypto.token} on ${config.crypto.network} to the address above. Include memo: ${paymentId.substring(0, 8)}`,
  }
}

// Manually complete a payment (for crypto or testing)
export function completePayment(paymentId, method = null, metadata = {}) {
  const db = loadPaymentsDB()
  const payment = db.payments.find((p) => p.id === paymentId)

  if (!payment) {
    return { success: false, error: 'Payment not found' }
  }

  if (payment.status === 'completed') {
    return { success: false, error: 'Payment already completed', licenseKey: payment.licenseKey }
  }

  // Generate license key
  const licenseKey = generateLicenseKey(payment.tier)

  // Calculate expiry date
  const expiresAt = new Date()
  if (payment.period === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (payment.period === 'yearly') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  // Update payment record
  payment.status = 'completed'
  payment.completedAt = new Date().toISOString()
  payment.licenseKey = licenseKey
  payment.expiresAt = expiresAt.toISOString()
  payment.metadata = metadata

  savePaymentsDB(db)

  return {
    success: true,
    licenseKey,
    tier: payment.tier,
    expiresAt: expiresAt.toISOString(),
    email: metadata.email || payment.email,
  }
}

// Get payment status
export function getPaymentStatus(paymentId) {
  const db = loadPaymentsDB()
  const payment = db.payments.find((p) => p.id === paymentId)

  if (!payment) {
    return { success: false, error: 'Payment not found' }
  }

  return {
    success: true,
    payment: {
      id: payment.id,
      method: payment.method,
      tier: payment.tier,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt || null,
      licenseKey: payment.licenseKey || null,
      expiresAt: payment.expiresAt || null,
    },
  }
}

// List all payments (admin)
export function listPayments(filter = {}) {
  const db = loadPaymentsDB()
  let payments = db.payments

  if (filter.status) {
    payments = payments.filter((p) => p.status === filter.status)
  }

  if (filter.method) {
    payments = payments.filter((p) => p.method === filter.method)
  }

  if (filter.tier) {
    payments = payments.filter((p) => p.tier === filter.tier)
  }

  return payments
}

// Get revenue stats (admin)
export function getRevenueStats() {
  const db = loadPaymentsDB()
  const completed = db.payments.filter((p) => p.status === 'completed')

  const stats = {
    totalRevenue: completed.reduce((sum, p) => sum + p.amount, 0),
    totalPayments: completed.length,
    byMethod: {
      stripe: completed.filter((p) => p.method === 'stripe').length,
      crypto: completed.filter((p) => p.method === 'crypto').length,
    },
    byTier: {
      pro: completed.filter((p) => p.tier === 'pro').length,
      enterprise: completed.filter((p) => p.tier === 'enterprise').length,
    },
    byPeriod: {
      monthly: completed.filter((p) => p.period === 'monthly').length,
      yearly: completed.filter((p) => p.period === 'yearly').length,
    },
    pending: db.payments.filter((p) => p.status === 'pending').length,
  }

  return stats
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  switch (command) {
    case 'stripe':
      const tier1 = process.argv[3] || 'pro'
      const period1 = process.argv[4] || 'monthly'
      const email1 = process.argv[5] || null

      const stripeResult = generateStripeLink(tier1, period1, email1)
      if (stripeResult.success) {
        console.log('\n=== Stripe Payment Link ===')
        console.log(`Payment ID: ${stripeResult.paymentId}`)
        console.log(`Amount: $${stripeResult.amount} ${stripeResult.currency}`)
        console.log(`Link: ${stripeResult.link}`)
        console.log(`\n${stripeResult.instructions}`)
      } else {
        console.error('Error:', stripeResult.error)
        process.exit(1)
      }
      break

    case 'crypto':
      const tier2 = process.argv[3] || 'pro'
      const period2 = process.argv[4] || 'monthly'
      const email2 = process.argv[5] || null

      const cryptoResult = generateCryptoPayment(tier2, period2, email2)
      if (cryptoResult.success) {
        console.log('\n=== Crypto Payment Instructions ===')
        console.log(`Payment ID: ${cryptoResult.paymentId}`)
        console.log(`Network: ${cryptoResult.instructions.network}`)
        console.log(`Token: ${cryptoResult.instructions.token}`)
        console.log(
          `Amount: ${cryptoResult.instructions.amount} ${cryptoResult.instructions.token}`,
        )
        console.log(`Wallet: ${cryptoResult.instructions.walletAddress}`)
        console.log(`Memo: ${cryptoResult.instructions.memo}`)
        console.log(`\n${cryptoResult.message}`)
      } else {
        console.error('Error:', cryptoResult.error)
        process.exit(1)
      }
      break

    case 'complete':
      const paymentId = process.argv[3]
      const email3 = process.argv[4] || 'user@example.com'

      if (!paymentId) {
        console.error('Usage: node payment.js complete <payment-id> [email]')
        process.exit(1)
      }

      const completeResult = completePayment(paymentId, null, { email: email3 })
      if (completeResult.success) {
        console.log('\n=== Payment Completed ===')
        console.log(`License Key: ${completeResult.licenseKey}`)
        console.log(`Tier: ${completeResult.tier}`)
        console.log(`Expires: ${new Date(completeResult.expiresAt).toLocaleDateString()}`)
        console.log(`Email: ${completeResult.email}`)
      } else {
        console.error('Error:', completeResult.error)
      }
      break

    case 'status':
      const statusId = process.argv[3]
      if (!statusId) {
        console.error('Usage: node payment.js status <payment-id>')
        process.exit(1)
      }

      const statusResult = getPaymentStatus(statusId)
      if (statusResult.success) {
        const p = statusResult.payment
        console.log('\n=== Payment Status ===')
        console.log(`ID: ${p.id}`)
        console.log(`Method: ${p.method}`)
        console.log(`Tier: ${p.tier}`)
        console.log(`Amount: $${p.amount}`)
        console.log(`Status: ${p.status}`)
        if (p.licenseKey) {
          console.log(`License: ${p.licenseKey}`)
        }
      } else {
        console.error('Error:', statusResult.error)
      }
      break

    case 'configure':
      const config = loadPaymentConfig()
      console.log('\n=== Payment Configuration ===')
      console.log('Edit payment-config.json to customize')
      console.log(`\nStripe: ${config.stripe.enabled ? 'Enabled' : 'Disabled'}`)
      console.log(`Crypto: ${config.crypto.enabled ? 'Enabled' : 'Disabled'}`)
      if (config.crypto.walletAddress === '0x0000000000000000000000000000000000000000') {
        console.log('\n⚠️  WARNING: Crypto wallet not configured!')
      }
      break

    default:
      console.log('Usage:')
      console.log('  node payment.js stripe <tier> [period] [email]')
      console.log('  node payment.js crypto <tier> [period] [email]')
      console.log('  node payment.js complete <payment-id> [email]')
      console.log('  node payment.js status <payment-id>')
      console.log('  node payment.js configure')
      process.exit(1)
  }
}
