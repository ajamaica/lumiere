#!/usr/bin/env node
/**
 * Test Payment & License System
 * Verifies all components work correctly
 */

import {
  activateLicense,
  canProcessBookmarks,
  getLicenseStatus,
  getUsage,
  incrementUsage,
} from './license.js'
import {
  completePayment,
  generateCryptoPayment,
  generateStripeLink,
  getPaymentStatus,
} from './payment.js'

console.log('🧪 Testing Bookmark Intelligence Payment System\n')
console.log('='.repeat(80))

let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
    testsPassed++
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  Error: ${error.message}`)
    testsFailed++
  }
}

// Test 1: Default license (free tier)
test('Default license is Free tier', () => {
  const status = getLicenseStatus()
  if (status.tier !== 'free') {
    throw new Error(`Expected 'free', got '${status.tier}'`)
  }
})

// Test 2: Test license activation (Pro)
test('Activate test Pro license', () => {
  const result = activateLicense('TEST-PRO-00000000000000000', 'test@example.com')
  if (!result.success) {
    throw new Error(result.error)
  }
  if (result.license.tier !== 'pro') {
    throw new Error(`Expected 'pro', got '${result.license.tier}'`)
  }
})

// Test 3: License status after activation
test('License status shows Pro tier', () => {
  const status = getLicenseStatus()
  if (status.tier !== 'pro') {
    throw new Error(`Expected 'pro', got '${status.tier}'`)
  }
  if (status.usage.limit !== 'unlimited') {
    throw new Error(`Expected unlimited, got ${status.usage.limit}`)
  }
})

// Test 4: Can process bookmarks (Pro has no limits)
test('Pro tier can process bookmarks', () => {
  const usage = getUsage()
  const license = { tier: 'pro', expiresAt: null }
  const canProcess = canProcessBookmarks(license, usage)
  if (!canProcess.allowed) {
    throw new Error(`Should be allowed: ${canProcess.reason}`)
  }
})

// Test 5: Usage tracking
test('Usage tracking increments correctly', () => {
  const beforeUsage = getUsage()
  const beforeCount = beforeUsage.count

  incrementUsage()

  const afterUsage = getUsage()
  if (afterUsage.count !== beforeCount + 1) {
    throw new Error(`Expected ${beforeCount + 1}, got ${afterUsage.count}`)
  }
})

// Test 6: Free tier activation
test('Switch to Free tier test license', () => {
  const result = activateLicense('TEST-FREE-0000000000000000', 'test-free@example.com')
  if (!result.success) {
    throw new Error(result.error)
  }
  if (result.license.tier !== 'free') {
    throw new Error(`Expected 'free', got '${result.license.tier}'`)
  }
})

// Test 7: Free tier limits
test('Free tier has correct limits', () => {
  const status = getLicenseStatus()
  if (status.tier !== 'free') {
    throw new Error(`Expected 'free', got '${status.tier}'`)
  }
  if (status.usage.limit !== 10) {
    throw new Error(`Expected limit 10, got ${status.usage.limit}`)
  }
})

// Test 8: Stripe payment link generation
test('Generate Stripe payment link', () => {
  const result = generateStripeLink('pro', 'monthly', 'test@example.com')
  if (!result.success) {
    throw new Error(result.error)
  }
  if (!result.paymentId) {
    throw new Error('No payment ID generated')
  }
  if (!result.link) {
    throw new Error('No payment link generated')
  }
  if (result.amount !== 9.0) {
    throw new Error(`Expected $9.00, got $${result.amount}`)
  }
})

// Test 9: Crypto payment generation
test('Generate crypto payment instructions', () => {
  const result = generateCryptoPayment('enterprise', 'monthly', 'test@example.com')
  if (!result.success) {
    throw new Error(result.error)
  }
  if (!result.paymentId) {
    throw new Error('No payment ID generated')
  }
  if (!result.instructions) {
    throw new Error('No payment instructions')
  }
  if (result.instructions.amount !== 29.0) {
    throw new Error(`Expected $29.00, got $${result.instructions.amount}`)
  }
})

// Test 10: Payment completion flow
test('Complete payment and issue license', () => {
  // First create a payment
  const paymentResult = generateStripeLink('pro', 'monthly', 'completion-test@example.com')
  if (!paymentResult.success) {
    throw new Error('Failed to create payment')
  }

  // Complete the payment
  const completeResult = completePayment(paymentResult.paymentId, 'stripe', {
    email: 'completion-test@example.com',
  })
  if (!completeResult.success) {
    throw new Error(completeResult.error)
  }

  if (!completeResult.licenseKey) {
    throw new Error('No license key issued')
  }

  if (!completeResult.licenseKey.startsWith('PRO-')) {
    throw new Error(`Invalid license key format: ${completeResult.licenseKey}`)
  }

  // Verify payment status
  const statusResult = getPaymentStatus(paymentResult.paymentId)
  if (!statusResult.success) {
    throw new Error('Failed to get payment status')
  }

  if (statusResult.payment.status !== 'completed') {
    throw new Error(`Payment status should be completed, got ${statusResult.payment.status}`)
  }
})

// Test 11: Enterprise tier features
test('Enterprise tier test license', () => {
  const result = activateLicense('TEST-ENT-00000000000000000', 'test-ent@example.com')
  if (!result.success) {
    throw new Error(result.error)
  }

  const status = getLicenseStatus()
  if (status.tier !== 'enterprise') {
    throw new Error(`Expected 'enterprise', got '${status.tier}'`)
  }

  if (!status.features.teamSharing) {
    throw new Error('Enterprise should have teamSharing')
  }

  if (!status.features.customModels) {
    throw new Error('Enterprise should have customModels')
  }

  if (!status.features.apiAccess) {
    throw new Error('Enterprise should have apiAccess')
  }
})

// Test 12: Invalid license key rejection
test('Reject invalid license key', () => {
  const result = activateLicense('INVALID-KEY-123', 'test@example.com')
  if (result.success) {
    throw new Error('Should have rejected invalid key')
  }
})

// Summary
console.log('\n' + '='.repeat(80))
console.log('\n📊 TEST SUMMARY')
console.log(`✓ Passed: ${testsPassed}`)
console.log(`✗ Failed: ${testsFailed}`)

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Payment system is working correctly.')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed. Please review the errors above.')
  process.exit(1)
}
