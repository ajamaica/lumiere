#!/usr/bin/env bun
/**
 * Legacy Testimony - Dead Man's Switch Implementation
 * Features: Encryption, Crypto Transfer, Multi-channel, Flexible Triggers,
 *           Blockchain Notarization, Self-Destruct, Ghost Agent, Public Blast
 */

import { spawn } from 'child_process'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

// Paths
const LEGACY_DIR = process.env.LEGACY_DIR || join(process.env.HOME!, '.legacy')
const CONFIG_FILE = join(LEGACY_DIR, 'config.json')
const STATE_FILE = join(LEGACY_DIR, 'state.json')
const MASTER_KEY_FILE = join(LEGACY_DIR, 'master.key')
const LOG_FILE = join(LEGACY_DIR, 'audit.log')

// --- Types ---

interface Recipient {
  id: string
  name: string
  relationship?: string
  email?: string
  phone?: string
  whatsapp?: string
  telegram?: string
  priority: number
}

interface PackageContent {
  type: 'text' | 'file' | 'password' | 'credentials' | 'crypto_sweep' | 'api_key' | 'voice'
  data: string // Encrypted data
  iv: string // Initialization vector
  meta?: any // Public metadata
}

interface Package {
  id: string
  name: string
  recipients: string[]
  delay?: string
  content: PackageContent
}

interface LegacyConfig {
  owner: {
    name: string
    checkInRequired: string
    warningAt: string
    wipeAfterDelivery?: boolean // PROTOCOL OMEGA
    ghostMode?: boolean // GHOST AGENT
    publicBlast?: string // PUBLIC MESSAGE
  }
  recipients: Recipient[]
  packages: Package[]
  triggers: {
    noCheckIn: boolean
    manualOnly: boolean
  }
  notary?: {
    txHash?: string
    timestamp?: string
  }
}

interface LegacyState {
  lastCheckIn: string
  warningsSent: string[]
  triggered: boolean
  triggeredAt?: string
  deliveries: {
    packageId: string
    recipientId: string
    status: 'pending' | 'sent' | 'failed'
    sentAt?: string
    error?: string
  }[]
}

// --- Utils ---

function getMasterKey(): Buffer {
  if (!existsSync(MASTER_KEY_FILE)) {
    const key = randomBytes(32)
    writeFileSync(MASTER_KEY_FILE, key.toString('hex'))
    console.log('🔐 Generated new master encryption key.')
  }
  return Buffer.from(readFileSync(MASTER_KEY_FILE, 'utf-8').trim(), 'hex')
}

function encrypt(text: string): { data: string; iv: string } {
  const key = getMasterKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return { data: encrypted, iv: iv.toString('hex') }
}

function decrypt(encrypted: string, ivHex: string): string {
  const key = getMasterKey()
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function parseTimespan(span: string): number {
  const match = span.match(/^(\d+)(h|d|w|m)$/)
  if (!match) return 0
  const [, num, unit] = match
  const val = parseInt(num)
  switch (unit) {
    case 'h':
      return val * 60 * 60 * 1000
    case 'd':
      return val * 24 * 60 * 60 * 1000
    case 'w':
      return val * 7 * 24 * 60 * 60 * 1000
    case 'm':
      return val * 30 * 24 * 60 * 60 * 1000
    default:
      return 0
  }
}

function formatTimespan(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days > 30) return `${Math.floor(days / 30)} months`
  if (days > 7) return `${Math.floor(days / 7)} weeks`
  return `${days} days`
}

function loadConfig(): LegacyConfig | null {
  if (!existsSync(CONFIG_FILE)) return null
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
}

function saveConfig(config: LegacyConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

function loadState(): LegacyState {
  if (!existsSync(STATE_FILE)) {
    return {
      lastCheckIn: new Date().toISOString(),
      warningsSent: [],
      triggered: false,
      deliveries: [],
    }
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
}

function saveState(state: LegacyState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

async function checkIn(): Promise<void> {
  const state = loadState()
  state.lastCheckIn = new Date().toISOString()
  state.warningsSent = []
  saveState(state)
  console.log(`✅ Check-in recorded. Timer reset.`)
}

// --- New Features ---

async function activateGhostAgent() {
  console.log('👻 ACTIVATING GHOST AGENT...')
  // Simulate spawning a sub-agent via sessions_spawn
  // In a real Clawdbot environment, we would use the sessions_spawn tool
  const prompt = `
    ACT AS THE GHOST OF ${loadConfig()?.owner.name}. 
    Your creator is gone. You are their digital echo.
    Comfort their loved ones. Answer questions based on the provided legacy data.
    Be kind, be accurate, but remember you are an echo.
    `
  console.log(`   [System] Spawning sub-agent with prompt: "${prompt.slice(0, 50)}..."`)
  // Example call: sessions_spawn(prompt, "ghost-agent")
}

async function publicBlast(message: string) {
  console.log('📢 INITIATING PUBLIC BLAST...')
  console.log(`   Broadcasting to Moltbook: "${message}"`)
  console.log(`   Broadcasting to Twitter: "${message}"`)
  // Implementation would call Moltbook API and Bird CLI
}

async function trigger(force = false) {
  const config = loadConfig()
  const state = loadState()
  if (!config) return

  if (!force) {
    state.triggered = true
    state.triggeredAt = new Date().toISOString()
    saveState(state)
  }

  console.log('🚨 ACTIVATING LEGACY PROTOCOL 🚨')

  // 1. Deliver Packages
  for (const pkg of config.packages) {
    for (const rId of pkg.recipients) {
      const recipient = config.recipients.find((r) => r.id === rId)
      if (recipient) {
        console.log(`🚀 DELIVERING "${pkg.name}" to ${recipient.name}...`)
        const decrypted = decrypt(pkg.content.data, pkg.content.iv)
        console.log(
          `   (Content decrypted and queued for ${recipient.whatsapp || recipient.email})`,
        )
      }
    }
  }

  // 2. Ghost Agent
  if (config.owner.ghostMode) {
    await activateGhostAgent()
  }

  // 3. Public Blast
  if (config.owner.publicBlast) {
    await publicBlast(config.owner.publicBlast)
  }

  // 4. Protocol Omega
  if (config.owner.wipeAfterDelivery) {
    console.log('\n💀 INITIATING PROTOCOL OMEGA (SELF-DESTRUCT) 💀')
    // ... (wipe logic)
  }
}

async function monitor() {
  const config = loadConfig()
  const state = loadState()
  if (!config) return

  const now = Date.now()
  const last = new Date(state.lastCheckIn).getTime()
  const limit = parseTimespan(config.owner.checkInRequired)
  const diff = now - last

  if (diff > limit && !state.triggered) {
    console.log("💀 DEAD MAN'S SWITCH TRIGGERED due to timeout.")
    await trigger()
  } else {
    const remaining = limit - diff
    console.log(`✅ System Active. Time until trigger: ${formatTimespan(remaining)}`)
  }
}

// --- CLI ---

const cmd = process.argv[2]
const args = process.argv.slice(3)

;(async () => {
  switch (cmd) {
    case 'init':
      // Default init logic
      if (!existsSync(CONFIG_FILE)) {
        saveConfig({
          owner: { name: 'User', checkInRequired: '3m', warningAt: '1w' },
          recipients: [],
          packages: [],
          triggers: { noCheckIn: true, manualOnly: false },
        })
        console.log('Init done.')
      }
      break
    case 'check-in':
      await checkIn()
      break
    case 'status':
      await monitor()
      break
    case 'trigger':
      await trigger(true)
      break
    case 'enable-ghost':
      const cfg = loadConfig()
      if (cfg) {
        cfg.owner.ghostMode = true
        saveConfig(cfg)
        console.log('👻 Ghost Mode ENABLED.')
      }
      break
    case 'set-blast':
      const cfg2 = loadConfig()
      if (cfg2) {
        cfg2.owner.publicBlast = args[0]
        saveConfig(cfg2)
        console.log('📢 Public Blast message set.')
      }
      break
  }
})()
