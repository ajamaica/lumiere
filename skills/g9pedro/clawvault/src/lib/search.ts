/**
 * ClawVault Search Engine - qmd Backend
 * Uses qmd CLI for BM25 and vector search
 */

import { execFileSync, spawnSync } from 'child_process'
import * as path from 'path'

import { Document, SearchOptions, SearchResult } from '../types.js'

export const QMD_INSTALL_URL = 'https://github.com/tobi/qmd'
export const QMD_INSTALL_COMMAND = 'bun install -g github:tobi/qmd'
const QMD_NOT_INSTALLED_MESSAGE = `ClawVault requires qmd. Install: ${QMD_INSTALL_COMMAND}`

export class QmdUnavailableError extends Error {
  constructor(message: string = QMD_NOT_INSTALLED_MESSAGE) {
    super(message)
    this.name = 'QmdUnavailableError'
  }
}

/**
 * QMD search result format
 */
interface QmdResult {
  docid: string
  score: number
  file: string
  title: string
  snippet: string
}

function ensureJsonArgs(args: string[]): string[] {
  return args.includes('--json') ? args : [...args, '--json']
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractJsonPayload(raw: string): string | null {
  const start = raw.search(/[\[{]/)
  if (start === -1) return null
  const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'))
  if (end <= start) return null
  return raw.slice(start, end + 1)
}

function parseQmdOutput(raw: string): QmdResult[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const direct = tryParseJson(trimmed)
  const extracted = direct ? null : extractJsonPayload(trimmed)
  const parsed = direct ?? (extracted ? tryParseJson(extracted) : null)

  if (!parsed) {
    throw new Error('qmd returned non-JSON output. Ensure qmd supports --json.')
  }

  if (Array.isArray(parsed)) {
    return parsed as QmdResult[]
  }

  if (parsed && typeof parsed === 'object') {
    const candidate =
      (parsed as { results?: unknown; items?: unknown; data?: unknown }).results ??
      (parsed as { results?: unknown; items?: unknown; data?: unknown }).items ??
      (parsed as { results?: unknown; items?: unknown; data?: unknown }).data

    if (Array.isArray(candidate)) {
      return candidate as QmdResult[]
    }
  }

  throw new Error('qmd returned an unexpected JSON shape.')
}

function ensureQmdAvailable(): void {
  if (!hasQmd()) {
    throw new QmdUnavailableError()
  }
}

/**
 * Execute qmd command and return parsed JSON
 */
function execQmd(args: string[]): QmdResult[] {
  ensureQmdAvailable()
  const finalArgs = ensureJsonArgs(args)

  try {
    const result = execFileSync('qmd', finalArgs, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    return parseQmdOutput(result)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new QmdUnavailableError()
    }

    const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n')
    if (output) {
      try {
        return parseQmdOutput(output)
      } catch {
        // Fall through to throw a helpful error
      }
    }

    const message = err?.message ? `qmd failed: ${err.message}` : 'qmd failed'
    throw new Error(message)
  }
}

/**
 * Check if qmd is available
 */
export function hasQmd(): boolean {
  const result = spawnSync('qmd', ['--version'], { stdio: 'ignore' })
  return !result.error
}

/**
 * Trigger qmd update (reindex)
 */
export function qmdUpdate(collection?: string): void {
  ensureQmdAvailable()
  const args = ['update']
  if (collection) {
    args.push('-c', collection)
  }
  execFileSync('qmd', args, { stdio: 'inherit' })
}

/**
 * Trigger qmd embed (create/update vector embeddings)
 */
export function qmdEmbed(collection?: string): void {
  ensureQmdAvailable()
  const args = ['embed']
  if (collection) {
    args.push('-c', collection)
  }
  execFileSync('qmd', args, { stdio: 'inherit' })
}

/**
 * QMD Search Engine - wraps qmd CLI
 */
export class SearchEngine {
  private documents: Map<string, Document> = new Map()
  private collection: string = 'clawvault'
  private vaultPath: string = ''
  private collectionRoot: string = ''

  /**
   * Set the collection name (usually vault name)
   */
  setCollection(name: string): void {
    this.collection = name
  }

  /**
   * Set the vault path for file resolution
   */
  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath
  }

  /**
   * Set the collection root for qmd:// URI resolution
   */
  setCollectionRoot(root: string): void {
    this.collectionRoot = path.resolve(root)
  }

  /**
   * Add or update a document in the local cache
   * Note: qmd indexing happens via qmd update command
   */
  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc)
  }

  /**
   * Remove a document from the local cache
   */
  removeDocument(id: string): void {
    this.documents.delete(id)
  }

  /**
   * No-op for qmd - indexing is managed externally
   */
  rebuildIDF(): void {
    // qmd handles this
  }

  /**
   * BM25 search via qmd
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.runQmdQuery('search', query, options)
  }

  /**
   * Vector/semantic search via qmd vsearch
   */
  vsearch(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.runQmdQuery('vsearch', query, options)
  }

  /**
   * Combined search with query expansion (qmd query command)
   */
  query(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.runQmdQuery('query', query, options)
  }

  private runQmdQuery(
    command: 'search' | 'vsearch' | 'query',
    query: string,
    options: SearchOptions,
  ): SearchResult[] {
    const { limit = 10, minScore = 0, category, tags, fullContent = false } = options

    if (!query.trim()) return []

    const args = [command, query, '-n', String(limit * 2), '--json']

    if (this.collection) {
      args.push('-c', this.collection)
    }

    const qmdResults = execQmd(args)

    return this.convertResults(qmdResults, {
      limit,
      minScore,
      category,
      tags,
      fullContent,
    })
  }

  /**
   * Convert qmd results to ClawVault SearchResult format
   */
  private convertResults(qmdResults: QmdResult[], options: SearchOptions): SearchResult[] {
    const { limit = 10, minScore = 0, category, tags, fullContent = false } = options

    const results: SearchResult[] = []

    // Normalize scores - qmd uses different scales
    const maxScore = qmdResults[0]?.score || 1

    for (const qr of qmdResults) {
      // Extract file path from qmd:// URI
      const filePath = this.qmdUriToPath(qr.file)
      const relativePath = this.vaultPath ? path.relative(this.vaultPath, filePath) : filePath

      // Get document from cache or create minimal one
      const docId = relativePath.replace(/\.md$/, '')
      let doc = this.documents.get(docId)

      // Determine category from path
      const parts = relativePath.split(path.sep)
      const docCategory = parts.length > 1 ? parts[0] : 'root'

      // Apply category filter
      if (category && docCategory !== category) continue

      // Apply tag filter (only if we have the document cached)
      if (tags && tags.length > 0 && doc) {
        const docTags = new Set(doc.tags)
        if (!tags.some((t) => docTags.has(t))) continue
      }

      // Normalize score to 0-1 range
      const normalizedScore = maxScore > 0 ? qr.score / maxScore : 0

      // Apply min score filter
      if (normalizedScore < minScore) continue

      // Create document if not cached
      if (!doc) {
        doc = {
          id: docId,
          path: filePath,
          category: docCategory,
          title: qr.title || path.basename(relativePath, '.md'),
          content: '', // Content loaded separately if needed
          frontmatter: {},
          links: [],
          tags: [],
          modified: new Date(),
        }
      }

      results.push({
        document: fullContent ? doc : { ...doc, content: '' },
        score: normalizedScore,
        snippet: this.cleanSnippet(qr.snippet),
        matchedTerms: [], // qmd doesn't provide this
      })

      if (results.length >= limit) break
    }

    return results
  }

  /**
   * Convert qmd:// URI to file path
   */
  private qmdUriToPath(uri: string): string {
    // qmd://collection/path/to/file.md -> actual path
    if (uri.startsWith('qmd://')) {
      const withoutScheme = uri.slice(6) // Remove 'qmd://'
      const slashIndex = withoutScheme.indexOf('/')
      if (slashIndex > -1) {
        // Get collection name and relative path
        const relativePath = withoutScheme.slice(slashIndex + 1)

        const root = this.collectionRoot || this.vaultPath
        if (root) {
          return path.join(root, relativePath)
        }

        return relativePath
      }
    }

    // Return as-is if not a qmd:// URI
    return uri
  }

  /**
   * Clean up qmd snippet format
   */
  private cleanSnippet(snippet: string): string {
    if (!snippet) return ''

    // Remove diff-style markers like "@@ -2,4 @@ (1 before, 67 after)"
    return snippet
      .replace(/@@ [-+]?\d+,?\d* @@ \([^)]+\)/g, '')
      .trim()
      .split('\n')
      .slice(0, 3)
      .join('\n')
      .slice(0, 300)
  }

  /**
   * Get all cached documents
   */
  getAllDocuments(): Document[] {
    return [...this.documents.values()]
  }

  /**
   * Get document count
   */
  get size(): number {
    return this.documents.size
  }

  /**
   * Clear the local document cache
   */
  clear(): void {
    this.documents.clear()
  }

  /**
   * Export documents for persistence
   */
  export(): { documents: Document[] } {
    return {
      documents: [...this.documents.values()],
    }
  }

  /**
   * Import from persisted data
   */
  import(data: { documents: Document[] }): void {
    this.clear()
    for (const doc of data.documents) {
      this.addDocument(doc)
    }
  }
}

/**
 * Find wiki-links in content
 */
export function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map((m) => m.slice(2, -2).toLowerCase())
}

/**
 * Find tags in content (#tag format)
 */
export function extractTags(content: string): string[] {
  const matches = content.match(/#[\w-]+/g) || []
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))]
}
