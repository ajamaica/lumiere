import { File as ExpoFile } from 'expo-file-system'

import type { WorkflowFile } from '../store'
import { logger } from '../utils/logger'

const workflowLogger = logger.create('Workflow')

/** Maximum size (in bytes) of a single file we'll read into context */
const MAX_FILE_SIZE = 100_000 // ~100 KB

/** MIME types we treat as readable text documents */
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'text/yaml',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/x-sh',
])

/** File extensions we consider text-readable even if MIME type is generic */
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
  '.sh',
  '.bash',
  '.zsh',
  '.env',
  '.gitignore',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.log',
  '.sql',
  '.graphql',
  '.proto',
])

/**
 * Check whether a file is likely a readable text document.
 */
export function isTextFile(file: WorkflowFile): boolean {
  if (TEXT_MIME_TYPES.has(file.mimeType)) return true

  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()?.toLowerCase() : ''
  return TEXT_EXTENSIONS.has(ext)
}

/**
 * Read the text content of a single workflow file.
 * Returns null if the file cannot be read or is too large.
 */
export async function readWorkflowFile(file: WorkflowFile): Promise<string | null> {
  try {
    if (file.size > MAX_FILE_SIZE) {
      workflowLogger.info(`Skipping ${file.name}: too large (${file.size} bytes)`)
      return null
    }

    const expoFile = new ExpoFile(file.uri)
    const content = await expoFile.text()
    return content
  } catch (err) {
    workflowLogger.logError(`Failed to read ${file.name}`, err)
    return null
  }
}

export interface FileContext {
  name: string
  content: string
}

/**
 * Build the context string from all readable workflow files.
 * Returns an array of { name, content } objects for files that were successfully read.
 */
export async function buildWorkflowContext(files: WorkflowFile[]): Promise<FileContext[]> {
  const textFiles = files.filter(isTextFile)
  const results: FileContext[] = []

  for (const file of textFiles) {
    const content = await readWorkflowFile(file)
    if (content) {
      results.push({ name: file.name, content })
    }
  }

  return results
}

/**
 * Format the workflow context into a system-level prefix string
 * that gets prepended to the user's message.
 */
export function formatWorkflowContextPrefix(fileContexts: FileContext[]): string {
  if (fileContexts.length === 0) return ''

  const parts = fileContexts.map(
    (fc) => `--- ${fc.name} ---\n${fc.content}\n--- end ${fc.name} ---`,
  )

  return (
    `[Workflow Mode: The following ${fileContexts.length} document(s) are loaded as context. ` +
    `Reference them when relevant and suggest edits using the filename.]\n\n` +
    parts.join('\n\n') +
    '\n\n'
  )
}
