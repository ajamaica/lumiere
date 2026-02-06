#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { fetchWithRetry } = require('./lib/fetch-retry')

/**
 * SkillBoss Build Service - Static and Worker publishing
 *
 * Usage:
 *   node serve-build.js <command> <folder> [options]
 *
 * Commands:
 *   publish-static   Upload static files and deploy as Cloudflare Worker
 *   publish-worker   Upload Worker code and deploy with bindings (D1, KV, etc.)
 *
 * Options:
 *   --project-id <id>   Project identifier (auto-generated on server if omitted)
 *   --version <n>       Version number (optional)
 *   --api-url <url>     Override build API URL (from config.json)
 *   --main <file>       Entry point for Worker (default: src/index.ts or index.ts)
 *   --name <name>       Worker name (default: derived from folder name)
 *   --help              Show this help message
 */

// Load config from config.json (sibling to scripts folder)
const CONFIG_PATH = path.join(__dirname, '..', 'config.json')

function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (err) {
    return {}
  }
}

const config = loadConfig()
const DEFAULT_BUILD_API_URL = config.buildApiUrl || 'http://localhost:8000'

// MIME type mapping for common static file types
const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
}

// Binary file extensions that need base64 encoding
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.pdf',
  '.zip',
  '.gz',
  '.br',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.wasm',
])

// Worker source file extensions
const WORKER_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'])

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

const SKILLBOSS_FILE = '.skillboss'

/**
 * Load .skillboss config from the target folder
 */
function loadSkillbossConfig(folderPath) {
  const configPath = path.join(folderPath, SKILLBOSS_FILE)
  try {
    const data = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Save .skillboss config to the target folder
 */
function saveSkillbossConfig(folderPath, config) {
  const configPath = path.join(folderPath, SKILLBOSS_FILE)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

/**
 * Recursively read all files from a directory
 */
function readFilesRecursively(dirPath, basePath = '') {
  const files = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      // Skip common non-essential directories
      if (['node_modules', '.git', '.DS_Store'].includes(entry.name)) {
        continue
      }
      files.push(...readFilesRecursively(fullPath, relativePath))
    } else if (entry.isFile()) {
      // Skip hidden files
      if (entry.name.startsWith('.')) {
        continue
      }

      const isBinary = isBinaryFile(entry.name)
      const contents = fs.readFileSync(fullPath, isBinary ? 'base64' : 'utf8')

      files.push({
        path: relativePath,
        type: getMimeType(entry.name),
        contents,
        encoding: isBinary ? 'base64' : 'utf8',
      })
    }
  }

  return files
}

/**
 * Upload static files to the build service
 */
async function publishStatic(folderPath, options) {
  const resolvedPath = path.resolve(folderPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Folder does not exist: ${resolvedPath}`)
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`)
  }

  const apiUrl = options.apiUrl || DEFAULT_BUILD_API_URL

  // Check for existing .skillboss config (for redeployments)
  const existingConfig = loadSkillbossConfig(resolvedPath)

  // Use projectId from: CLI flag > .skillboss file > auto-generate
  let projectId = options.projectId
  if (!projectId && existingConfig?.projectId) {
    projectId = existingConfig.projectId
    console.log(`Found .skillboss config - redeploying to existing project`)
  }

  console.log(`Reading files from: ${resolvedPath}`)
  const files = readFilesRecursively(resolvedPath)
  console.log(`Found ${files.length} files`)

  if (files.length === 0) {
    throw new Error('No files found in the specified folder')
  }

  // Log file summary
  const textFiles = files.filter((f) => f.encoding === 'utf8').length
  const binaryFiles = files.filter((f) => f.encoding === 'base64').length
  console.log(`  - Text files: ${textFiles}`)
  console.log(`  - Binary files: ${binaryFiles}`)

  // Build payload - projectId is optional (server will generate if not provided)
  const payload = {
    files,
    versionIndex: options.version ? parseInt(options.version, 10) : undefined,
  }

  // Include projectId if available
  if (projectId) {
    payload.projectId = projectId
  }

  console.log(`\nUploading to: ${apiUrl}/upload-static`)
  if (projectId) {
    console.log(`Project ID: ${projectId}`)
  } else {
    console.log(`Project ID: (will be auto-generated)`)
  }
  if (options.version) {
    console.log(`Version: ${options.version}`)
  }

  console.log(`\nDeploying... (this may take a moment)`)

  // API key is required for authentication
  if (!config.apiKey) {
    throw new Error('API key not found in config.json. Please add your apiKey.')
  }

  const response = await fetchWithRetry(`${apiUrl}/upload-static`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (result.status === 'success') {
    // Save/update .skillboss config for future redeployments
    saveSkillbossConfig(resolvedPath, {
      projectId: result.projectId,
      url: result.data,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      url: result.data,
      projectId: result.projectId,
      fileCount: files.length,
    }
  } else {
    throw new Error(result.error || 'Upload failed')
  }
}

/**
 * Read SQL migrations from a folder
 * Looks for:
 *   1. migrations/ folder with numbered .sql files (e.g., 001_init.sql)
 *   2. schema.sql file in the root
 */
function readMigrations(folderPath, bindings) {
  const migrations = []

  if (!bindings?.d1 || bindings.d1.length === 0) {
    return migrations
  }

  // Default to first D1 binding if not specified
  const defaultBinding = bindings.d1[0].name

  // Check for migrations/ folder
  const migrationsDir = path.join(folderPath, 'migrations')
  if (fs.existsSync(migrationsDir) && fs.statSync(migrationsDir).isDirectory()) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort() // Sort to ensure order (001_, 002_, etc.)

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      // Check if file specifies a binding in the name (e.g., 001_DB_init.sql)
      const bindingMatch = file.match(/^\d+_([A-Z_]+)_/)
      const binding =
        bindingMatch && bindings.d1.some((d) => d.name === bindingMatch[1])
          ? bindingMatch[1]
          : defaultBinding

      migrations.push({ binding, sql })
    }
  }

  // Check for schema.sql in root
  const schemaPath = path.join(folderPath, 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8')
    migrations.push({ binding: defaultBinding, sql })
  }

  return migrations
}

/**
 * Parse wrangler.toml if it exists
 */
function parseWranglerConfig(folderPath) {
  const wranglerPath = path.join(folderPath, 'wrangler.toml')
  if (!fs.existsSync(wranglerPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(wranglerPath, 'utf8')
    const config = {}

    // Simple TOML parsing for common fields
    // Note: This is a basic parser - complex TOML may need a proper library
    const lines = content.split('\n')
    let currentSection = null
    let currentArray = null

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue

      // Section headers like [vars] or [[d1_databases]]
      const sectionMatch = trimmed.match(/^\[{1,2}([^\]]+)\]{1,2}$/)
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim()
        if (trimmed.startsWith('[[')) {
          // Array section
          currentSection = sectionName
          if (!config[sectionName]) config[sectionName] = []
          config[sectionName].push({})
          currentArray = config[sectionName]
        } else {
          currentSection = sectionName
          if (!config[sectionName]) config[sectionName] = {}
          currentArray = null
        }
        continue
      }

      // Key-value pairs
      const kvMatch = trimmed.match(/^([^=]+)=(.+)$/)
      if (kvMatch) {
        const key = kvMatch[1].trim()
        let value = kvMatch[2].trim()

        // Remove quotes from strings
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        if (currentArray && currentArray.length > 0) {
          currentArray[currentArray.length - 1][key] = value
        } else if (currentSection) {
          config[currentSection][key] = value
        } else {
          config[key] = value
        }
      }
    }

    return config
  } catch (err) {
    console.warn(`Warning: Could not parse wrangler.toml: ${err.message}`)
    return null
  }
}

/**
 * Find the entry point for a Worker
 */
function findEntryPoint(folderPath, explicitMain) {
  if (explicitMain) {
    const mainPath = path.join(folderPath, explicitMain)
    if (fs.existsSync(mainPath)) {
      return explicitMain
    }
    throw new Error(`Specified entry point not found: ${explicitMain}`)
  }

  // Common entry point patterns
  const candidates = [
    'src/index.ts',
    'src/index.js',
    'src/worker.ts',
    'src/worker.js',
    'index.ts',
    'index.js',
    'worker.ts',
    'worker.js',
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(folderPath, candidate))) {
      return candidate
    }
  }

  throw new Error('Could not find Worker entry point. Use --main to specify.')
}

/**
 * Read Worker source files
 */
function readWorkerFiles(dirPath, basePath = '') {
  const files = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      // Skip non-essential directories (but NOT dist/build - those contain static assets)
      if (['node_modules', '.git', '.wrangler'].includes(entry.name)) {
        continue
      }
      files.push(...readWorkerFiles(fullPath, relativePath))
    } else if (entry.isFile()) {
      // Skip hidden files (except .env)
      if (entry.name.startsWith('.') && entry.name !== '.env') {
        continue
      }

      const ext = path.extname(entry.name).toLowerCase()
      const isSource = WORKER_SOURCE_EXTENSIONS.has(ext)
      const isConfig = ['wrangler.toml', 'package.json', 'tsconfig.json'].includes(entry.name)
      const isWasm = ext === '.wasm'

      // Check if this is a static asset (in dist/ or build/ folder)
      const isStaticAsset = basePath.startsWith('dist') || basePath.startsWith('build')

      if (!isSource && !isConfig && !isWasm && !isStaticAsset) {
        continue
      }

      const isBinary = isWasm || isBinaryFile(entry.name)
      const contents = fs.readFileSync(fullPath, isBinary ? 'base64' : 'utf8')

      files.push({
        path: relativePath,
        type: getMimeType(entry.name),
        contents,
        encoding: isBinary ? 'base64' : 'utf8',
      })
    }
  }

  return files
}

/**
 * Upload Worker files to the build service
 */
async function publishWorker(folderPath, options) {
  const resolvedPath = path.resolve(folderPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Folder does not exist: ${resolvedPath}`)
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`)
  }

  const apiUrl = options.apiUrl || DEFAULT_BUILD_API_URL

  // Check for existing .skillboss config (for redeployments)
  const existingConfig = loadSkillbossConfig(resolvedPath)

  // Use projectId from: CLI flag > .skillboss file > auto-generate
  let projectId = options.projectId
  if (!projectId && existingConfig?.projectId) {
    projectId = existingConfig.projectId
    console.log(`Found .skillboss config - redeploying to existing project`)
  }

  // Parse wrangler.toml if present
  const wranglerConfig = parseWranglerConfig(resolvedPath)

  // Find entry point
  const main = findEntryPoint(resolvedPath, options.main || wranglerConfig?.main)
  console.log(`Entry point: ${main}`)

  // Derive worker name
  const name = options.name || wranglerConfig?.name || path.basename(resolvedPath)

  console.log(`Reading Worker files from: ${resolvedPath}`)
  const files = readWorkerFiles(resolvedPath)
  console.log(`Found ${files.length} files`)

  if (files.length === 0) {
    throw new Error('No Worker source files found in the specified folder')
  }

  // Log file summary
  const sourceFiles = files.filter((f) =>
    WORKER_SOURCE_EXTENSIONS.has(path.extname(f.path).toLowerCase()),
  ).length
  const configFiles = files.filter((f) =>
    ['wrangler.toml', 'package.json', 'tsconfig.json'].includes(path.basename(f.path)),
  ).length
  const staticAssets = files.filter(
    (f) => f.path.startsWith('dist/') || f.path.startsWith('build/'),
  ).length
  console.log(`  - Source files: ${sourceFiles}`)
  console.log(`  - Config files: ${configFiles}`)
  if (staticAssets > 0) {
    console.log(`  - Static assets: ${staticAssets}`)
  }

  // Extract bindings from wrangler.toml
  const bindings = {}
  if (wranglerConfig) {
    if (wranglerConfig.d1_databases) {
      bindings.d1 = wranglerConfig.d1_databases.map((db) => ({
        name: db.binding,
        database_name: db.database_name,
      }))
    }
    if (wranglerConfig.kv_namespaces) {
      bindings.kv = wranglerConfig.kv_namespaces.map((kv) => ({
        name: kv.binding,
      }))
    }
    if (wranglerConfig.r2_buckets) {
      bindings.r2 = wranglerConfig.r2_buckets.map((r2) => ({
        name: r2.binding,
        bucket_name: r2.bucket_name,
      }))
    }
    if (wranglerConfig.vars) {
      bindings.vars = wranglerConfig.vars
    }
  }

  // Auto-populate PROJECT_ID if not set in vars
  // This ensures e-commerce workers get the correct project identifier
  if (!bindings.vars) {
    bindings.vars = {}
  }
  if (!bindings.vars.PROJECT_ID && projectId) {
    bindings.vars.PROJECT_ID = projectId
    console.log(`  - Auto-setting PROJECT_ID: ${projectId}`)
  }

  // Read SQL migrations
  const migrations = readMigrations(resolvedPath, bindings)
  if (migrations.length > 0) {
    bindings.migrations = migrations
    console.log(`\nSQL migrations found: ${migrations.length}`)
  }

  // Detect static assets directory (dist/ or build/)
  let assetsDirectory = null
  if (staticAssets > 0) {
    // Check which directory has assets
    const distPath = path.join(resolvedPath, 'dist')
    const buildPath = path.join(resolvedPath, 'build')
    if (fs.existsSync(distPath) && fs.statSync(distPath).isDirectory()) {
      assetsDirectory = './dist'
    } else if (fs.existsSync(buildPath) && fs.statSync(buildPath).isDirectory()) {
      assetsDirectory = './build'
    }
  }

  // Build payload
  const payload = {
    files,
    main,
    name,
    compatibilityDate: wranglerConfig?.compatibility_date || new Date().toISOString().split('T')[0],
    versionIndex: options.version ? parseInt(options.version, 10) : undefined,
  }

  // Add assets configuration if static assets are present
  if (assetsDirectory) {
    payload.assets = { directory: assetsDirectory }
  }

  // Include projectId if available
  if (projectId) {
    payload.projectId = projectId
  }

  // Include bindings if any
  if (Object.keys(bindings).length > 0 || assetsDirectory) {
    payload.bindings = bindings
    console.log(`\nBindings detected:`)
    if (bindings.d1) console.log(`  - D1 databases: ${bindings.d1.map((d) => d.name).join(', ')}`)
    if (bindings.kv) console.log(`  - KV namespaces: ${bindings.kv.map((k) => k.name).join(', ')}`)
    if (bindings.r2) console.log(`  - R2 buckets: ${bindings.r2.map((r) => r.name).join(', ')}`)
    if (bindings.vars) console.log(`  - Environment vars: ${Object.keys(bindings.vars).join(', ')}`)
    if (assetsDirectory)
      console.log(`  - Static assets: ${assetsDirectory} (${staticAssets} files)`)
  }

  console.log(`\nUploading to: ${apiUrl}/upload-worker`)
  console.log(`Worker name: ${name}`)
  if (projectId) {
    console.log(`Project ID: ${projectId}`)
  } else {
    console.log(`Project ID: (will be auto-generated)`)
  }

  console.log(`\nDeploying Worker... (this may take a moment)`)

  // API key is required for authentication
  if (!config.apiKey) {
    throw new Error('API key not found in config.json. Please add your apiKey.')
  }

  const response = await fetchWithRetry(`${apiUrl}/upload-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (result.status === 'success') {
    // Save/update .skillboss config for future redeployments
    const configToSave = {
      projectId: result.projectId,
      url: result.data || result.url,
      type: 'worker',
      updatedAt: new Date().toISOString(),
    }

    // Save binding IDs for reference
    if (result.bindings) {
      configToSave.bindings = result.bindings
    }

    saveSkillbossConfig(resolvedPath, configToSave)

    return {
      success: true,
      url: result.data || result.url,
      projectId: result.projectId,
      fileCount: files.length,
      bindings: result.bindings,
    }
  } else {
    throw new Error(result.error || 'Worker upload failed')
  }
}

// CLI argument parsing
function parseArgs(args) {
  const parsed = {
    command: null,
    folderPath: null,
    projectId: null,
    version: null,
    apiUrl: null,
    main: null,
    name: null,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
    } else if (arg === '--project-id' && args[i + 1]) {
      parsed.projectId = args[++i]
    } else if (arg === '--version' && args[i + 1]) {
      parsed.version = args[++i]
    } else if (arg === '--api-url' && args[i + 1]) {
      parsed.apiUrl = args[++i]
    } else if (arg === '--main' && args[i + 1]) {
      parsed.main = args[++i]
    } else if (arg === '--name' && args[i + 1]) {
      parsed.name = args[++i]
    } else if (!arg.startsWith('-')) {
      if (!parsed.command) {
        parsed.command = arg
      } else if (!parsed.folderPath) {
        parsed.folderPath = arg
      }
    }
  }

  return parsed
}

function showHelp() {
  console.log(`
SkillBoss Build Service - Static and Worker Publishing

Publishes static files or Cloudflare Workers to skillboss.live.

Usage:
  node serve-build.js <command> <folder> [options]

Commands:
  publish-static <folder>   Upload static files and deploy
  publish-worker <folder>   Upload Worker code and deploy with bindings

Common Options:
  --project-id <id>   Project identifier (auto-generated if omitted)
  --version <n>       Version number for versioned deployments
  --api-url <url>     Override build API URL (default: ${DEFAULT_BUILD_API_URL})
  --help, -h          Show this help message

Worker Options (publish-worker only):
  --main <file>       Entry point (default: auto-detect src/index.ts, etc.)
  --name <name>       Worker name (default: folder name)

Static Examples:
  node serve-build.js publish-static ./dist
  node serve-build.js publish-static ./build --project-id my-landing-page

Worker Examples:
  node serve-build.js publish-worker ./worker
  node serve-build.js publish-worker ./api --main src/index.ts
  node serve-build.js publish-worker ./backend --name my-api

Worker Configuration:
  If a wrangler.toml file exists in the folder, bindings (D1, KV, R2, vars)
  will be automatically detected and provisioned on the server.
`)
}

// Main CLI handler
async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.command) {
    showHelp()
    process.exit(args.help ? 0 : 1)
  }

  try {
    if (args.command === 'publish-static') {
      if (!args.folderPath) {
        console.error('Error: Folder path is required for publish-static command')
        console.error('Usage: node serve-build.js publish-static <folder>')
        process.exit(1)
      }

      const result = await publishStatic(args.folderPath, {
        projectId: args.projectId,
        version: args.version,
        apiUrl: args.apiUrl,
      })

      console.log('\n Deployment successful!')
      console.log(`URL: ${result.url}`)
      console.log(`Files uploaded: ${result.fileCount}`)
      console.log(`Project ID: ${result.projectId}`)
    } else if (args.command === 'publish-worker') {
      if (!args.folderPath) {
        console.error('Error: Folder path is required for publish-worker command')
        console.error('Usage: node serve-build.js publish-worker <folder>')
        process.exit(1)
      }

      const result = await publishWorker(args.folderPath, {
        projectId: args.projectId,
        version: args.version,
        apiUrl: args.apiUrl,
        main: args.main,
        name: args.name,
      })

      console.log('\n Worker deployment successful!')
      console.log(`URL: ${result.url}`)
      console.log(`Files uploaded: ${result.fileCount}`)
      console.log(`Project ID: ${result.projectId}`)

      if (result.bindings) {
        console.log(`\nProvisioned bindings:`)
        if (result.bindings.d1) {
          for (const db of result.bindings.d1) {
            console.log(`  D1: ${db.name} -> ${db.database_id}`)
          }
        }
        if (result.bindings.kv) {
          for (const kv of result.bindings.kv) {
            console.log(`  KV: ${kv.name} -> ${kv.namespace_id}`)
          }
        }
        if (result.bindings.r2) {
          for (const r2 of result.bindings.r2) {
            console.log(`  R2: ${r2.name} -> ${r2.bucket_name}`)
          }
        }
      }
    } else {
      console.error(`Unknown command: ${args.command}`)
      showHelp()
      process.exit(1)
    }
  } catch (error) {
    console.error('\nError:', error.message)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main()
}

// Export for module usage
module.exports = { publishStatic, publishWorker }
