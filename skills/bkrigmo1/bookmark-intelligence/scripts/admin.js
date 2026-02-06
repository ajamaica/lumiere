#!/usr/bin/env node
/**
 * Admin Dashboard
 * License management and revenue tracking (for seller/Brian)
 */

import crypto from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { completePayment, getRevenueStats, listPayments } from './payment.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const LICENSES_DB_FILE = join(SKILL_DIR, 'licenses-admin.json')

// Load admin licenses database
function loadLicensesDB() {
  if (!existsSync(LICENSES_DB_FILE)) {
    return { licenses: [], issued: 0, revoked: 0 }
  }

  try {
    return JSON.parse(readFileSync(LICENSES_DB_FILE, 'utf8'))
  } catch (error) {
    console.error('Error loading licenses DB:', error.message)
    return { licenses: [], issued: 0, revoked: 0 }
  }
}

// Save admin licenses database
function saveLicensesDB(db) {
  try {
    writeFileSync(LICENSES_DB_FILE, JSON.stringify(db, null, 2))
    return true
  } catch (error) {
    console.error('Error saving licenses DB:', error.message)
    return false
  }
}

// Generate license key
function generateLicenseKey(tier) {
  const tierPrefix =
    {
      free: 'FREE',
      pro: 'PRO',
      enterprise: 'ENT',
    }[tier] || 'FREE'

  const randomHex = crypto.randomBytes(12).toString('hex').toUpperCase()
  return `${tierPrefix}-${randomHex}`
}

// Issue a new license
function issueLicense(tier, email, duration = 'monthly', notes = '') {
  const db = loadLicensesDB()

  const licenseKey = generateLicenseKey(tier)

  // Calculate expiry
  let expiresAt = null
  if (tier !== 'free') {
    expiresAt = new Date()
    if (duration === 'trial') {
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day trial
    } else if (duration === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else if (duration === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else if (duration === 'lifetime') {
      expiresAt = null // No expiry
    }
  }

  const license = {
    key: licenseKey,
    tier,
    email,
    duration,
    issuedAt: new Date().toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    status: 'active',
    notes,
    issuedBy: 'admin',
  }

  db.licenses.push(license)
  db.issued++
  saveLicensesDB(db)

  return license
}

// Revoke a license
function revokeLicense(licenseKey, reason = '') {
  const db = loadLicensesDB()
  const license = db.licenses.find((l) => l.key === licenseKey)

  if (!license) {
    return { success: false, error: 'License not found' }
  }

  if (license.status === 'revoked') {
    return { success: false, error: 'License already revoked' }
  }

  license.status = 'revoked'
  license.revokedAt = new Date().toISOString()
  license.revokeReason = reason

  db.revoked++
  saveLicensesDB(db)

  return { success: true, license }
}

// List all licenses
function listLicenses(filter = {}) {
  const db = loadLicensesDB()
  let licenses = db.licenses

  if (filter.tier) {
    licenses = licenses.filter((l) => l.tier === filter.tier)
  }

  if (filter.status) {
    licenses = licenses.filter((l) => l.status === filter.status)
  }

  if (filter.email) {
    licenses = licenses.filter((l) => l.email.includes(filter.email))
  }

  return licenses
}

// Get license details
function getLicenseDetails(licenseKey) {
  const db = loadLicensesDB()
  const license = db.licenses.find((l) => l.key === licenseKey)

  if (!license) {
    return null
  }

  // Check if expired
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    license.expired = true
  }

  return license
}

// Display dashboard
function displayDashboard() {
  console.log('\n' + '='.repeat(80))
  console.log('BOOKMARK INTELLIGENCE - ADMIN DASHBOARD')
  console.log('='.repeat(80))

  // Revenue stats
  const revenue = getRevenueStats()
  console.log('\n💰 REVENUE STATS')
  console.log(`   Total Revenue: $${revenue.totalRevenue.toFixed(2)}`)
  console.log(`   Total Payments: ${revenue.totalPayments}`)
  console.log(`   Pending: ${revenue.pending}`)
  console.log(`   By Method: Stripe ${revenue.byMethod.stripe} | Crypto ${revenue.byMethod.crypto}`)
  console.log(`   By Tier: Pro ${revenue.byTier.pro} | Enterprise ${revenue.byTier.enterprise}`)

  // License stats
  const db = loadLicensesDB()
  const activeLicenses = db.licenses.filter((l) => l.status === 'active')
  const expiredLicenses = activeLicenses.filter(
    (l) => l.expiresAt && new Date(l.expiresAt) < new Date(),
  )

  console.log('\n📜 LICENSE STATS')
  console.log(`   Total Issued: ${db.issued}`)
  console.log(`   Active: ${activeLicenses.length}`)
  console.log(`   Expired: ${expiredLicenses.length}`)
  console.log(`   Revoked: ${db.revoked}`)

  // Recent payments
  const recentPayments = listPayments({ status: 'completed' }).slice(-5)
  if (recentPayments.length > 0) {
    console.log('\n📊 RECENT PAYMENTS')
    recentPayments.forEach((p) => {
      console.log(
        `   ${new Date(p.completedAt).toLocaleDateString()} - ${p.tier} - $${p.amount} - ${p.method}`,
      )
    })
  }

  console.log('\n' + '='.repeat(80))
}

// Display license list
function displayLicenseList(licenses) {
  if (licenses.length === 0) {
    console.log('No licenses found.')
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log('LICENSES')
  console.log('='.repeat(80))

  licenses.forEach((license) => {
    const expired = license.expiresAt && new Date(license.expiresAt) < new Date()
    const statusEmoji = license.status === 'active' ? (expired ? '⚠️' : '✓') : '✗'

    console.log(`\n${statusEmoji} ${license.key}`)
    console.log(`   Tier: ${license.tier}`)
    console.log(`   Email: ${license.email}`)
    console.log(`   Status: ${license.status}${expired ? ' (EXPIRED)' : ''}`)
    console.log(`   Issued: ${new Date(license.issuedAt).toLocaleDateString()}`)

    if (license.expiresAt) {
      console.log(`   Expires: ${new Date(license.expiresAt).toLocaleDateString()}`)
    }

    if (license.notes) {
      console.log(`   Notes: ${license.notes}`)
    }

    if (license.status === 'revoked') {
      console.log(`   Revoked: ${new Date(license.revokedAt).toLocaleDateString()}`)
      console.log(`   Reason: ${license.revokeReason}`)
    }
  })

  console.log('\n' + '='.repeat(80))
}

// CLI interface
const command = process.argv[2]

switch (command) {
  case 'dashboard':
    displayDashboard()
    break

  case 'issue':
    const tier = process.argv[3]
    const email = process.argv[4]
    const duration = process.argv[5] || 'monthly'
    const notes = process.argv.slice(6).join(' ')

    if (!tier || !email) {
      console.error('Usage: node admin.js issue <tier> <email> [duration] [notes]')
      console.error('Tiers: free, pro, enterprise')
      console.error('Durations: trial, monthly, yearly, lifetime')
      process.exit(1)
    }

    const license = issueLicense(tier, email, duration, notes)
    console.log('\n✓ License issued successfully!')
    console.log(`\nLicense Key: ${license.key}`)
    console.log(`Tier: ${license.tier}`)
    console.log(`Email: ${license.email}`)
    if (license.expiresAt) {
      console.log(`Expires: ${new Date(license.expiresAt).toLocaleDateString()}`)
    } else {
      console.log(`Expires: Never`)
    }
    console.log('\nSend this key to the user for activation.')
    break

  case 'revoke':
    const keyToRevoke = process.argv[3]
    const reason = process.argv.slice(4).join(' ') || 'No reason provided'

    if (!keyToRevoke) {
      console.error('Usage: node admin.js revoke <license-key> [reason]')
      process.exit(1)
    }

    const revokeResult = revokeLicense(keyToRevoke, reason)
    if (revokeResult.success) {
      console.log(`✓ License ${keyToRevoke} revoked`)
      console.log(`Reason: ${reason}`)
    } else {
      console.error(`✗ ${revokeResult.error}`)
      process.exit(1)
    }
    break

  case 'list':
    const filterTier = process.argv[3]
    const filterStatus = process.argv[4]

    const filter = {}
    if (filterTier && ['free', 'pro', 'enterprise'].includes(filterTier)) {
      filter.tier = filterTier
    }
    if (filterStatus && ['active', 'revoked'].includes(filterStatus)) {
      filter.status = filterStatus
    }

    const licenses = listLicenses(filter)
    displayLicenseList(licenses)
    break

  case 'lookup':
    const keyToLookup = process.argv[3]

    if (!keyToLookup) {
      console.error('Usage: node admin.js lookup <license-key>')
      process.exit(1)
    }

    const details = getLicenseDetails(keyToLookup)
    if (details) {
      displayLicenseList([details])
    } else {
      console.error('License not found')
      process.exit(1)
    }
    break

  case 'payments':
    const paymentStatus = process.argv[3] || 'all'
    const filter2 = paymentStatus !== 'all' ? { status: paymentStatus } : {}

    const payments = listPayments(filter2)

    console.log('\n' + '='.repeat(80))
    console.log('PAYMENTS')
    console.log('='.repeat(80))

    if (payments.length === 0) {
      console.log('No payments found.')
    } else {
      payments.forEach((p) => {
        console.log(`\n${p.status === 'completed' ? '✓' : '⏳'} ${p.id}`)
        console.log(`   Method: ${p.method}`)
        console.log(`   Tier: ${p.tier} (${p.period})`)
        console.log(`   Amount: $${p.amount}`)
        console.log(`   Status: ${p.status}`)
        console.log(`   Created: ${new Date(p.createdAt).toLocaleDateString()}`)

        if (p.completedAt) {
          console.log(`   Completed: ${new Date(p.completedAt).toLocaleDateString()}`)
        }

        if (p.licenseKey) {
          console.log(`   License: ${p.licenseKey}`)
        }
      })
    }

    console.log('\n' + '='.repeat(80))
    break

  case 'revenue':
    const stats = getRevenueStats()
    console.log('\n' + '='.repeat(80))
    console.log('REVENUE STATISTICS')
    console.log('='.repeat(80))
    console.log(`\nTotal Revenue: $${stats.totalRevenue.toFixed(2)}`)
    console.log(`Total Payments: ${stats.totalPayments}`)
    console.log(`Pending Payments: ${stats.pending}`)
    console.log('\nBy Payment Method:')
    console.log(`  Stripe: ${stats.byMethod.stripe} payments`)
    console.log(`  Crypto: ${stats.byMethod.crypto} payments`)
    console.log('\nBy Tier:')
    console.log(`  Pro: ${stats.byTier.pro} subscriptions`)
    console.log(`  Enterprise: ${stats.byTier.enterprise} subscriptions`)
    console.log('\nBy Period:')
    console.log(`  Monthly: ${stats.byPeriod.monthly} subscriptions`)
    console.log(`  Yearly: ${stats.byPeriod.yearly} subscriptions`)
    console.log('\n' + '='.repeat(80))
    break

  default:
    console.log('Bookmark Intelligence - Admin Dashboard')
    console.log('\nUsage:')
    console.log('  node admin.js dashboard                              - Show overview')
    console.log('  node admin.js issue <tier> <email> [duration]        - Issue license')
    console.log('  node admin.js revoke <key> [reason]                  - Revoke license')
    console.log('  node admin.js list [tier] [status]                   - List licenses')
    console.log('  node admin.js lookup <key>                           - Lookup license')
    console.log('  node admin.js payments [status]                      - List payments')
    console.log('  node admin.js revenue                                - Revenue stats')
    console.log('\nExamples:')
    console.log('  node admin.js issue pro user@example.com trial')
    console.log('  node admin.js issue enterprise brian@example.com yearly')
    console.log('  node admin.js list pro active')
    console.log('  node admin.js revoke PRO-ABC123 "Refund requested"')
    process.exit(1)
}
