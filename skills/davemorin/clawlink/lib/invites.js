/**
 * ClawLink Invite System
 *
 * Simple link-based connection flow:
 * 1. Alice creates invite → gets link
 * 2. Alice sends link to Bob (out of band)
 * 3. Bob claims invite → pending approval
 * 4. Alice approves → connected
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

import crypto from './crypto.js'
import relay from './relay.js'

const DATA_DIR = join(homedir(), '.clawdbot', 'clawlink')
const IDENTITY_FILE = join(DATA_DIR, 'identity.json')
const FRIENDS_FILE = join(DATA_DIR, 'friends.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')
const INVITES_FILE = join(DATA_DIR, 'invites.json')

// ============================================================================
// File Operations
// ============================================================================

function ensureDir(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function loadIdentity() {
  if (!existsSync(IDENTITY_FILE)) {
    throw new Error('No identity found. Run clawlink init first.')
  }
  return JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'))
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return { displayName: 'ClawLink User' }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
}

function loadFriends() {
  if (!existsSync(FRIENDS_FILE)) return { friends: [] }
  return JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'))
}

function saveFriends(data) {
  ensureDir(FRIENDS_FILE)
  writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2))
}

function loadInvites() {
  if (!existsSync(INVITES_FILE)) return { created: [], claimed: [] }
  return JSON.parse(readFileSync(INVITES_FILE, 'utf8'))
}

function saveInvites(data) {
  ensureDir(INVITES_FILE)
  writeFileSync(INVITES_FILE, JSON.stringify(data, null, 2))
}

// ============================================================================
// Invite Creation
// ============================================================================

/**
 * Create a new invite link
 *
 * @returns {Promise<{token: string, link: string, expiresAt: string}>}
 */
export async function createInvite() {
  const identity = loadIdentity()
  const config = loadConfig()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const creatorHex = relay.base64ToHex(identity.publicKey)
  const creatorX25519Hex = relay.base64ToHex(identity.x25519PublicKey)

  // Sign the request
  const signPayload = `invite:create:${creatorHex}:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator: creatorHex,
      creatorX25519: creatorX25519Hex,
      creatorName: config.displayName,
      timestamp,
      signature: relay.base64ToHex(signature),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create invite')
  }

  const result = await response.json()

  // Save locally
  const invites = loadInvites()
  invites.created.push({
    token: result.token,
    createdAt: new Date().toISOString(),
    expiresAt: result.expiresAt,
    status: 'pending',
    claimer: null,
  })
  saveInvites(invites)

  return result
}

// ============================================================================
// Invite Claiming
// ============================================================================

/**
 * Parse an invite link to extract the token
 *
 * @param {string} link - Invite link (https://clawlink.dev/c/TOKEN or clawlink://c/TOKEN)
 * @returns {string} Token
 */
export function parseInviteLink(link) {
  // Handle various formats
  const patterns = [
    /clawlink\.dev\/c\/([a-zA-Z0-9]+)/,
    /clawlink:\/\/c\/([a-zA-Z0-9]+)/,
    /\/c\/([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]{8,})$/, // Just the token
  ]

  for (const pattern of patterns) {
    const match = link.match(pattern)
    if (match) return match[1]
  }

  throw new Error('Invalid invite link format')
}

/**
 * Claim an invite link
 *
 * @param {string} linkOrToken - Invite link or token
 * @returns {Promise<{claimed: boolean, creator: string, creatorName: string, status: string}>}
 */
export async function claimInvite(linkOrToken) {
  const token = parseInviteLink(linkOrToken)
  const identity = loadIdentity()
  const config = loadConfig()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const claimerHex = relay.base64ToHex(identity.publicKey)
  const claimerX25519Hex = relay.base64ToHex(identity.x25519PublicKey)

  // Sign the request
  const signPayload = `invite:claim:${token}:${claimerHex}:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      claimer: claimerHex,
      claimerX25519: claimerX25519Hex,
      claimerName: config.displayName,
      timestamp,
      signature: relay.base64ToHex(signature),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to claim invite')
  }

  const result = await response.json()

  // Save locally
  const invites = loadInvites()
  invites.claimed.push({
    token,
    claimedAt: new Date().toISOString(),
    creator: {
      publicKey: result.creator,
      displayName: result.creatorName,
    },
    status: 'pending_approval',
  })
  saveInvites(invites)

  return result
}

// ============================================================================
// Pending Invites
// ============================================================================

/**
 * Get invites pending approval (invites you created that someone claimed)
 *
 * @returns {Promise<Array>}
 */
export async function getPendingApprovals() {
  const identity = loadIdentity()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signPayload = `invite:pending:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/pending`, {
    method: 'GET',
    headers: {
      'X-ClawLink-Key': `ed25519:${relay.base64ToHex(identity.publicKey)}`,
      'X-ClawLink-Timestamp': timestamp,
      'X-ClawLink-Signature': relay.base64ToHex(signature),
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get pending invites')
  }

  const result = await response.json()
  return result.pending || []
}

// ============================================================================
// Approval / Rejection
// ============================================================================

/**
 * Approve a claimed invite (finalizes connection)
 *
 * @param {string} token - Invite token
 * @returns {Promise<{approved: boolean, friend: object}>}
 */
export async function approveInvite(token) {
  const identity = loadIdentity()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signPayload = `invite:approve:${token}:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      approver: relay.base64ToHex(identity.publicKey),
      timestamp,
      signature: relay.base64ToHex(signature),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to approve invite')
  }

  const result = await response.json()

  // Add as friend
  const friendsData = loadFriends()
  const sharedSecret = crypto.deriveSharedSecret(
    identity.x25519SecretKey,
    relay.hexToBase64(result.friend.x25519PublicKey),
  )

  const newFriend = {
    displayName: result.friend.displayName,
    publicKey: relay.hexToBase64(result.friend.publicKey),
    x25519PublicKey: relay.hexToBase64(result.friend.x25519PublicKey),
    sharedSecret: Buffer.from(sharedSecret).toString('base64'),
    addedAt: new Date().toISOString(),
    addedVia: 'invite_approved',
  }

  friendsData.friends.push(newFriend)
  saveFriends(friendsData)

  // Update local invite status
  const invites = loadInvites()
  const invite = invites.created.find((i) => i.token === token)
  if (invite) {
    invite.status = 'approved'
    invite.approvedAt = new Date().toISOString()
    saveInvites(invites)
  }

  return { approved: true, friend: newFriend }
}

/**
 * Reject a claimed invite
 *
 * @param {string} token - Invite token
 * @returns {Promise<{rejected: boolean}>}
 */
export async function rejectInvite(token) {
  const identity = loadIdentity()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signPayload = `invite:reject:${token}:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      rejector: relay.base64ToHex(identity.publicKey),
      timestamp,
      signature: relay.base64ToHex(signature),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reject invite')
  }

  // Update local invite status
  const invites = loadInvites()
  const invite = invites.created.find((i) => i.token === token)
  if (invite) {
    invite.status = 'rejected'
    invite.rejectedAt = new Date().toISOString()
    saveInvites(invites)
  }

  return { rejected: true }
}

// ============================================================================
// Status Checking
// ============================================================================

/**
 * Check status of an invite you claimed (to see if approved)
 *
 * @param {string} token - Invite token
 * @returns {Promise<{status: string, creator?: object}>}
 */
export async function checkInviteStatus(token) {
  const identity = loadIdentity()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signPayload = `invite:status:${token}:${timestamp}`
  const signature = crypto.sign(signPayload, identity.secretKey)

  const response = await fetch(`${relay.RELAY_URL}/invite/status?token=${token}`, {
    method: 'GET',
    headers: {
      'X-ClawLink-Key': `ed25519:${relay.base64ToHex(identity.publicKey)}`,
      'X-ClawLink-Timestamp': timestamp,
      'X-ClawLink-Signature': relay.base64ToHex(signature),
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to check invite status')
  }

  const result = await response.json()

  // If approved, add as friend
  if (result.status === 'approved' && result.creator) {
    const friendsData = loadFriends()
    const existingFriend = friendsData.friends.find(
      (f) => f.publicKey === relay.hexToBase64(result.creator.publicKey),
    )

    if (!existingFriend) {
      const sharedSecret = crypto.deriveSharedSecret(
        identity.x25519SecretKey,
        relay.hexToBase64(result.creator.x25519PublicKey),
      )

      const newFriend = {
        displayName: result.creator.displayName,
        publicKey: relay.hexToBase64(result.creator.publicKey),
        x25519PublicKey: relay.hexToBase64(result.creator.x25519PublicKey),
        sharedSecret: Buffer.from(sharedSecret).toString('base64'),
        addedAt: new Date().toISOString(),
        addedVia: 'invite_claimed',
      }

      friendsData.friends.push(newFriend)
      saveFriends(friendsData)

      result.friend = newFriend
    }

    // Update local invite status
    const invites = loadInvites()
    const invite = invites.claimed.find((i) => i.token === token)
    if (invite) {
      invite.status = 'approved'
      saveInvites(invites)
    }
  }

  return result
}

/**
 * Get all local invites (created and claimed)
 */
export function getLocalInvites() {
  return loadInvites()
}

export default {
  createInvite,
  parseInviteLink,
  claimInvite,
  getPendingApprovals,
  approveInvite,
  rejectInvite,
  checkInviteStatus,
  getLocalInvites,
}
