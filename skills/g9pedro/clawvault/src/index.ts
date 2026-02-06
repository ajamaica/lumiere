/**
 * ClawVault 🐘 — An Elephant Never Forgets
 *
 * Structured memory system for AI agents with Obsidian-compatible markdown
 * and embedded semantic search.
 *
 * @example
 * ```typescript
 * import { ClawVault, createVault, findVault } from 'clawvault';
 *
 * // Create a new vault
 * const vault = await createVault('./my-memory');
 *
 * // Store a memory
 * await vault.store({
 *   category: 'decisions',
 *   title: 'Use ClawVault',
 *   content: 'Decided to use ClawVault for memory management.'
 * });
 *
 * // Search memories
 * const results = await vault.find('memory management');
 * console.log(results);
 * ```
 */

import * as fs from 'fs'

// Core exports
export { setupCommand } from './commands/setup.js'
export {
  extractTags,
  extractWikiLinks,
  hasQmd,
  QMD_INSTALL_COMMAND,
  QMD_INSTALL_URL,
  qmdEmbed,
  QmdUnavailableError,
  qmdUpdate,
  SearchEngine,
} from './lib/search.js'
export type { TemplateVariables } from './lib/template-engine.js'
export { buildTemplateVariables, renderTemplate } from './lib/template-engine.js'
export { ClawVault, createVault, findVault } from './lib/vault.js'

// Type exports
export type {
  Category,
  Document,
  HandoffDocument,
  MemoryType,
  SearchOptions,
  SearchResult,
  SessionRecap,
  StoreOptions,
  SyncOptions,
  SyncResult,
  VaultConfig,
  VaultMeta,
} from './types.js'
export { DEFAULT_CATEGORIES, DEFAULT_CONFIG, MEMORY_TYPES, TYPE_TO_CATEGORY } from './types.js'

// Version
function readPackageVersion(): string {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url)
    const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf-8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export const VERSION = readPackageVersion()
