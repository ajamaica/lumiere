#!/usr/bin/env node
/**
 * Local Vector Memory using Transformers.js
 * 100% local embeddings - no API calls, no Docker
 *
 * Model: all-MiniLM-L6-v2 (384 dims, ~80MB)
 * Storage: JSON file (same format as simple version)
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const MEMORY_DIR = '/config/.openclaw/workspace/memory'
const MEMORY_FILE = '/config/.openclaw/workspace/MEMORY.md'
const VECTOR_DB_PATH = '/config/.openclaw/workspace/vector-memory/vectors_local.json'
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'

// Lazy-loaded pipeline
let embedder = null

async function getEmbedder() {
  if (embedder) return embedder

  console.error('Loading embedding model (first time, ~80MB)...')

  // Dynamic import for ES modules
  const { pipeline, env } = await import('@xenova/transformers')

  // Use local cache in workspace
  env.cacheDir = '/config/.openclaw/workspace/.cache/transformers'

  embedder = await pipeline('feature-extraction', MODEL_NAME, {
    quantized: true, // Smaller, faster
  })

  console.error('Model loaded!')
  return embedder
}

// Get embedding for text
async function getEmbedding(text) {
  const pipe = await getEmbedder()
  const result = await pipe(text, { pooling: 'mean', normalize: true })
  return Array.from(result.data)
}

// Cosine similarity
function cosineSimilarity(vec1, vec2) {
  let dot = 0,
    mag1 = 0,
    mag2 = 0
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i]
    mag1 += vec1[i] * vec1[i]
    mag2 += vec2[i] * vec2[i]
  }
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) || 1)
}

// Semantic chunking (split on headers/paragraphs, not just lines)
function semanticChunks(text) {
  // Split on markdown headers or double newlines
  const sections = text.split(/\n(?=#{1,6}\s)/).filter((s) => s.trim())

  const chunks = []
  let currentLine = 1

  for (const section of sections) {
    const lines = section.split('\n')
    const lineCount = lines.length

    // If section is too big, split it
    if (lineCount > 100) {
      for (let i = 0; i < lines.length; i += 50) {
        const chunkLines = lines.slice(i, i + 50)
        chunks.push({
          content: chunkLines.join('\n'),
          startLine: currentLine + i,
          endLine: currentLine + Math.min(i + 50, lines.length) - 1,
        })
      }
    } else {
      chunks.push({
        content: section,
        startLine: currentLine,
        endLine: currentLine + lineCount - 1,
      })
    }

    currentLine += lineCount
  }

  return chunks
}

// Load/create database
function loadDB() {
  if (fs.existsSync(VECTOR_DB_PATH)) {
    return JSON.parse(fs.readFileSync(VECTOR_DB_PATH, 'utf-8'))
  }
  return { chunks: [], lastSync: null, model: MODEL_NAME }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(VECTOR_DB_PATH), { recursive: true })
  fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(db, null, 2))
}

function hashFile(content) {
  return crypto.createHash('md5').update(content).digest('hex')
}

// Sync a file
async function syncFile(filePath, db) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileHash = hashFile(content)
  const relativePath = path.relative('/config/.openclaw/workspace', filePath)

  // Remove old chunks
  const beforeCount = db.chunks.length
  db.chunks = db.chunks.filter((c) => c.path !== relativePath)

  // Create semantic chunks
  const chunks = semanticChunks(content)
  console.error(`Embedding ${chunks.length} chunks for ${relativePath}...`)

  let embedded = 0
  for (const chunk of chunks) {
    try {
      const embedding = await getEmbedding(chunk.content.slice(0, 500))
      db.chunks.push({
        path: relativePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        embedding: embedding,
        hash: fileHash,
      })
      embedded++

      // Progress indicator
      if (embedded % 5 === 0) {
        process.stderr.write('.')
      }
    } catch (err) {
      console.error(`\nError embedding chunk: ${err.message}`)
    }
  }

  console.error(` done (${embedded} chunks)`)
  return embedded
}

// Sync all files
async function syncAll() {
  console.error('Starting local vector memory sync...')
  console.error(`Model: ${MODEL_NAME}\n`)

  const db = loadDB()
  let total = 0

  if (fs.existsSync(MEMORY_FILE)) {
    total += await syncFile(MEMORY_FILE, db)
  }

  if (fs.existsSync(MEMORY_DIR)) {
    const files = fs
      .readdirSync(MEMORY_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(MEMORY_DIR, f))

    for (const file of files) {
      total += await syncFile(file, db)
    }
  }

  db.lastSync = new Date().toISOString()
  saveDB(db)

  console.error(`\nTotal embedded: ${total} chunks`)
  console.error(`Database: ${VECTOR_DB_PATH}`)
}

// Search
async function search(query, maxResults = 5) {
  const db = loadDB()

  if (db.chunks.length === 0) {
    console.error('No chunks indexed. Run --sync first.')
    return []
  }

  console.error(`Searching: "${query}"`)
  const queryEmbedding = await getEmbedding(query)

  // Score all chunks
  const scored = db.chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))

  // Sort and filter
  const results = scored
    .filter((c) => c.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  // Merge adjacent chunks from same file
  const merged = []
  let current = null

  for (const r of results) {
    if (current && current.path === r.path && r.startLine <= current.endLine + 5) {
      // Merge
      current.content += '\n' + r.content
      current.endLine = r.endLine
      current.score = Math.max(current.score, r.score)
    } else {
      if (current) merged.push(current)
      current = { ...r }
    }
  }
  if (current) merged.push(current)

  return merged.slice(0, maxResults)
}

// Get full content from file
function getFullContent(filePath, startLine, endLine) {
  const fullPath = path.join('/config/.openclaw/workspace', filePath)
  if (!fs.existsSync(fullPath)) return null

  const content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')
  const slice = lines.slice(startLine - 1, endLine)

  return {
    path: filePath,
    from: startLine,
    content: slice.join('\n'),
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === '--sync') {
    await syncAll()
  } else if (command === '--search') {
    const query = args[1]
    const maxResults = parseInt(args.find((a, i) => args[i - 1] === '--max-results') || '5')

    if (!query) {
      console.error('Usage: --search "query" [--max-results N]')
      process.exit(1)
    }

    const results = await search(query, maxResults)

    // Fetch full content
    const fullResults = results
      .map((r) => {
        const full = getFullContent(r.path, r.startLine, r.endLine)
        return full
          ? {
              ...full,
              score: r.score,
            }
          : null
      })
      .filter(Boolean)

    console.log(
      JSON.stringify(
        {
          query,
          results: fullResults.map((r) => ({
            path: r.path,
            from: r.from,
            lines: r.content.split('\n').length,
            score: Math.round(r.score * 100) / 100,
            snippet: r.content.slice(0, 500) + (r.content.length > 500 ? '...' : ''),
          })),
        },
        null,
        2,
      ),
    )
  } else if (command === '--status') {
    const db = loadDB()
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          model: db.model || 'unknown',
          chunks: db.chunks.length,
          lastSync: db.lastSync,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`
Local Vector Memory (100% Local)
Model: ${MODEL_NAME}

Usage:
  node vector_memory_local.js --sync
  node vector_memory_local.js --search "query" [--max-results 5]
  node vector_memory_local.js --status

First run will download ~80MB model to .cache/transformers/
`)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
