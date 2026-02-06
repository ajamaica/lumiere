/**
 * Patch Engine - Search and Replace
 *
 * Applies search/replace patches to file content.
 * Uses exact string matching with context for precision.
 */

/**
 * Apply a search/replace patch to content
 * @param {string} content - Original file content
 * @param {Object} edit - Edit object with searchBlock and replaceBlock
 * @returns {string} Modified content
 * @throws {Error} If search block not found or found multiple times
 */
function applyPatch(content, edit) {
  const { searchBlock, replaceBlock } = edit

  if (!searchBlock) {
    throw new Error('Search block is required')
  }

  // Normalize line endings for consistent matching
  const normalizedContent = content.replace(/\r\n/g, '\n')
  const normalizedSearch = searchBlock.replace(/\r\n/g, '\n').trim()
  const normalizedReplace = (replaceBlock || '').replace(/\r\n/g, '\n')

  // Count occurrences
  const occurrences = countOccurrences(normalizedContent, normalizedSearch)

  if (occurrences === 0) {
    // Try fuzzy match to give helpful error
    const similarPosition = findSimilar(normalizedContent, normalizedSearch)

    if (similarPosition) {
      throw new Error(
        `Search block not found exactly. Closest match at line ${similarPosition.line}:\n` +
          `Expected:\n${normalizedSearch.slice(0, 100)}...\n` +
          `Found:\n${similarPosition.text.slice(0, 100)}...`,
      )
    }

    throw new Error(
      `Search block not found in file. First 50 chars of search:\n` +
        `"${normalizedSearch.slice(0, 50)}..."`,
    )
  }

  if (occurrences > 1) {
    throw new Error(
      `Search block found ${occurrences} times (must be unique). ` +
        `Add more context lines to make the search block unique.`,
    )
  }

  // Apply the replacement
  const result = normalizedContent.replace(normalizedSearch, normalizedReplace)

  return result
}

/**
 * Count occurrences of a substring
 * @param {string} content - Content to search in
 * @param {string} search - String to search for
 * @returns {number} Number of occurrences
 */
function countOccurrences(content, search) {
  let count = 0
  let pos = 0

  while ((pos = content.indexOf(search, pos)) !== -1) {
    count++
    pos += 1 // Move past this occurrence to find overlapping matches
  }

  return count
}

/**
 * Find similar text for better error messages
 * @param {string} content - Content to search in
 * @param {string} search - String to search for
 * @returns {Object|null} Similar match info or null
 */
function findSimilar(content, search) {
  const lines = content.split('\n')
  const searchLines = search.split('\n')
  const firstSearchLine = searchLines[0].trim()

  if (!firstSearchLine) return null

  // Look for lines that start similarly
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if this line is similar to the first search line
    if (line.length > 10 && firstSearchLine.length > 10) {
      const similarity = calculateSimilarity(line, firstSearchLine)

      if (similarity > 0.6) {
        // Extract context around this line
        const contextStart = Math.max(0, i - 2)
        const contextEnd = Math.min(lines.length, i + searchLines.length + 2)
        const contextText = lines.slice(contextStart, contextEnd).join('\n')

        return {
          line: i + 1,
          text: contextText,
          similarity,
        }
      }
    }
  }

  return null
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Jaccard similarity on character trigrams
 */
function calculateSimilarity(a, b) {
  const trigramsA = getTrigrams(a)
  const trigramsB = getTrigrams(b)

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0

  let intersection = 0
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) intersection++
  }

  const union = trigramsA.size + trigramsB.size - intersection
  return intersection / union
}

/**
 * Get character trigrams from a string
 */
function getTrigrams(str) {
  const trigrams = new Set()
  const normalized = str.toLowerCase().replace(/\s+/g, ' ')

  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.add(normalized.slice(i, i + 3))
  }

  return trigrams
}

/**
 * Apply multiple patches in sequence
 * @param {string} content - Original content
 * @param {Array} edits - Array of edit objects
 * @returns {Object} Result with modified content and applied/failed counts
 */
function applyPatches(content, edits) {
  let modifiedContent = content
  const results = {
    applied: 0,
    failed: 0,
    errors: [],
    finalContent: content,
  }

  for (const edit of edits) {
    try {
      modifiedContent = applyPatch(modifiedContent, edit)
      results.applied++
    } catch (error) {
      results.failed++
      results.errors.push({
        edit: {
          filePath: edit.filePath,
          searchPreview: edit.searchBlock?.slice(0, 50) + '...',
        },
        error: error.message,
      })
    }
  }

  results.finalContent = modifiedContent
  return results
}

/**
 * Validate an edit object
 * @param {Object} edit - Edit to validate
 * @returns {Object} Validation result
 */
function validateEdit(edit) {
  const issues = []

  if (!edit) {
    return { valid: false, issues: ['Edit object is null or undefined'] }
  }

  if (!edit.searchBlock || typeof edit.searchBlock !== 'string') {
    issues.push('searchBlock is required and must be a string')
  } else if (edit.searchBlock.trim().length < 5) {
    issues.push('searchBlock is too short (must be at least 5 characters)')
  }

  if (edit.replaceBlock === undefined) {
    issues.push('replaceBlock is required (can be empty string to delete)')
  }

  if (!edit.filePath || typeof edit.filePath !== 'string') {
    issues.push('filePath is required and must be a string')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

module.exports = {
  applyPatch,
  applyPatches,
  countOccurrences,
  findSimilar,
  calculateSimilarity,
  validateEdit,
}
