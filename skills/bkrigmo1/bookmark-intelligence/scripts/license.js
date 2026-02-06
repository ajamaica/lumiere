#!/usr/bin/env node
/**
 * License Management System
 * Handles license validation, tier checking, and usage tracking
 */

import { execSync } from 'child_process'
import crypto from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const LICENSE_FILE = join(SKILL_DIR, 'license.json')
const USAGE_FILE = join(SKILL_DIR, 'usage.json')

// Tier definitions
export const TIERS = {
  free: {
    name: 'Free',
    monthlyLimit: 10,
    automation: false,
    llmAnalysis: false,
    notifications: false,
    price: 0,
  },
  pro: {
    name: 'Pro',
    monthlyLimit: -1, // unlimited
    automation: true,
    llmAnalysis: true,
    notifications: true,
    price: 9,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyLimit: -1,
    automation: true,
    llmAnalysis: true,
    notifications: true,
    teamSharing: true,
    customModels: true,
    apiAccess: true,
    price: 29,
  },
}

// Test license keys for development/testing
export const TEST_LICENSES = {
  'TEST-FREE-0000000000000000': { tier: 'free', email: 'test-free@example.com' },
  'TEST-PRO-00000000000000000': { tier: 'pro', email: 'test-pro@example.com' },
  'TEST-ENT-00000000000000000': { tier: 'enterprise', email: 'test-enterprise@example.com' },
}

// Get machine ID for encryption
function getMachineId() {
  try {
    // Try multiple methods for cross-platform support
    let machineId = null

    // Linux: use machine-id
    if (process.platform === 'linux') {
      try {
        machineId = execSync('cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id', {
          encoding: 'utf8',
        }).trim()
      } catch (e) {}
    }

    // macOS: use IOPlatformUUID
    if (!machineId && process.platform === 'darwin') {
      try {
        machineId = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', {
          encoding: 'utf8',
        })
          .split('=')[1]
          .trim()
          .replace(/"/g, '')
      } catch (e) {}
    }

    // Windows: use WMIC
    if (!machineId && process.platform === 'win32') {
      try {
        machineId = execSync('wmic csproduct get uuid', { encoding: 'utf8' }).split('\n')[1].trim()
      } catch (e) {}
    }

    // Fallback: use hostname
    if (!machineId) {
      machineId = execSync('hostname', { encoding: 'utf8' }).trim()
    }

    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32)
  } catch (error) {
    // Ultimate fallback
    return 'default-machine-id-00000000'
  }
}

// Simple XOR encryption/decryption
function xorEncrypt(text, key) {
  const keyBuffer = Buffer.from(key)
  const textBuffer = Buffer.from(text)
  const result = Buffer.alloc(textBuffer.length)

  for (let i = 0; i < textBuffer.length; i++) {
    result[i] = textBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return result.toString('base64')
}

function xorDecrypt(encrypted, key) {
  const keyBuffer = Buffer.from(key)
  const encryptedBuffer = Buffer.from(encrypted, 'base64')
  const result = Buffer.alloc(encryptedBuffer.length)

  for (let i = 0; i < encryptedBuffer.length; i++) {
    result[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return result.toString('utf8')
}

// Load license from encrypted storage
export function loadLicense() {
  if (!existsSync(LICENSE_FILE)) {
    return { tier: 'free', key: null }
  }

  try {
    const encrypted = JSON.parse(readFileSync(LICENSE_FILE, 'utf8'))
    const machineId = getMachineId()
    const decrypted = xorDecrypt(encrypted.data, machineId)
    const license = JSON.parse(decrypted)

    return license
  } catch (error) {
    console.error('Error loading license:', error.message)
    return { tier: 'free', key: null }
  }
}

// Save license to encrypted storage
export function saveLicense(license) {
  try {
    const machineId = getMachineId()
    const json = JSON.stringify(license)
    const encrypted = xorEncrypt(json, machineId)

    writeFileSync(LICENSE_FILE, JSON.stringify({ data: encrypted, version: 1 }))
    return true
  } catch (error) {
    console.error('Error saving license:', error.message)
    return false
  }
}

// Validate license key format and signature
export function validateLicenseKey(key) {
  // Check test licenses
  if (TEST_LICENSES[key]) {
    return TEST_LICENSES[key]
  }

  // License format: TIER-XXXXXXXXXXXXXXXXXXXXXXXX (32 chars hex after tier)
  const match = key.match(/^(FREE|PRO|ENT)-([0-9A-F]{24})$/)
  if (!match) {
    return null
  }

  const tierPrefix = match[1]
  const signature = match[2]

  // Map prefix to tier
  const tierMap = {
    FREE: 'free',
    PRO: 'pro',
    ENT: 'enterprise',
  }

  const tier = tierMap[tierPrefix]
  if (!tier) {
    return null
  }

  // In production, you would verify the signature against your server
  // For MVP, we just validate format
  return { tier, valid: true }
}

// Check if license is expired (with grace period)
export function isLicenseExpired(license) {
  if (!license.expiresAt) {
    return false // No expiration
  }

  const expiryDate = new Date(license.expiresAt)
  const now = new Date()
  const gracePeriodMs = 3 * 24 * 60 * 60 * 1000 // 3 days

  const effectiveExpiry = new Date(expiryDate.getTime() + gracePeriodMs)

  return now > effectiveExpiry
}

// Get current usage stats
export function getUsage() {
  if (!existsSync(USAGE_FILE)) {
    return {
      month: new Date().toISOString().substring(0, 7), // YYYY-MM
      count: 0,
      lastReset: new Date().toISOString(),
      lastRun: null,
    }
  }

  try {
    const usage = JSON.parse(readFileSync(USAGE_FILE, 'utf8'))

    // Check if we need to reset for new month
    const currentMonth = new Date().toISOString().substring(0, 7)
    if (usage.month !== currentMonth) {
      usage.month = currentMonth
      usage.count = 0
      usage.lastReset = new Date().toISOString()
      saveUsage(usage)
    }

    return usage
  } catch (error) {
    console.error('Error loading usage:', error.message)
    return {
      month: new Date().toISOString().substring(0, 7),
      count: 0,
      lastReset: new Date().toISOString(),
      lastRun: null,
    }
  }
}

// Save usage stats
export function saveUsage(usage) {
  try {
    writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2))
    return true
  } catch (error) {
    console.error('Error saving usage:', error.message)
    return false
  }
}

// Increment usage counter
export function incrementUsage() {
  const usage = getUsage()
  usage.count++
  usage.lastRun = new Date().toISOString()
  saveUsage(usage)
  return usage
}

// Check if user can process bookmarks
export function canProcessBookmarks(license, usage) {
  const tier = TIERS[license.tier]

  // Check expiration
  if (isLicenseExpired(license)) {
    return {
      allowed: false,
      reason: 'License expired. Please renew your subscription.',
      inGracePeriod: false,
    }
  }

  // Check grace period warning
  if (license.expiresAt) {
    const expiryDate = new Date(license.expiresAt)
    const now = new Date()
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000
    const withinGracePeriod =
      now > expiryDate && now <= new Date(expiryDate.getTime() + gracePeriodMs)

    if (withinGracePeriod) {
      const daysLeft = Math.ceil(
        (new Date(expiryDate.getTime() + gracePeriodMs) - now) / (24 * 60 * 60 * 1000),
      )
      return {
        allowed: true,
        reason: `Grace period: ${daysLeft} days left. Please renew soon.`,
        inGracePeriod: true,
      }
    }
  }

  // Check monthly limit
  if (tier.monthlyLimit !== -1 && usage.count >= tier.monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${tier.monthlyLimit} bookmarks). Upgrade for unlimited processing.`,
      inGracePeriod: false,
    }
  }

  // Check rate limit for free tier (1 per hour)
  if (license.tier === 'free' && usage.lastRun) {
    const lastRun = new Date(usage.lastRun)
    const now = new Date()
    const hoursSinceLastRun = (now - lastRun) / (60 * 60 * 1000)

    if (hoursSinceLastRun < 1) {
      const minutesLeft = Math.ceil(60 - hoursSinceLastRun * 60)
      return {
        allowed: false,
        reason: `Rate limit: Free tier allows 1 run per hour. Try again in ${minutesLeft} minutes.`,
        inGracePeriod: false,
      }
    }
  }

  return { allowed: true }
}

// Get license status summary
export function getLicenseStatus() {
  const license = loadLicense()
  const usage = getUsage()
  const tier = TIERS[license.tier]
  const canProcess = canProcessBookmarks(license, usage)

  return {
    tier: license.tier,
    tierName: tier.name,
    features: tier,
    usage: {
      current: usage.count,
      limit: tier.monthlyLimit === -1 ? 'unlimited' : tier.monthlyLimit,
      month: usage.month,
      lastRun: usage.lastRun,
    },
    canProcess: canProcess.allowed,
    message: canProcess.reason || 'Ready to process bookmarks',
    inGracePeriod: canProcess.inGracePeriod || false,
    expiresAt: license.expiresAt || null,
    key: license.key || null,
  }
}

// Activate a license key
export function activateLicense(key, email) {
  const validation = validateLicenseKey(key)

  if (!validation) {
    return { success: false, error: 'Invalid license key format' }
  }

  const license = {
    tier: validation.tier,
    key: key,
    email: email || 'unknown@example.com',
    activatedAt: new Date().toISOString(),
    expiresAt: null, // Set by payment system for paid tiers
  }

  if (saveLicense(license)) {
    return { success: true, license }
  } else {
    return { success: false, error: 'Failed to save license' }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  switch (command) {
    case 'check':
    case 'status':
      const status = getLicenseStatus()
      console.log('\n=== License Status ===')
      console.log(`Tier: ${status.tierName}`)
      console.log(`Usage: ${status.usage.current}/${status.usage.limit} this month`)
      console.log(`Status: ${status.message}`)

      if (status.expiresAt) {
        console.log(`Expires: ${new Date(status.expiresAt).toLocaleDateString()}`)
      }

      console.log('\nFeatures:')
      console.log(
        `  Monthly Limit: ${status.features.monthlyLimit === -1 ? 'Unlimited' : status.features.monthlyLimit}`,
      )
      console.log(`  Automation: ${status.features.automation ? '✓' : '✗'}`)
      console.log(`  LLM Analysis: ${status.features.llmAnalysis ? '✓' : '✗'}`)
      console.log(`  Notifications: ${status.features.notifications ? '✓' : '✗'}`)

      if (status.tier === 'enterprise') {
        console.log(`  Team Sharing: ✓`)
        console.log(`  Custom Models: ✓`)
        console.log(`  API Access: ✓`)
      }

      console.log('')
      break

    case 'activate':
      const key = process.argv[3]
      const email = process.argv[4] || 'user@example.com'

      if (!key) {
        console.error('Usage: node license.js activate <license-key> [email]')
        process.exit(1)
      }

      const result = activateLicense(key, email)
      if (result.success) {
        console.log(`✓ License activated: ${result.license.tier}`)
      } else {
        console.error(`✗ Activation failed: ${result.error}`)
        process.exit(1)
      }
      break

    case 'reset-usage':
      // For testing purposes
      const usage = getUsage()
      usage.count = 0
      saveUsage(usage)
      console.log('Usage counter reset to 0')
      break

    default:
      console.log('Usage:')
      console.log('  node license.js check           - Show license status')
      console.log('  node license.js activate <key>  - Activate license key')
      console.log('  node license.js reset-usage     - Reset usage counter (testing)')
      process.exit(1)
  }
}
