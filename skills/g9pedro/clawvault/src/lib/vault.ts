/**
 * ClawVault - The elephant's memory
 */

import * as fs from 'fs'
import { glob } from 'glob'
import matter from 'gray-matter'
import * as path from 'path'
import { fileURLToPath } from 'url'

import {
  Category,
  DEFAULT_CATEGORIES,
  Document,
  HandoffDocument,
  MemoryType,
  SearchOptions,
  SearchResult,
  SessionRecap,
  StoreOptions,
  SyncOptions,
  SyncResult,
  TYPE_TO_CATEGORY,
  VaultConfig,
  VaultMeta,
} from '../types.js'
import {
  extractTags,
  extractWikiLinks,
  hasQmd,
  qmdEmbed,
  QmdUnavailableError,
  qmdUpdate,
  SearchEngine,
} from './search.js'

const CONFIG_FILE = '.clawvault.json'
const INDEX_FILE = '.clawvault-index.json'

export class ClawVault {
  private config: VaultConfig
  private search: SearchEngine
  private initialized: boolean = false

  constructor(vaultPath: string) {
    if (!hasQmd()) {
      throw new QmdUnavailableError()
    }
    this.config = {
      path: path.resolve(vaultPath),
      name: path.basename(vaultPath),
      categories: DEFAULT_CATEGORIES,
      qmdCollection: undefined,
      qmdRoot: undefined,
    }
    this.search = new SearchEngine()
    this.applyQmdConfig()
  }

  /**
   * Initialize a new vault
   */
  async init(options: Partial<VaultConfig> = {}): Promise<void> {
    if (!hasQmd()) {
      throw new QmdUnavailableError()
    }
    const vaultPath = this.config.path

    // Merge options
    this.config = { ...this.config, ...options }
    this.applyQmdConfig()

    // Create vault directory
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true })
    }

    // Create category directories
    for (const category of this.config.categories) {
      const catPath = path.join(vaultPath, category)
      if (!fs.existsSync(catPath)) {
        fs.mkdirSync(catPath, { recursive: true })
      }
    }

    // Create templates
    await this.createTemplates()

    // Create README
    const readmePath = path.join(vaultPath, 'README.md')
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, this.generateReadme())
    }

    // Save config
    const configPath = path.join(vaultPath, CONFIG_FILE)
    const meta: VaultMeta = {
      name: this.config.name,
      version: '1.0.0',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      categories: this.config.categories,
      documentCount: 0,
      qmdCollection: this.getQmdCollection(),
      qmdRoot: this.getQmdRoot(),
    }
    fs.writeFileSync(configPath, JSON.stringify(meta, null, 2))

    this.initialized = true
  }

  /**
   * Load an existing vault
   */
  async load(): Promise<void> {
    if (!hasQmd()) {
      throw new QmdUnavailableError()
    }
    const vaultPath = this.config.path
    const configPath = path.join(vaultPath, CONFIG_FILE)

    if (!fs.existsSync(configPath)) {
      throw new Error(`Not a ClawVault: ${vaultPath} (missing ${CONFIG_FILE})`)
    }

    const meta: VaultMeta = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    this.config.name = meta.name
    this.config.categories = meta.categories
    this.config.qmdCollection = meta.qmdCollection
    this.config.qmdRoot = meta.qmdRoot

    if (!meta.qmdCollection || !meta.qmdRoot) {
      meta.qmdCollection = meta.qmdCollection || meta.name
      meta.qmdRoot = meta.qmdRoot || this.config.path
      fs.writeFileSync(configPath, JSON.stringify(meta, null, 2))
    }

    // Configure search engine with vault info
    this.applyQmdConfig(meta)

    // Index all documents (local cache)
    await this.reindex()
    this.initialized = true
  }

  /**
   * Reindex all documents
   */
  async reindex(): Promise<number> {
    this.search.clear()

    const files = await glob('**/*.md', {
      cwd: this.config.path,
      ignore: ['**/node_modules/**', '**/.*'],
    })

    for (const file of files) {
      const doc = await this.loadDocument(file)
      if (doc) {
        this.search.addDocument(doc)
      }
    }

    // Save index
    await this.saveIndex()

    return this.search.size
  }

  /**
   * Load a document from disk
   */
  private async loadDocument(relativePath: string): Promise<Document | null> {
    try {
      const fullPath = path.join(this.config.path, relativePath)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const { data: frontmatter, content: body } = matter(content)
      const stats = fs.statSync(fullPath)

      const parts = relativePath.split(path.sep)
      const category = parts.length > 1 ? parts[0] : 'root'
      const filename = path.basename(relativePath, '.md')

      return {
        id: relativePath.replace(/\.md$/, ''),
        path: fullPath,
        category,
        title: (frontmatter.title as string) || filename,
        content: body,
        frontmatter,
        links: extractWikiLinks(body),
        tags: extractTags(body),
        modified: stats.mtime,
      }
    } catch (err) {
      console.error(`Error loading ${relativePath}:`, err)
      return null
    }
  }

  /**
   * Store a new document
   */
  async store(options: StoreOptions): Promise<Document> {
    const {
      category,
      title,
      content,
      frontmatter = {},
      overwrite = false,
      qmdUpdate: triggerUpdate = false,
      qmdEmbed: triggerEmbed = false,
    } = options

    // Create filename from title
    const filename = this.slugify(title) + '.md'
    const relativePath = path.join(category, filename)
    const fullPath = path.join(this.config.path, relativePath)

    // Check if exists
    if (fs.existsSync(fullPath) && !overwrite) {
      throw new Error(`Document already exists: ${relativePath}. Use overwrite: true to replace.`)
    }

    // Ensure category directory exists
    const categoryPath = path.join(this.config.path, category)
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true })
    }

    // Build frontmatter with date
    const fm = {
      title,
      date: new Date().toISOString().split('T')[0],
      ...frontmatter,
    }

    // Write file
    const fileContent = matter.stringify(content, fm)
    fs.writeFileSync(fullPath, fileContent)

    // Load and index the document
    const doc = await this.loadDocument(relativePath)
    if (doc) {
      this.search.addDocument(doc)
      await this.saveIndex()
    }

    // Trigger qmd reindex if requested
    if (triggerUpdate || triggerEmbed) {
      qmdUpdate(this.getQmdCollection())
      if (triggerEmbed) {
        qmdEmbed(this.getQmdCollection())
      }
    }

    return doc!
  }

  /**
   * Quick store to inbox
   */
  async capture(note: string, title?: string): Promise<Document> {
    const autoTitle = title || `note-${Date.now()}`
    return this.store({
      category: 'inbox',
      title: autoTitle,
      content: note,
    })
  }

  /**
   * Search the vault (BM25 via qmd)
   */
  async find(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.search(query, options)
  }

  /**
   * Semantic/vector search (via qmd vsearch)
   */
  async vsearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.vsearch(query, options)
  }

  /**
   * Combined search with query expansion (via qmd query)
   */
  async query(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.search.query(query, options)
  }

  /**
   * Get a document by ID or path
   */
  async get(idOrPath: string): Promise<Document | null> {
    // Normalize path
    const normalized = idOrPath.replace(/\.md$/, '')
    const docs = this.search.getAllDocuments()
    return docs.find((d) => d.id === normalized) || null
  }

  /**
   * List documents in a category
   */
  async list(category?: string): Promise<Document[]> {
    const docs = this.search.getAllDocuments()
    if (category) {
      return docs.filter((d) => d.category === category)
    }
    return docs
  }

  /**
   * Sync vault to another location (for Obsidian on Windows, etc.)
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const { target, deleteOrphans = false, dryRun = false } = options
    const result: SyncResult = {
      copied: [],
      deleted: [],
      unchanged: [],
      errors: [],
    }

    // Get all source files
    const sourceFiles = await glob('**/*.md', {
      cwd: this.config.path,
      ignore: ['**/node_modules/**'],
    })

    // Ensure target exists
    if (!dryRun && !fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true })
    }

    // Copy files
    for (const file of sourceFiles) {
      const sourcePath = path.join(this.config.path, file)
      const targetPath = path.join(target, file)

      try {
        const sourceStats = fs.statSync(sourcePath)
        let shouldCopy = true

        if (fs.existsSync(targetPath)) {
          const targetStats = fs.statSync(targetPath)
          if (sourceStats.mtime <= targetStats.mtime) {
            result.unchanged.push(file)
            shouldCopy = false
          }
        }

        if (shouldCopy) {
          if (!dryRun) {
            const targetDir = path.dirname(targetPath)
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true })
            }
            fs.copyFileSync(sourcePath, targetPath)
          }
          result.copied.push(file)
        }
      } catch (err) {
        result.errors.push(`${file}: ${err}`)
      }
    }

    // Handle orphans in target
    if (deleteOrphans) {
      const targetFiles = await glob('**/*.md', { cwd: target })
      const sourceSet = new Set(sourceFiles)

      for (const file of targetFiles) {
        if (!sourceSet.has(file)) {
          if (!dryRun) {
            fs.unlinkSync(path.join(target, file))
          }
          result.deleted.push(file)
        }
      }
    }

    return result
  }

  /**
   * Get vault statistics
   */
  async stats(): Promise<{
    documents: number
    categories: { [key: string]: number }
    links: number
    tags: string[]
  }> {
    const docs = this.search.getAllDocuments()
    const categories: { [key: string]: number } = {}
    const allTags = new Set<string>()
    let totalLinks = 0

    for (const doc of docs) {
      categories[doc.category] = (categories[doc.category] || 0) + 1
      totalLinks += doc.links.length
      doc.tags.forEach((t) => allTags.add(t))
    }

    return {
      documents: docs.length,
      categories,
      links: totalLinks,
      tags: [...allTags].sort(),
    }
  }

  /**
   * Get all categories
   */
  getCategories(): Category[] {
    return this.config.categories
  }

  /**
   * Check if vault is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get vault path
   */
  getPath(): string {
    return this.config.path
  }

  /**
   * Get vault name
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get qmd collection name
   */
  getQmdCollection(): string {
    return this.config.qmdCollection || this.config.name
  }

  /**
   * Get qmd collection root
   */
  getQmdRoot(): string {
    return this.config.qmdRoot || this.config.path
  }

  // === Memory Type System ===

  /**
   * Store a memory with type classification
   * Automatically routes to correct category based on type
   */
  async remember(
    type: MemoryType,
    title: string,
    content: string,
    frontmatter: Record<string, unknown> = {},
  ): Promise<Document> {
    const category = TYPE_TO_CATEGORY[type]
    return this.store({
      category,
      title,
      content,
      frontmatter: { ...frontmatter, memoryType: type },
    })
  }

  // === Handoff System ===

  /**
   * Create a session handoff document
   * Call this before context death or long pauses
   */
  async createHandoff(handoff: Omit<HandoffDocument, 'created'>): Promise<Document> {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toISOString().split('T')[1].slice(0, 5).replace(':', '')

    const fullHandoff: HandoffDocument = {
      ...handoff,
      created: now.toISOString(),
    }

    const content = this.formatHandoff(fullHandoff)

    // Filter out undefined values to avoid yaml dump errors
    const frontmatter: Record<string, unknown> = {
      type: 'handoff',
      workingOn: handoff.workingOn,
      blocked: handoff.blocked,
      nextSteps: handoff.nextSteps,
    }
    if (handoff.sessionKey) frontmatter.sessionKey = handoff.sessionKey
    if (handoff.feeling) frontmatter.feeling = handoff.feeling
    if (handoff.decisions) frontmatter.decisions = handoff.decisions
    if (handoff.openQuestions) frontmatter.openQuestions = handoff.openQuestions

    return this.store({
      category: 'handoffs',
      title: `handoff-${dateStr}-${timeStr}`,
      content,
      frontmatter,
    })
  }

  /**
   * Format handoff as readable markdown
   */
  private formatHandoff(h: HandoffDocument): string {
    let md = `# Session Handoff\n\n`
    md += `**Created:** ${h.created}\n`
    if (h.sessionKey) md += `**Session:** ${h.sessionKey}\n`
    if (h.feeling) md += `**Feeling:** ${h.feeling}\n`
    md += `\n`

    md += `## Working On\n`
    h.workingOn.forEach((w) => (md += `- ${w}\n`))
    md += `\n`

    md += `## Blocked\n`
    if (h.blocked.length === 0) md += `- Nothing currently blocked\n`
    else h.blocked.forEach((b) => (md += `- ${b}\n`))
    md += `\n`

    md += `## Next Steps\n`
    h.nextSteps.forEach((n) => (md += `- ${n}\n`))

    if (h.decisions && h.decisions.length > 0) {
      md += `\n## Decisions Made\n`
      h.decisions.forEach((d) => (md += `- ${d}\n`))
    }

    if (h.openQuestions && h.openQuestions.length > 0) {
      md += `\n## Open Questions\n`
      h.openQuestions.forEach((q) => (md += `- ${q}\n`))
    }

    return md
  }

  // === Session Recap (Bootstrap Hook) ===

  /**
   * Generate a session recap - who I was
   * Call this on bootstrap to restore context
   */
  async generateRecap(
    options: { handoffLimit?: number; brief?: boolean } = {},
  ): Promise<SessionRecap> {
    const { handoffLimit = 3, brief = false } = options

    // Get recent handoffs
    const handoffDocs = await this.list('handoffs')
    const recentHandoffs = handoffDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, handoffLimit)
      .map((doc) => this.parseHandoff(doc))

    // Get active projects
    const projectDocs = await this.list('projects')
    const activeProjects = projectDocs
      .filter((d) => d.frontmatter.status !== 'completed' && d.frontmatter.status !== 'archived')
      .map((d) => d.title)

    // Get pending commitments
    const commitmentDocs = await this.list('commitments')
    const pendingCommitments = commitmentDocs
      .filter((d) => d.frontmatter.status !== 'done')
      .map((d) => d.title)

    // Get recent decisions (new!)
    const decisionDocs = await this.list('decisions')
    const recentDecisions = decisionDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, brief ? 3 : 5)
      .map((d) => d.title)

    // Get recent lessons
    const lessonDocs = await this.list('lessons')
    const recentLessons = lessonDocs
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, brief ? 3 : 5)
      .map((d) => d.title)

    // Get key relationships (skip in brief mode)
    let keyRelationships: string[] = []
    if (!brief) {
      const peopleDocs = await this.list('people')
      keyRelationships = peopleDocs
        .filter((d) => d.frontmatter.importance === 'high' || d.frontmatter.role)
        .map((d) => `${d.title}${d.frontmatter.role ? ` (${d.frontmatter.role})` : ''}`)
    }

    // Derive emotional arc from recent handoffs
    const feelings = recentHandoffs.map((h) => h.feeling).filter(Boolean)
    const emotionalArc = feelings.length > 0 ? feelings.join(' → ') : undefined

    return {
      generated: new Date().toISOString(),
      recentHandoffs,
      activeProjects,
      pendingCommitments,
      recentDecisions,
      recentLessons,
      keyRelationships,
      emotionalArc,
    }
  }

  /**
   * Format recap as readable markdown for injection
   */
  formatRecap(recap: SessionRecap, options: { brief?: boolean } = {}): string {
    const { brief = false } = options

    let md = `# Who I Was\n\n`
    md += `*Generated: ${recap.generated}*\n\n`

    if (recap.emotionalArc) {
      md += `**Emotional arc:** ${recap.emotionalArc}\n\n`
    }

    if (recap.recentHandoffs.length > 0) {
      md += `## Recent Sessions\n`
      for (const h of recap.recentHandoffs) {
        if (brief) {
          // Compact format for brief mode
          md += `- **${h.created.split('T')[0]}:** ${h.workingOn.slice(0, 2).join(', ')}`
          if (h.nextSteps.length > 0) md += ` → ${h.nextSteps[0]}`
          md += `\n`
        } else {
          md += `\n### ${h.created.split('T')[0]}\n`
          md += `**Working on:** ${h.workingOn.join(', ')}\n`
          if (h.blocked.length > 0) md += `**Blocked:** ${h.blocked.join(', ')}\n`
          md += `**Next:** ${h.nextSteps.join(', ')}\n`
        }
      }
      md += `\n`
    }

    if (recap.activeProjects.length > 0) {
      md += `## Active Projects\n`
      recap.activeProjects.forEach((p) => (md += `- ${p}\n`))
      md += `\n`
    }

    if (recap.pendingCommitments.length > 0) {
      md += `## Pending Commitments\n`
      recap.pendingCommitments.forEach((c) => (md += `- ${c}\n`))
      md += `\n`
    }

    if (recap.recentDecisions && recap.recentDecisions.length > 0) {
      md += `## Recent Decisions\n`
      recap.recentDecisions.forEach((d) => (md += `- ${d}\n`))
      md += `\n`
    }

    if (recap.recentLessons.length > 0) {
      md += `## Recent Lessons\n`
      recap.recentLessons.forEach((l) => (md += `- ${l}\n`))
      md += `\n`
    }

    if (!brief && recap.keyRelationships.length > 0) {
      md += `## Key People\n`
      recap.keyRelationships.forEach((r) => (md += `- ${r}\n`))
    }

    return md
  }

  /**
   * Parse a handoff document back into structured form
   */
  private parseHandoff(doc: Document): HandoffDocument {
    return {
      created: (doc.frontmatter.date as string) || doc.modified.toISOString(),
      sessionKey: doc.frontmatter.sessionKey as string,
      workingOn: (doc.frontmatter.workingOn as string[]) || [],
      blocked: (doc.frontmatter.blocked as string[]) || [],
      nextSteps: (doc.frontmatter.nextSteps as string[]) || [],
      decisions: doc.frontmatter.decisions as string[] | undefined,
      openQuestions: doc.frontmatter.openQuestions as string[] | undefined,
      feeling: doc.frontmatter.feeling as string,
    }
  }

  // === Private helpers ===

  private applyQmdConfig(meta?: VaultMeta): void {
    const collection = meta?.qmdCollection || this.config.qmdCollection || this.config.name
    const root = meta?.qmdRoot || this.config.qmdRoot || this.config.path

    this.config.qmdCollection = collection
    this.config.qmdRoot = root

    this.search.setVaultPath(this.config.path)
    this.search.setCollection(collection)
    this.search.setCollectionRoot(root)
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.config.path, INDEX_FILE)
    const data = this.search.export()
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2))

    // Update config
    const configPath = path.join(this.config.path, CONFIG_FILE)
    if (fs.existsSync(configPath)) {
      const meta: VaultMeta = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      meta.lastUpdated = new Date().toISOString()
      meta.documentCount = this.search.size
      fs.writeFileSync(configPath, JSON.stringify(meta, null, 2))
    }
  }

  private async createTemplates(): Promise<void> {
    const templatesPath = path.join(this.config.path, 'templates')
    if (!fs.existsSync(templatesPath)) {
      fs.mkdirSync(templatesPath, { recursive: true })
    }

    const moduleDir = path.dirname(fileURLToPath(import.meta.url))
    const candidates = [
      path.resolve(moduleDir, '../templates'),
      path.resolve(moduleDir, '../../templates'),
    ]
    const builtinDir = candidates.find(
      (dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory(),
    )
    if (!builtinDir) return

    for (const entry of fs.readdirSync(builtinDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      if (entry.name === 'daily.md') continue
      const sourcePath = path.join(builtinDir, entry.name)
      const targetPath = path.join(templatesPath, entry.name)
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }

  private generateReadme(): string {
    return `# ${this.config.name} 🐘

An elephant never forgets.

## Structure

${this.config.categories.map((c) => `- \`/${c}/\` — ${this.getCategoryDescription(c)}`).join('\n')}

## Quick Search

\`\`\`bash
clawvault search "query"
\`\`\`

## Quick Capture

\`\`\`bash
clawvault store --category inbox --title "note" --content "..."
\`\`\`

---

*Managed by [ClawVault](https://github.com/Versatly/clawvault)*
`
  }

  private getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      // Memory type categories (Benthic's taxonomy)
      facts: 'Raw information, data points, things that are true',
      feelings: 'Emotional states, reactions, energy levels',
      decisions: 'Choices made with context and reasoning',
      lessons: 'What I learned, insights, patterns observed',
      commitments: 'Promises, goals, obligations to fulfill',
      preferences: 'Likes, dislikes, how I want things',
      people: 'Relationships, one file per person',
      projects: 'Active work, ventures, ongoing efforts',
      // System categories
      handoffs: 'Session bridges — what I was doing, what comes next',
      transcripts: 'Session summaries and logs',
      goals: 'Long-term and short-term objectives',
      patterns: 'Recurring behaviors (→ lessons)',
      inbox: 'Quick capture → process later',
      templates: 'Templates for each document type',
    }
    return descriptions[category] || category
  }
}

/**
 * Find and open the nearest vault (walks up directory tree)
 */
export async function findVault(startPath: string = process.cwd()): Promise<ClawVault | null> {
  let current = path.resolve(startPath)

  while (current !== path.dirname(current)) {
    const configPath = path.join(current, CONFIG_FILE)
    if (fs.existsSync(configPath)) {
      const vault = new ClawVault(current)
      await vault.load()
      return vault
    }
    current = path.dirname(current)
  }

  return null
}

/**
 * Create a new vault
 */
export async function createVault(
  vaultPath: string,
  options: Partial<VaultConfig> = {},
): Promise<ClawVault> {
  const vault = new ClawVault(vaultPath)
  await vault.init(options)
  return vault
}
