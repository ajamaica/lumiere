#!/usr/bin/env node

/**
 * ClawVault CLI 🐘
 * An elephant never forgets.
 */

import chalk from 'chalk'
import { spawn } from 'child_process'
import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'

import {
  ClawVault,
  createVault,
  findVault,
  QMD_INSTALL_COMMAND,
  QmdUnavailableError,
} from '../dist/index.js'

const program = new Command()

const CLI_VERSION = (() => {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url)
    const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
})()

// Helper to get vault (required for most commands)
// Checks: 1) explicit path, 2) CLAWVAULT_PATH env, 3) walk up from cwd
async function getVault(vaultPath) {
  // Explicit path takes priority
  if (vaultPath) {
    const vault = new ClawVault(path.resolve(vaultPath))
    await vault.load()
    return vault
  }

  // Check environment variable
  const envPath = process.env.CLAWVAULT_PATH
  if (envPath) {
    const vault = new ClawVault(path.resolve(envPath))
    await vault.load()
    return vault
  }

  // Walk up from cwd
  const vault = await findVault()
  if (!vault) {
    console.error(chalk.red('Error: No ClawVault found. Run `clawvault init` first.'))
    console.log(chalk.dim('Tip: Set CLAWVAULT_PATH environment variable to your vault path'))
    process.exit(1)
  }
  return vault
}

function resolveVaultPath(vaultPath) {
  if (vaultPath) {
    return path.resolve(vaultPath)
  }
  if (process.env.CLAWVAULT_PATH) {
    return path.resolve(process.env.CLAWVAULT_PATH)
  }
  let current = process.cwd()
  while (true) {
    if (fs.existsSync(path.join(current, '.clawvault.json'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) {
      console.error(chalk.red('Error: No ClawVault found. Run `clawvault init` first.'))
      console.log(chalk.dim('Tip: Set CLAWVAULT_PATH environment variable to your vault path'))
      process.exit(1)
    }
    current = parent
  }
}

async function runQmd(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('qmd', args, { stdio: 'inherit' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`qmd exited with code ${code}`))
    })
    proc.on('error', (err) => {
      if (err?.code === 'ENOENT') {
        reject(new QmdUnavailableError())
      } else {
        reject(err)
      }
    })
  })
}

function printQmdMissing() {
  console.error(chalk.red('Error: ClawVault requires qmd.'))
  console.log(chalk.dim(`Install: ${QMD_INSTALL_COMMAND}`))
}

program
  .name('clawvault')
  .description('🐘 An elephant never forgets. Structured memory for AI agents.')
  .version(CLI_VERSION)

// === INIT ===
program
  .command('init [path]')
  .description('Initialize a new ClawVault')
  .option('-n, --name <name>', 'Vault name')
  .option('--qmd', 'Set up qmd semantic search collection')
  .option('--qmd-collection <name>', 'qmd collection name (defaults to vault name)')
  .action(async (vaultPath, options) => {
    const targetPath = vaultPath || '.'
    console.log(chalk.cyan(`\n🐘 Initializing ClawVault at ${path.resolve(targetPath)}...\n`))

    try {
      const vault = await createVault(targetPath, {
        name: options.name || path.basename(path.resolve(targetPath)),
        qmdCollection: options.qmdCollection,
      })

      console.log(chalk.green('✓ Vault created'))
      console.log(chalk.dim(`  Categories: ${vault.getCategories().join(', ')}`))

      // Always set up qmd collection (qmd is required)
      console.log(chalk.cyan('\nSetting up qmd collection...'))
      try {
        await runQmd([
          'collection',
          'add',
          vault.getQmdRoot(),
          '--name',
          vault.getQmdCollection(),
          '--mask',
          '**/*.md',
        ])
        console.log(chalk.green('✓ qmd collection created'))
      } catch (err) {
        // Collection might already exist
        console.log(chalk.yellow('⚠ qmd collection may already exist'))
      }

      console.log(chalk.green('\n✅ ClawVault ready!\n'))
      console.log(chalk.dim('Next steps:'))
      console.log(
        chalk.dim('  clawvault store --category inbox --title "My note" --content "Hello world"'),
      )
      console.log(chalk.dim('  clawvault search "hello"'))
      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === SETUP ===
program
  .command('setup')
  .description('Auto-discover and configure a ClawVault')
  .action(async () => {
    try {
      const { setupCommand } = await import('../dist/commands/setup.js')
      await setupCommand()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === STORE ===
program
  .command('store')
  .description('Store a new memory')
  .requiredOption(
    '-c, --category <category>',
    'Category (preferences, decisions, patterns, people, projects, goals, transcripts, inbox)',
  )
  .requiredOption('-t, --title <title>', 'Document title')
  .option('--content <content>', 'Content body')
  .option('-f, --file <file>', 'Read content from file')
  .option('--stdin', 'Read content from stdin')
  .option('--overwrite', 'Overwrite if exists')
  .option('--no-index', 'Skip qmd index update (auto-updates by default)')
  .option('--embed', 'Also update qmd embeddings for vector search')
  .option('-v, --vault <path>', 'Vault path (default: find nearest)')
  .action(async (options) => {
    try {
      const vault = await getVault(options.vault)

      let content = options.content || ''

      if (options.file) {
        content = fs.readFileSync(options.file, 'utf-8')
      } else if (options.stdin) {
        content = fs.readFileSync(0, 'utf-8')
      }

      const doc = await vault.store({
        category: options.category,
        title: options.title,
        content,
        overwrite: options.overwrite,
      })

      console.log(chalk.green(`✓ Stored: ${doc.id}`))
      console.log(chalk.dim(`  Path: ${doc.path}`))

      // Auto-update qmd index unless --no-index
      if (options.index !== false) {
        const collection = vault.getQmdCollection()
        await runQmd(collection ? ['update', '-c', collection] : ['update'])
        if (options.embed) {
          await runQmd(collection ? ['embed', '-c', collection] : ['embed'])
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === CAPTURE ===
program
  .command('capture <note>')
  .description('Quick capture to inbox')
  .option('-t, --title <title>', 'Note title')
  .option('-v, --vault <path>', 'Vault path')
  .option('--no-index', 'Skip qmd index update')
  .action(async (note, options) => {
    try {
      const vault = await getVault(options.vault)
      const doc = await vault.capture(note, options.title)
      console.log(chalk.green(`✓ Captured: ${doc.id}`))

      // Auto-update qmd index unless --no-index
      if (options.index !== false) {
        const collection = vault.getQmdCollection()
        await runQmd(collection ? ['update', '-c', collection] : ['update'])
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === SEARCH ===
program
  .command('search <query>')
  .description('Search the vault via qmd (BM25)')
  .option('-n, --limit <n>', 'Max results', '10')
  .option('-c, --category <category>', 'Filter by category')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--full', 'Include full content in results')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      const vault = await getVault(options.vault)

      const results = await vault.find(query, {
        limit: parseInt(options.limit),
        category: options.category,
        tags: options.tags?.split(',').map((t) => t.trim()),
        fullContent: options.full,
      })

      if (options.json) {
        console.log(JSON.stringify(results, null, 2))
        return
      }

      if (results.length === 0) {
        console.log(chalk.yellow('No results found.'))
        return
      }

      console.log(chalk.cyan(`\n🔍 Found ${results.length} result(s) for "${query}":\n`))

      for (const result of results) {
        const scoreBar = '█'.repeat(Math.round(result.score * 10)).padEnd(10, '░')
        console.log(chalk.green(`📄 ${result.document.title}`))
        console.log(
          chalk.dim(`   ${result.document.category}/${result.document.id.split('/').pop()}`),
        )
        console.log(chalk.dim(`   Score: ${scoreBar} ${(result.score * 100).toFixed(0)}%`))
        if (result.snippet) {
          console.log(chalk.white(`   ${result.snippet.split('\n')[0].slice(0, 80)}...`))
        }
        console.log()
      }
    } catch (err) {
      if (err instanceof QmdUnavailableError) {
        printQmdMissing()
        process.exit(1)
      }
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === VSEARCH (qmd semantic search) ===
program
  .command('vsearch <query>')
  .description('Semantic search via qmd (requires qmd installed)')
  .option('-n, --limit <n>', 'Max results', '5')
  .option('-c, --category <category>', 'Filter by category')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--full', 'Include full content in results')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      const vault = await getVault(options.vault)

      const results = await vault.vsearch(query, {
        limit: parseInt(options.limit),
        category: options.category,
        tags: options.tags?.split(',').map((t) => t.trim()),
        fullContent: options.full,
      })

      if (options.json) {
        console.log(JSON.stringify(results, null, 2))
        return
      }

      if (results.length === 0) {
        console.log(chalk.yellow('No results found.'))
        return
      }

      console.log(chalk.cyan(`\n🧠 Found ${results.length} result(s) for "${query}":\n`))

      for (const result of results) {
        const scoreBar = '█'.repeat(Math.round(result.score * 10)).padEnd(10, '░')
        console.log(chalk.green(`📄 ${result.document.title}`))
        console.log(
          chalk.dim(`   ${result.document.category}/${result.document.id.split('/').pop()}`),
        )
        console.log(chalk.dim(`   Score: ${scoreBar} ${(result.score * 100).toFixed(0)}%`))
        if (result.snippet) {
          console.log(chalk.white(`   ${result.snippet.split('\n')[0].slice(0, 80)}...`))
        }
        console.log()
      }
    } catch (err) {
      if (err instanceof QmdUnavailableError) {
        printQmdMissing()
        process.exit(1)
      }
      console.error(chalk.red(`Error: ${err.message}`))
      console.log(chalk.dim(`\nTip: Install qmd: ${QMD_INSTALL_COMMAND}`))
      process.exit(1)
    }
  })

// === LIST ===
program
  .command('list [category]')
  .description('List documents')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (category, options) => {
    try {
      const vault = await getVault(options.vault)
      const docs = await vault.list(category)

      if (options.json) {
        console.log(
          JSON.stringify(
            docs.map((d) => ({
              id: d.id,
              title: d.title,
              category: d.category,
              tags: d.tags,
              modified: d.modified,
            })),
            null,
            2,
          ),
        )
        return
      }

      if (docs.length === 0) {
        console.log(chalk.yellow('No documents found.'))
        return
      }

      console.log(
        chalk.cyan(`\n📚 ${docs.length} document(s)${category ? ` in ${category}` : ''}:\n`),
      )

      // Group by category
      const grouped = {}
      for (const doc of docs) {
        grouped[doc.category] = grouped[doc.category] || []
        grouped[doc.category].push(doc)
      }

      for (const [cat, catDocs] of Object.entries(grouped)) {
        console.log(chalk.yellow(`${cat}/`))
        for (const doc of catDocs) {
          console.log(chalk.dim(`  - ${doc.title}`))
        }
      }
      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === GET ===
program
  .command('get <id>')
  .description('Get a document by ID')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const vault = await getVault(options.vault)
      const doc = await vault.get(id)

      if (!doc) {
        console.error(chalk.red(`Document not found: ${id}`))
        process.exit(1)
      }

      if (options.json) {
        console.log(JSON.stringify(doc, null, 2))
        return
      }

      console.log(chalk.cyan(`\n📄 ${doc.title}\n`))
      console.log(chalk.dim(`Category: ${doc.category}`))
      console.log(chalk.dim(`Path: ${doc.path}`))
      console.log(chalk.dim(`Tags: ${doc.tags.join(', ') || 'none'}`))
      console.log(chalk.dim(`Links: ${doc.links.join(', ') || 'none'}`))
      console.log(chalk.dim(`Modified: ${doc.modified.toISOString()}`))
      console.log(chalk.dim('---'))
      console.log(doc.content)
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === STATS ===
program
  .command('stats')
  .description('Show vault statistics')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vault = await getVault(options.vault)
      const stats = await vault.stats()

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2))
        return
      }

      console.log(chalk.cyan(`\n🐘 ${vault.getName()} Stats\n`))
      console.log(chalk.dim(`Path: ${vault.getPath()}`))
      console.log(`Documents: ${chalk.green(stats.documents)}`)
      console.log(`Links: ${chalk.blue(stats.links)}`)
      console.log(`Tags: ${chalk.yellow(stats.tags.length)}`)
      console.log()
      console.log(chalk.dim('By category:'))
      for (const [cat, count] of Object.entries(stats.categories)) {
        console.log(chalk.dim(`  ${cat}: ${count}`))
      }
      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === SYNC ===
program
  .command('sync <target>')
  .description('Sync vault to another location (e.g., for Obsidian)')
  .option('--delete', 'Delete orphan files in target')
  .option('--dry-run', 'Show what would be synced without syncing')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (target, options) => {
    try {
      const vault = await getVault(options.vault)

      console.log(chalk.cyan(`\n🔄 Syncing to ${target}...\n`))

      const result = await vault.sync({
        target,
        deleteOrphans: options.delete,
        dryRun: options.dryRun,
      })

      if (options.dryRun) {
        console.log(chalk.yellow('DRY RUN - no changes made\n'))
      }

      if (result.copied.length > 0) {
        console.log(chalk.green(`Copied: ${result.copied.length} files`))
        for (const f of result.copied.slice(0, 5)) {
          console.log(chalk.dim(`  + ${f}`))
        }
        if (result.copied.length > 5) {
          console.log(chalk.dim(`  ... and ${result.copied.length - 5} more`))
        }
      }

      if (result.deleted.length > 0) {
        console.log(chalk.red(`Deleted: ${result.deleted.length} files`))
      }

      if (result.unchanged.length > 0) {
        console.log(chalk.dim(`Unchanged: ${result.unchanged.length} files`))
      }

      if (result.errors.length > 0) {
        console.log(chalk.red(`\nErrors:`))
        for (const e of result.errors) {
          console.log(chalk.red(`  ${e}`))
        }
      }

      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === REINDEX ===
program
  .command('reindex')
  .description('Rebuild the search index')
  .option('-v, --vault <path>', 'Vault path')
  .option('--qmd', 'Also update qmd embeddings')
  .action(async (options) => {
    try {
      const vault = await getVault(options.vault)

      console.log(chalk.cyan('\n🔄 Reindexing...\n'))

      const count = await vault.reindex()
      console.log(chalk.green(`✓ Indexed ${count} documents`))

      if (options.qmd) {
        console.log(chalk.cyan('Updating qmd embeddings...'))
        const collection = vault.getQmdCollection()
        await runQmd(collection ? ['update', '-c', collection] : ['update'])
        console.log(chalk.green('✓ qmd updated'))
      }

      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === REMEMBER (type-based storage) ===
program
  .command('remember <type> <title>')
  .description(
    'Store a memory with type classification (fact|feeling|decision|lesson|commitment|preference|relationship|project)',
  )
  .option('--content <content>', 'Content body')
  .option('-f, --file <file>', 'Read content from file')
  .option('--stdin', 'Read content from stdin')
  .option('-v, --vault <path>', 'Vault path')
  .option('--no-index', 'Skip qmd index update')
  .action(async (type, title, options) => {
    const validTypes = [
      'fact',
      'feeling',
      'decision',
      'lesson',
      'commitment',
      'preference',
      'relationship',
      'project',
    ]
    if (!validTypes.includes(type)) {
      console.error(chalk.red(`Invalid type: ${type}`))
      console.error(chalk.dim(`Valid types: ${validTypes.join(', ')}`))
      process.exit(1)
    }

    try {
      const vault = await getVault(options.vault)

      let content = options.content || ''
      if (options.file) {
        content = fs.readFileSync(options.file, 'utf-8')
      } else if (options.stdin) {
        content = fs.readFileSync(0, 'utf-8')
      }

      const doc = await vault.remember(type, title, content)
      console.log(chalk.green(`✓ Remembered (${type}): ${doc.id}`))

      // Auto-update qmd index unless --no-index
      if (options.index !== false) {
        const collection = vault.getQmdCollection()
        await runQmd(collection ? ['update', '-c', collection] : ['update'])
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === WAKE (session start) ===
program
  .command('wake')
  .description('Start a session (recover + recap + summary)')
  .option('-n, --handoff-limit <n>', 'Number of recent handoffs to include', '3')
  .option('--full', 'Show full recap (default: brief)')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (options) => {
    try {
      const vaultPath = resolveVaultPath(options.vault)
      const { wake } = await import('../dist/commands/wake.js')
      const { formatRecoveryInfo } = await import('../dist/commands/recover.js')
      const result = await wake({
        vaultPath,
        handoffLimit: parseInt(options.handoffLimit),
        brief: !options.full,
      })

      console.log(chalk.cyan('\n🌅 ClawVault Wake\n'))
      console.log(formatRecoveryInfo(result.recovery))
      console.log()
      console.log(chalk.cyan('Recap'))
      console.log(result.recapMarkdown.trim())
      console.log()
      console.log(chalk.green(`You were working on: ${result.summary}`))

      process.exitCode = result.recovery.died ? 1 : 0
    } catch (err) {
      if (err instanceof QmdUnavailableError) {
        printQmdMissing()
        process.exit(1)
      }
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === SLEEP (session end) ===
program
  .command('sleep <summary>')
  .description('End a session with a handoff (and optional git commit)')
  .option('-n, --next <items>', 'Next steps (comma-separated)')
  .option('-b, --blocked <items>', 'Blocked items (comma-separated)')
  .option('-d, --decisions <items>', 'Key decisions made (comma-separated)')
  .option('-q, --questions <items>', 'Open questions (comma-separated)')
  .option('-f, --feeling <state>', 'Emotional/energy state')
  .option('-s, --session <key>', 'Session key')
  .option('--index', 'Update qmd index after handoff')
  .option('--no-git', 'Skip git commit prompt')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (summary, options) => {
    try {
      const vaultPath = resolveVaultPath(options.vault)
      const { sleep } = await import('../dist/commands/sleep.js')
      const result = await sleep({
        workingOn: summary,
        next: options.next,
        blocked: options.blocked,
        decisions: options.decisions,
        questions: options.questions,
        feeling: options.feeling,
        sessionKey: options.session,
        vaultPath,
        index: options.index,
        git: options.git,
      })

      console.log(chalk.green(`✓ Handoff saved: ${result.document.id}`))
      console.log(chalk.dim(`  Path: ${result.document.path}`))
      console.log(chalk.dim(`  Working on: ${result.handoff.workingOn.join(', ')}`))
      if (result.handoff.nextSteps.length > 0) {
        console.log(chalk.dim(`  Next: ${result.handoff.nextSteps.join(', ')}`))
      } else {
        console.log(chalk.dim('  Next: (none)'))
      }
      if (result.handoff.blocked.length > 0) {
        console.log(chalk.dim(`  Blocked: ${result.handoff.blocked.join(', ')}`))
      } else {
        console.log(chalk.dim('  Blocked: (none)'))
      }
      if (result.handoff.decisions?.length) {
        console.log(chalk.dim(`  Decisions: ${result.handoff.decisions.join(', ')}`))
      }
      if (result.handoff.openQuestions?.length) {
        console.log(chalk.dim(`  Questions: ${result.handoff.openQuestions.join(', ')}`))
      }
      if (result.handoff.feeling) {
        console.log(chalk.dim(`  Feeling: ${result.handoff.feeling}`))
      }
      if (options.index) {
        console.log(chalk.dim('  qmd: index updated'))
      }
      if (result.git) {
        if (result.git.committed) {
          console.log(
            chalk.green(
              `✓ Git commit created${result.git.message ? `: ${result.git.message}` : ''}`,
            ),
          )
        } else if (result.git.skippedReason === 'clean') {
          console.log(chalk.dim('  Git: clean'))
        } else if (result.git.skippedReason === 'declined') {
          console.log(chalk.dim('  Git: commit skipped'))
        }
      }
    } catch (err) {
      if (err instanceof QmdUnavailableError) {
        printQmdMissing()
        process.exit(1)
      }
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === HANDOFF (session bridge) ===
program
  .command('handoff')
  .description('Create a session handoff document')
  .requiredOption('-w, --working-on <items>', 'What I was working on (comma-separated)')
  .option('-b, --blocked <items>', 'What is blocked (comma-separated)')
  .option('-n, --next <items>', 'What comes next (comma-separated)')
  .option('-d, --decisions <items>', 'Key decisions made (comma-separated)')
  .option('-q, --questions <items>', 'Open questions (comma-separated)')
  .option('-f, --feeling <state>', 'Emotional/energy state')
  .option('-s, --session <key>', 'Session key')
  .option('-v, --vault <path>', 'Vault path')
  .option('--no-index', 'Skip qmd index update (auto-updates by default)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vault = await getVault(options.vault)

      const handoff = {
        workingOn: options.workingOn.split(',').map((s) => s.trim()),
        blocked: options.blocked ? options.blocked.split(',').map((s) => s.trim()) : [],
        nextSteps: options.next ? options.next.split(',').map((s) => s.trim()) : [],
        decisions: options.decisions
          ? options.decisions.split(',').map((s) => s.trim())
          : undefined,
        openQuestions: options.questions
          ? options.questions.split(',').map((s) => s.trim())
          : undefined,
        feeling: options.feeling,
        sessionKey: options.session,
      }

      const doc = await vault.createHandoff(handoff)

      if (options.json) {
        console.log(JSON.stringify({ id: doc.id, path: doc.path, handoff }, null, 2))
      } else {
        console.log(chalk.green(`✓ Handoff created: ${doc.id}`))
        console.log(chalk.dim(`  Path: ${doc.path}`))
      }

      // Auto-update qmd index unless --no-index
      if (options.index !== false) {
        const collection = vault.getQmdCollection()
        await runQmd(collection ? ['update', '-c', collection] : ['update'])
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === RECAP (session bootstrap) ===
program
  .command('recap')
  .description('Generate a session recap - who I was (bootstrap hook)')
  .option('-n, --handoff-limit <n>', 'Number of recent handoffs to include', '3')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as markdown (default)')
  .option('--brief', 'Minimal output for token savings')
  .action(async (options) => {
    try {
      const vault = await getVault(options.vault)

      const recap = await vault.generateRecap({
        handoffLimit: parseInt(options.handoffLimit),
        brief: options.brief,
      })

      if (options.json) {
        console.log(JSON.stringify(recap, null, 2))
        return
      }

      // Output as markdown (default)
      const md = vault.formatRecap(recap, { brief: options.brief })
      console.log(md)
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === SHELL INIT ===
program
  .command('shell-init')
  .description('Output shell integration for ClawVault')
  .action(async () => {
    try {
      const { shellInit } = await import('../dist/commands/shell-init.js')
      console.log(shellInit())
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === TEMPLATE ===
const template = program.command('template').description('Manage templates')

template
  .command('list')
  .description('List available templates')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (options) => {
    try {
      const { listTemplates } = await import('../dist/commands/template.js')
      const templates = listTemplates({ vaultPath: options.vault })
      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found.'))
        return
      }
      console.log(chalk.cyan('\n📄 Templates:\n'))
      for (const name of templates) {
        console.log(`- ${name}`)
      }
      console.log()
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

template
  .command('create <name>')
  .description('Create a file from a template')
  .option('-t, --title <title>', 'Document title')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (name, options) => {
    try {
      const { createFromTemplate } = await import('../dist/commands/template.js')
      const result = createFromTemplate(name, {
        title: options.title,
        vaultPath: options.vault,
      })
      console.log(chalk.green(`✓ Created from template: ${name}`))
      console.log(chalk.dim(`  Output: ${result.outputPath}`))
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

template
  .command('add <file>')
  .description('Add a custom template')
  .requiredOption('--name <name>', 'Template name')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (file, options) => {
    try {
      const { addTemplate } = await import('../dist/commands/template.js')
      const result = addTemplate(file, {
        name: options.name,
        vaultPath: options.vault,
      })
      console.log(chalk.green(`✓ Template added: ${result.name}`))
      console.log(chalk.dim(`  Path: ${result.templatePath}`))
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === DOCTOR (health check) ===
program
  .command('doctor')
  .description('Check ClawVault setup health')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (options) => {
    try {
      const { doctor } = await import('../dist/commands/doctor.js')
      const report = await doctor(options.vault)

      console.log(chalk.cyan('\n🩺 ClawVault Health Check\n'))
      if (report.vaultPath) {
        console.log(chalk.dim(`Vault: ${report.vaultPath}`))
        console.log()
      }

      for (const check of report.checks) {
        const prefix =
          check.status === 'ok'
            ? chalk.green('✓')
            : check.status === 'warn'
              ? chalk.yellow('⚠')
              : chalk.red('✗')
        const detail = check.detail ? ` — ${check.detail}` : ''
        console.log(`${prefix} ${check.label}${detail}`)
        if (check.hint) {
          console.log(chalk.dim(`  ${check.hint}`))
        }
      }

      const issues = report.warnings + report.errors
      console.log()
      if (issues === 0) {
        console.log(chalk.green('✅ ClawVault is healthy!\n'))
      } else {
        console.log(chalk.yellow(`⚠ ${issues} issue(s) found\n`))
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === ENTITIES ===
program
  .command('entities')
  .description('List all linkable entities in the vault')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { entitiesCommand } = await import('../dist/commands/entities.js')
      await entitiesCommand({ json: options.json })
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === LINK ===
program
  .command('link [file]')
  .description('Auto-link entity mentions in markdown files')
  .option('--all', 'Link all files in vault')
  .option('--backlinks <file>', 'Show backlinks to a file')
  .option('--dry-run', 'Show what would be linked without changing files')
  .option('--orphans', 'List broken wiki-links')
  .option('--rebuild', 'Rebuild backlinks index')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (file, options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { linkCommand } = await import('../dist/commands/link.js')
      await linkCommand(file, {
        all: options.all,
        dryRun: options.dryRun,
        backlinks: options.backlinks,
        orphans: options.orphans,
        rebuild: options.rebuild,
      })
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === CHECKPOINT ===
program
  .command('checkpoint')
  .description('Quick state checkpoint for context death resilience')
  .option('--working-on <text>', 'What you are currently working on')
  .option('--focus <text>', 'Current focus area')
  .option('--blocked <text>', 'What is blocking progress')
  .option('--urgent', 'Trigger OpenClaw wake after checkpoint')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { checkpoint } = await import('../dist/commands/checkpoint.js')
      const data = await checkpoint({
        vaultPath: path.resolve(vaultPath),
        workingOn: options.workingOn,
        focus: options.focus,
        blocked: options.blocked,
        urgent: options.urgent,
      })

      if (options.json) {
        console.log(JSON.stringify(data, null, 2))
      } else {
        console.log(chalk.green('✓ Checkpoint saved'))
        console.log(chalk.dim(`  Timestamp: ${data.timestamp}`))
        if (data.workingOn) console.log(chalk.dim(`  Working on: ${data.workingOn}`))
        if (data.focus) console.log(chalk.dim(`  Focus: ${data.focus}`))
        if (data.blocked) console.log(chalk.dim(`  Blocked: ${data.blocked}`))
        if (data.urgent) console.log(chalk.dim('  Urgent: yes'))
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === RECOVER ===
program
  .command('recover')
  .description('Check for context death and recover state')
  .option('--clear', 'Clear the dirty death flag after recovery')
  .option('--verbose', 'Show full checkpoint and handoff content')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { recover, formatRecoveryInfo } = await import('../dist/commands/recover.js')
      const info = await recover(path.resolve(vaultPath), {
        clearFlag: options.clear,
        verbose: options.verbose,
      })

      if (options.json) {
        console.log(JSON.stringify(info, null, 2))
      } else {
        console.log(formatRecoveryInfo(info, { verbose: options.verbose }))
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === STATUS ===
program
  .command('status')
  .description('Show vault health and status')
  .option('-v, --vault <path>', 'Vault path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { statusCommand } = await import('../dist/commands/status.js')
      await statusCommand(path.resolve(vaultPath), { json: options.json })
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === CLEAN-EXIT ===
program
  .command('clean-exit')
  .description('Mark session as cleanly exited (clears dirty death flag)')
  .option('-v, --vault <path>', 'Vault path')
  .action(async (options) => {
    try {
      const vaultPath = options.vault || process.env.CLAWVAULT_PATH
      if (!vaultPath) {
        console.error(chalk.red('Error: No vault path. Set CLAWVAULT_PATH or use -v'))
        process.exit(1)
      }

      const { cleanExit } = await import('../dist/commands/checkpoint.js')
      await cleanExit(path.resolve(vaultPath))
      console.log(chalk.green('✓ Clean exit recorded'))
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// === REPAIR-SESSION ===
program
  .command('repair-session')
  .description('Repair corrupted OpenClaw session transcripts')
  .option('-s, --session <id>', 'Session ID (defaults to current main session)')
  .option('-a, --agent <id>', 'Agent ID (defaults to configured agent)')
  .option('--backup', 'Create backup before repair (default: true)', true)
  .option('--no-backup', 'Skip backup creation')
  .option('--dry-run', 'Show what would be repaired without writing')
  .option('--list', 'List available sessions')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const { repairSessionCommand, formatRepairResult, listAgentSessions } =
        await import('../dist/commands/repair-session.js')

      // List mode
      if (options.list) {
        console.log(listAgentSessions(options.agent))
        return
      }

      const result = await repairSessionCommand({
        sessionId: options.session,
        agentId: options.agent,
        backup: options.backup,
        dryRun: options.dryRun,
      })

      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(formatRepairResult(result, { dryRun: options.dryRun }))
      }

      // Exit with code 1 if corruption was found but not fixed (dry-run)
      if (result.corruptedEntries.length > 0 && !result.repaired) {
        process.exit(1)
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`))
      process.exit(1)
    }
  })

// Parse and run
program.parse()
