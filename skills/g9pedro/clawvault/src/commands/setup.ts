import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { hasQmd } from '../lib/search.js'
import { DEFAULT_CATEGORIES } from '../types.js'
const CONFIG_FILE = '.clawvault.json'
function resolveVaultTarget(): { vaultPath: string; source: string; existed: boolean } {
  const envPath = process.env.CLAWVAULT_PATH?.trim()
  const home = os.homedir()

  // If CLAWVAULT_PATH is set, always use it (create if needed)
  if (envPath) {
    const vaultPath = path.resolve(envPath)
    return { vaultPath, source: 'CLAWVAULT_PATH', existed: fs.existsSync(vaultPath) }
  }

  // Otherwise check for existing vaults in priority order
  const candidates = [
    { vaultPath: path.join(home, '.openclaw', 'workspace', 'memory'), source: 'OpenClaw default' },
    { vaultPath: path.resolve(process.cwd(), 'memory'), source: './memory' },
    { vaultPath: path.join(home, 'memory'), source: '~/memory' },
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.vaultPath)) {
      return { ...candidate, existed: true }
    }
  }

  // Default to OpenClaw path for new vaults
  const fallback = candidates[0]
  return { ...fallback, existed: false }
}
function ensureVaultStructure(vaultPath: string): boolean {
  fs.mkdirSync(vaultPath, { recursive: true })
  for (const category of DEFAULT_CATEGORIES) {
    fs.mkdirSync(path.join(vaultPath, category), { recursive: true })
  }
  const configPath = path.join(vaultPath, CONFIG_FILE)
  if (fs.existsSync(configPath)) return false
  const now = new Date().toISOString()
  const name = path.basename(vaultPath)
  const meta = {
    name,
    version: '1.0.0',
    created: now,
    lastUpdated: now,
    categories: DEFAULT_CATEGORIES,
    documentCount: 0,
    qmdCollection: name,
    qmdRoot: vaultPath,
  }
  fs.writeFileSync(configPath, JSON.stringify(meta, null, 2))
  return true
}
function getQmdConfig(vaultPath: string): { collection: string; root: string } {
  const configPath = path.join(vaultPath, CONFIG_FILE)
  if (fs.existsSync(configPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
        name?: string
        qmdCollection?: string
        qmdRoot?: string
      }
      return {
        collection: meta.qmdCollection || meta.name || path.basename(vaultPath),
        root: meta.qmdRoot || vaultPath,
      }
    } catch {
      return { collection: path.basename(vaultPath), root: vaultPath }
    }
  }
  return { collection: path.basename(vaultPath), root: vaultPath }
}
export async function setupCommand(): Promise<void> {
  const target = resolveVaultTarget()
  if (target.existed && !fs.statSync(target.vaultPath).isDirectory()) {
    throw new Error(`Vault path is not a directory: ${target.vaultPath}`)
  }
  if (!target.existed) fs.mkdirSync(target.vaultPath, { recursive: true })
  console.log(
    `${target.existed ? 'Found' : 'Created'} vault path (${target.source}): ${target.vaultPath}`,
  )
  const initialized = ensureVaultStructure(target.vaultPath)
  console.log(initialized ? 'Initialized vault structure.' : 'Vault structure already present.')
  console.log('\nTip: add this to your shell config:')
  console.log(`  export CLAWVAULT_PATH="${target.vaultPath}"`)
  if (hasQmd()) {
    const { collection, root } = getQmdConfig(target.vaultPath)
    try {
      execFileSync('qmd', ['collection', 'add', root, '--name', collection, '--mask', '**/*.md'], {
        stdio: 'ignore',
      })
      console.log(`qmd collection ready: ${collection}`)
    } catch {
      console.log('qmd collection already exists or could not be created.')
    }
  } else {
    console.log('qmd not found; skipping collection setup.')
  }
}
