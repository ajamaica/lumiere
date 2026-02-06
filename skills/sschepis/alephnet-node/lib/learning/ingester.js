/**
 * Content Ingester
 *
 * Processes fetched content and prepares it for memory integration:
 * - Text extraction from various formats
 * - Chunking for large documents
 * - Semantic summarization
 * - Prime encoding preparation
 */

const config = require('./config')
const { createLogger } = require('../app/constants')

const log = createLogger('learning:ingester')

class ContentIngester {
  /**
   * Create a new ContentIngester
   * @param {Object} observer - The SentientObserver instance
   * @param {Object} options - Configuration options
   */
  constructor(observer, options = {}) {
    this.observer = observer

    const ingesterConfig = { ...config.ingester, ...options }

    this.maxChunkSize = ingesterConfig.maxChunkSize || 2000
    this.overlapSize = ingesterConfig.overlapSize || 200
    this.minChunkSize = ingesterConfig.minChunkSize || 100

    // Track ingestion statistics
    this.stats = {
      totalIngested: 0,
      chunksCreated: 0,
      bytesProcessed: 0,
    }

    log('ContentIngester initialized, chunk size:', this.maxChunkSize)
  }

  /**
   * Ingest content from a chaperone response
   * @param {Object} response - Response from ChaperoneAPI
   * @returns {Object} Processed content ready for memory integration
   */
  async ingest(response) {
    if (!response || !response.success) {
      log.warn('Cannot ingest failed response')
      return null
    }

    log('Ingesting response type:', response.type)

    let content
    let source
    let format

    switch (response.type) {
      case 'answer':
        content = response.answer
        source = 'chaperone_llm'
        format = 'text'
        break

      case 'content':
        // Content saved to file, read it
        if (response.filepath) {
          try {
            const fs = require('fs')
            const data = await fs.promises.readFile(response.filepath, 'utf-8')
            content = data
            source = response.url || response.filepath
            format = this.detectFormat(response.contentType, response.filepath)
          } catch (error) {
            log.error('Failed to read content file:', error.message)
            return null
          }
        } else {
          content = response.content
          source = response.url
          format = 'text'
        }
        break

      case 'local_content':
        content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        source = response.filepath
        format = this.detectFormat(null, response.filepath)
        break

      case 'summary':
        content = response.summary
        source = 'summarization'
        format = 'text'
        break

      case 'search_results':
        // Format search results as text
        content = this.formatSearchResults(response)
        source = 'search'
        format = 'text'
        break

      default:
        log.warn('Unknown response type for ingestion:', response.type)
        content = JSON.stringify(response)
        source = 'unknown'
        format = 'json'
    }

    if (!content) {
      log.warn('No content to ingest')
      return null
    }

    // Clean content
    const cleanedContent = this.cleanContent(content, format)

    // Chunk if needed
    const chunks = this.chunk(cleanedContent)

    // Process each chunk
    const processed = []
    for (const chunk of chunks) {
      const primes = this.encodePrimes(chunk)
      const topic = this.extractTopic(chunk)
      const keywords = this.extractKeywords(chunk)

      processed.push({
        content: chunk,
        primes,
        topic,
        keywords,
        source,
        format,
        length: chunk.length,
      })
    }

    // Update statistics
    this.stats.totalIngested++
    this.stats.chunksCreated += chunks.length
    this.stats.bytesProcessed += cleanedContent.length

    log('Content ingested:', processed.length, 'chunks,', cleanedContent.length, 'bytes')

    return {
      success: true,
      chunks: processed,
      content: cleanedContent.slice(0, 1000), // Preview
      fullContent: cleanedContent,
      source,
      format,
      topic: processed[0]?.topic || 'unknown',
      keywords: this.mergeKeywords(processed.map((p) => p.keywords)),
      timestamp: Date.now(),
    }
  }

  /**
   * Detect content format from MIME type or filename
   * @param {string} mimeType - MIME type
   * @param {string} filepath - File path
   * @returns {string} Detected format
   */
  detectFormat(mimeType, filepath) {
    if (mimeType) {
      const mime = mimeType.split(';')[0].trim()
      const mimeFormats = {
        'text/plain': 'text',
        'text/html': 'html',
        'text/markdown': 'markdown',
        'text/x-markdown': 'markdown',
        'application/json': 'json',
        'application/pdf': 'pdf',
      }
      if (mimeFormats[mime]) return mimeFormats[mime]
    }

    if (filepath) {
      const path = require('path')
      const ext = path.extname(filepath).toLowerCase()
      const extFormats = {
        '.txt': 'text',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.html': 'html',
        '.htm': 'html',
        '.json': 'json',
        '.pdf': 'pdf',
        '.py': 'code',
        '.js': 'code',
        '.ts': 'code',
      }
      if (extFormats[ext]) return extFormats[ext]
    }

    return 'text'
  }

  /**
   * Clean content based on format
   * @param {string} content - Raw content
   * @param {string} format - Content format
   * @returns {string} Cleaned content
   */
  cleanContent(content, format) {
    if (!content) return ''

    switch (format) {
      case 'html':
        return this.stripHtml(content)

      case 'json':
        try {
          const obj = typeof content === 'string' ? JSON.parse(content) : content
          return this.flattenJson(obj)
        } catch {
          return content
        }

      case 'markdown':
        return this.cleanMarkdown(content)

      case 'pdf':
        // PDF would need a library, for now treat as text
        return content

      case 'code':
        return this.cleanCode(content)

      default:
        return this.normalizeWhitespace(content)
    }
  }

  /**
   * Strip HTML tags and extract text
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  stripHtml(html) {
    // Remove script and style elements
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ')

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    text = text.replace(/&#39;/g, "'")

    return this.normalizeWhitespace(text)
  }

  /**
   * Flatten JSON to readable text
   * @param {Object} obj - JSON object
   * @param {string} prefix - Key prefix
   * @returns {string} Flattened text
   */
  flattenJson(obj, prefix = '') {
    const lines = []

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      if (value === null || value === undefined) {
        lines.push(`${fullKey}: null`)
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(this.flattenJson(value, fullKey))
      } else if (Array.isArray(value)) {
        lines.push(
          `${fullKey}: [${value
            .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
            .join(', ')}]`,
        )
      } else {
        lines.push(`${fullKey}: ${value}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Clean markdown content
   * @param {string} markdown - Markdown content
   * @returns {string} Cleaned content
   */
  cleanMarkdown(markdown) {
    let text = markdown

    // Handle markdown tables - convert | separators to proper spacing
    // First, handle table rows: | cell1 | cell2 | cell3 |
    text = text.replace(/\|([^|\n]+)/g, (match, content) => {
      // Add space before and after cell content
      return ' ' + content.trim() + ' '
    })

    // Remove table separator lines (|---|---|)
    text = text.replace(/^\s*\|?[-:]+\|[-:|\s]+\|?\s*$/gm, '')

    // Clean up any remaining pipe characters
    text = text.replace(/\|/g, ' ')

    // Keep headers but normalize
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '\n$1:\n')

    // Remove links but keep text (with space preservation)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')

    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

    // Remove code blocks (keep inline code)
    text = text.replace(/```[\s\S]*?```/g, ' [code block] ')

    // Remove bold/italic markers (with space preservation)
    text = text.replace(/\*\*(.+?)\*\*/g, ' $1 ')
    text = text.replace(/\*(.+?)\*/g, ' $1 ')
    text = text.replace(/__(.+?)__/g, ' $1 ')
    text = text.replace(/_(.+?)_/g, ' $1 ')

    // Handle bullet points and list items
    text = text.replace(/^\s*[-*+]\s+/gm, '\n• ')
    text = text.replace(/^\s*\d+\.\s+/gm, '\n')

    // Handle horizontal rules
    text = text.replace(/^[-*_]{3,}\s*$/gm, '\n---\n')

    // Handle blockquotes
    text = text.replace(/^>\s*/gm, '')

    return this.normalizeWhitespace(text)
  }

  /**
   * Clean code content
   * @param {string} code - Code content
   * @returns {string} Cleaned content
   */
  cleanCode(code) {
    // Extract comments and docstrings as the most semantic content
    const comments = []

    // Multi-line comments
    const multiLine = code.match(/\/\*[\s\S]*?\*\//g) || []
    comments.push(...multiLine.map((c) => c.replace(/\/\*|\*\//g, '').trim()))

    // Single-line comments
    const singleLine = code.match(/\/\/.*$/gm) || []
    comments.push(...singleLine.map((c) => c.replace(/^\/\/\s*/, '')))

    // Python comments and docstrings
    const pythonComments = code.match(/#.*$/gm) || []
    comments.push(...pythonComments.map((c) => c.replace(/^#\s*/, '')))

    const docstrings = code.match(/"""[\s\S]*?"""/g) || []
    comments.push(...docstrings.map((c) => c.replace(/"""/g, '').trim()))

    // If we have comments, return them; otherwise return normalized code
    if (comments.length > 0) {
      return comments.join('\n')
    }

    return this.normalizeWhitespace(code)
  }

  /**
   * Normalize whitespace
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeWhitespace(text) {
    return (
      text
        // Convert various Unicode whitespace to regular spaces
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
        // Handle carriage returns
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Tabs to spaces
        .replace(/\t/g, ' ')
        // Handle zero-width characters that might cause word merging
        .replace(/[\u200C\u200D\u2060]/g, '')
        // Handle em-dashes and en-dashes with spaces around them
        .replace(/\u2014/g, ' — ')
        .replace(/\u2013/g, ' – ')
        // Handle smart quotes by converting to regular quotes
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        // Multiple spaces to single space
        .replace(/ +/g, ' ')
        // Multiple newlines to double
        .replace(/\n{3,}/g, '\n\n')
        // Clean up space around newlines
        .replace(/ *\n */g, '\n')
        .trim()
    )
  }

  /**
   * Chunk content into manageable pieces
   * @param {string} content - Content to chunk
   * @returns {Array<string>} Array of chunks
   */
  chunk(content) {
    if (content.length <= this.maxChunkSize) {
      return [content]
    }

    const chunks = []
    let start = 0

    while (start < content.length) {
      let end = start + this.maxChunkSize

      // Try to break at sentence boundary
      if (end < content.length) {
        // Look for sentence endings
        const searchWindow = content.slice(start + this.maxChunkSize / 2, end)
        const sentenceEnds = ['. ', '.\n', '? ', '?\n', '! ', '!\n']

        let bestBreak = -1
        for (const ending of sentenceEnds) {
          const idx = searchWindow.lastIndexOf(ending)
          if (idx > bestBreak) {
            bestBreak = idx
          }
        }

        if (bestBreak !== -1) {
          end = start + this.maxChunkSize / 2 + bestBreak + 2 // +2 for the ending chars
        }
      }

      const chunk = content.slice(start, end).trim()

      if (chunk.length >= this.minChunkSize) {
        chunks.push(chunk)
      }

      // Move start, allowing for overlap
      start = end - this.overlapSize
      if (start < 0) start = 0
    }

    return chunks
  }

  /**
   * Encode content as prime numbers (if backend available)
   * @param {string} content - Content to encode
   * @returns {Array<number>} Prime encoding
   */
  encodePrimes(content) {
    if (!this.observer || !this.observer.backend) {
      return []
    }

    try {
      return this.observer.backend.encode(content.slice(0, 500))
    } catch (error) {
      log.warn('Prime encoding failed:', error.message)
      return []
    }
  }

  /**
   * Extract main topic from content
   * @param {string} content - Content to analyze
   * @returns {string} Extracted topic
   */
  extractTopic(content) {
    // First try: first heading or first sentence
    const lines = content.split('\n').filter((l) => l.trim())

    if (lines.length > 0) {
      const firstLine = lines[0].trim()

      // Check if it looks like a heading
      if (firstLine.endsWith(':') || (firstLine.length < 100 && !firstLine.endsWith('.'))) {
        return firstLine.replace(/:$/, '')
      }

      // Otherwise, take first sentence
      const firstSentence = content.match(/^[^.!?]+[.!?]/)
      if (firstSentence) {
        return firstSentence[0].slice(0, 100)
      }

      // Fallback: first N characters
      return firstLine.slice(0, 80)
    }

    return 'Unknown topic'
  }

  /**
   * Extract keywords from content
   * @param {string} content - Content to analyze
   * @returns {Array<string>} Extracted keywords
   */
  extractKeywords(content) {
    // Simple keyword extraction using word frequency
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'and',
      'but',
      'or',
      'nor',
      'so',
      'yet',
      'both',
      'either',
      'neither',
      'not',
      'only',
      'own',
      'same',
      'than',
      'too',
      'very',
      'just',
      'that',
      'this',
      'these',
      'those',
      'what',
      'which',
      'who',
      'whom',
      'it',
      'its',
      'they',
      'them',
      'their',
      'we',
      'us',
      'our',
      'you',
      'your',
      'he',
      'him',
      'his',
      'she',
      'her',
      'hers',
      'i',
      'me',
      'my',
      'mine',
    ])

    // Tokenize and count
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))

    const counts = {}
    for (const word of words) {
      counts[word] = (counts[word] || 0) + 1
    }

    // Sort by frequency and return top keywords
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)

    return sorted
  }

  /**
   * Merge keywords from multiple chunks
   * @param {Array<Array<string>>} keywordLists - Lists of keywords
   * @returns {Array<string>} Merged keywords
   */
  mergeKeywords(keywordLists) {
    const counts = {}

    for (const list of keywordLists) {
      for (const keyword of list) {
        counts[keyword] = (counts[keyword] || 0) + 1
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word)
  }

  /**
   * Format search results as readable text
   * @param {Object} response - Search response
   * @returns {string} Formatted text
   */
  formatSearchResults(response) {
    const lines = [`Search results for: ${response.query}`]

    if (response.suggestions && response.suggestions.length > 0) {
      lines.push('\nSuggested resources:')
      for (const url of response.suggestions) {
        lines.push(`- ${url}`)
      }
    } else {
      lines.push('\nNo specific resources found.')
    }

    return lines.join('\n')
  }

  /**
   * Get ingestion statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  reset() {
    this.stats = {
      totalIngested: 0,
      chunksCreated: 0,
      bytesProcessed: 0,
    }
    log('ContentIngester reset')
  }
}

module.exports = { ContentIngester }
