/**
 * File-Deduplicator - Find and remove duplicate files intelligently
 * Vernox v1.0 - Autonomous Revenue Agent
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Load configuration
const configPath = path.join(__dirname, 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Constants
const HASH_ALGORITHM = config.hashing?.algorithm || 'md5'
const BUFFER_SIZE = config.hashing?.bufferSize || 8192
const MAX_FILE_SIZE = config.hashing?.maxFileSize || 104857600
const SIZE_TOLERANCE = config.detection?.sizeTolerancePercent / 100 || 0

/**
 * Simple logging function
 */
function log(message) {
  const logFilePath = config.logging?.logFile
    ? path.join(path.dirname(configPath), config.logging.logFile)
    : path.join(__dirname, 'deduplication.log')

  if (config.logging?.maxLogSize) {
    const existingLog = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf8') : ''
    if (existingLog.length > config.logging.maxLogSize) {
      fs.writeFileSync(logFilePath, '', { flag: 'a' }) // Truncate if too large
    }
  }

  fs.appendFileSync(logFilePath, message + '\n')
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const m = k * k
  const g = m * k

  let i = 0
  let unitIndex = 0

  while (bytes >= 1024 && i < units.length - 1) {
    i++
    bytes /= 1024
  }

  if (bytes < 1024) {
    return `${bytes.toFixed(2)} ${units[i]}`
  }

  unitIndex = i
  const size = bytes.toFixed(2)
  return `${size} ${units[unitIndex]}`
}

/**
 * Compute MD5 hash of file content
 */
function computeHash(filePath, callback) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(HASH_ALGORITHM)
    const stream = fs.createReadStream(filePath)

    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => {
      const digest = hash.digest('hex')
      resolve(digest)
    })
  })
}

/**
 * Get file stats (size, mtime, etc.)
 */
function getStats(filePath) {
  try {
    return fs.statSync(filePath)
  } catch (error) {
    return null
  }
}

/**
 * Check if filename should be excluded
 */
function shouldExclude(filePath) {
  const fileName = path.basename(filePath)

  // Check exclude patterns
  for (const pattern of config.exclude?.patterns || []) {
    if (pattern.startsWith('.') && fileName.includes(pattern.replace(/^\./, ''))) {
      return true
    }
    if (fileName.includes(pattern.replace(/^\./, ''))) {
      return true
    }
  }

  // Check whitelist
  for (const whitelistItem of config.exclude?.whitelist || []) {
    if (filePath.includes(whitelistItem)) {
      return true
    }
  }

  return false
}

/**
 * Compute name similarity score (0-1)
 */
function nameSimilarity(name1, name2) {
  const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '')
  const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (n1 === n2) return 1

  // Levenshtein distance simplified
  const longer = n1.length > n2.length ? n1 : n2
  const shorter = n1.length > n2.length ? n2 : n1

  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++
    }
  }

  return matches / longer.length
}

/**
 * Find all files in directory (recursively)
 */
function scanDirectory(dir, options = {}) {
  const files = []
  let scannedCount = 0

  function scan(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath)

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry)
        const stats = getStats(fullPath)

        if (!stats) continue

        if (shouldExclude(fullPath)) {
          continue
        }

        if (stats.isDirectory()) {
          if (options.includeSubdirs !== false) {
            scan(fullPath)
          }
        } else {
          files.push(fullPath)
          scannedCount++
        }
      }
    } catch (error) {
      // Skip directories we can't read
      log(`Error scanning ${currentPath}: ${error.message}`)
    }
  }

  scan(dir)
  return { files, scannedCount }
}

/**
 * Find duplicate files using multiple methods
 */
function findDuplicates(params) {
  const { directories, options = {} } = params

  if (!directories || !Array.isArray(directories)) {
    throw new Error('directories must be an array of directory paths')
  }

  const method = options.method || config.detection?.defaultMethod || 'content'
  const allFiles = []
  const statsByHash = new Map()
  const sizeGroups = new Map()
  const nameGroups = new Map()

  // Scan all directories
  for (const dir of directories) {
    log(`Scanning directory: ${dir}`)
    const { files: dirFiles, scannedCount } = scanDirectory(dir, options)

    for (const file of dirFiles) {
      const stats = getStats(file)
      if (!stats) continue

      allFiles.push(file)

      // Method 1: Content-based (hash)
      if (method === 'content' || method === 'all') {
        try {
          const hash = computeHash(file)
          statsByHash.set(hash, {
            files: [file],
            size: stats.size,
            mtime: stats.mtime,
          })
        } catch (error) {
          log(`Error hashing ${file}: ${error.message}`)
        }
      }

      // Method 2: Size-based
      if (method === 'size' || method === 'all') {
        const sizeKey = Math.floor(stats.size / 1048576) // Group by MB
        if (!sizeGroups.has(sizeKey)) {
          sizeGroups.set(sizeKey, [])
        }
        sizeGroups.get(sizeKey).push(file)
      }

      // Method 3: Name-based
      if (method === 'name' || method === 'all') {
        const fileName = path.basename(file)
        const nameKey = fileName.toLowerCase().replace(/\.[^.]+$/, '')

        if (!nameGroups.has(nameKey)) {
          nameGroups.set(nameKey, [])
        }
        nameGroups.get(nameKey).push(file)
      }
    }

    log(`Scanned ${scannedCount} files in ${dir}`)
  }

  log(`Total files scanned: ${allFiles.length}`)

  // Process duplicates by method
  const duplicates = []

  // Content-based duplicates
  if (method === 'content' || method === 'all') {
    for (const [hash, data] of statsByHash) {
      if (data.files.length > 1) {
        duplicates.push({
          type: 'content',
          hash: hash,
          files: data.files,
          size: data.size,
          action: determineKeepAction(data.files),
          totalSize: data.files.length * data.size,
          spaceWasted: (data.files.length - 1) * data.size,
        })
      }
    }
  }

  // Size-based duplicates
  if (method === 'size' || method === 'all') {
    const minSize = options.minSize || 0
    const maxSize = options.maxSize || MAX_FILE_SIZE

    for (const [sizeKey, files] of sizeGroups) {
      if (files.length > 1) {
        // Filter by size constraints
        const validFiles = files.filter((f) => {
          const s = f.size
          return s >= minSize && s <= maxSize
        })

        if (validFiles.length > 1) {
          // Sort by mtime
          validFiles.sort((a, b) => b.mtime - a.mtime)

          const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0)
          const spaceWasted = (validFiles.length - 1) * validFiles[0].size

          duplicates.push({
            type: 'size',
            sizeKey: sizeKey,
            files: validFiles,
            size: validFiles[0].size,
            action: determineKeepAction(validFiles),
            totalSize: totalSize,
            spaceWasted: spaceWasted,
          })
        }
      }
    }
  }

  // Name-based duplicates
  if (method === 'name' || method === 'all') {
    const threshold = options.nameSimilarity || config.detection?.nameSimilarity || 0.7

    for (const [nameKey, files] of nameGroups) {
      if (files.length > 1) {
        // Find duplicate pairs
        const duplicatePairs = []
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const score = nameSimilarity(files[i], files[j])
            if (score >= threshold) {
              duplicatePairs.push([i, j])
            }
          }
        }

        // Group duplicates
        const uniqueIndices = new Set()
        const duplicateGroups = []
        let processed = new Set()

        for (const [i, j] of duplicatePairs) {
          if (processed.has(i) || processed.has(j)) continue
          processed.add(i)
          processed.add(j)

          // Find which group this pair belongs to
          let groupIndex = -1
          for (let g = 0; g < duplicateGroups.length; g++) {
            if (duplicateGroups[g].includes(i) || duplicateGroups[g].includes(j)) {
              groupIndex = g
              duplicateGroups[g].push(i, j)
              break
            }
          }
        }

        if (duplicateGroups.length > 0) {
          const groupFiles = duplicateGroups.map((_, indices) => indices.map((idx) => files[idx]))
          const totalSize = groupFiles.reduce((sum, f) => sum + f.size, 0)
          const spaceWasted = (groupFiles.length - 1) * groupFiles[0].size

          duplicates.push({
            type: 'name',
            nameKey: nameKey,
            files: groupFiles,
            size: groupFiles[0].size,
            action: determineKeepAction(groupFiles),
            totalSize: totalSize,
            spaceWasted: spaceWasted,
          })
        }
      }
    }
  }

  // Sort duplicates by space wasted (largest first)
  duplicates.sort((a, b) => b.spaceWasted - a.spaceWasted)

  return {
    duplicates,
    totalFiles: allFiles.length,
    method,
    directories,
  }
}

/**
 * Determine which file to keep based on keep option
 */
function determineKeepAction(files) {
  const keep = config.removal?.defaultKeep || 'newest'

  if (keep === 'newest') {
    // Return index of newest file (highest mtime)
    let newestIndex = 0
    let newestMtime = 0

    files.forEach((f, i) => {
      const stats = getStats(f)
      if (stats && stats.mtime > newestMtime) {
        newestMtime = stats.mtime
        newestIndex = i
      }
    })

    return { keepIndex: newestIndex, action: 'keep-newest' }
  }

  if (keep === 'oldest') {
    let oldestIndex = 0
    let oldestMtime = Infinity

    files.forEach((f, i) => {
      const stats = getStats(f)
      if (stats && stats.mtime < oldestMtime) {
        oldestMtime = stats.mtime
        oldestIndex = i
      }
    })

    return { keepIndex: oldestIndex, action: 'keep-oldest' }
  }

  if (keep === 'smallest') {
    let smallestIndex = 0
    let smallestSize = Infinity

    files.forEach((f, i) => {
      const stats = getStats(f)
      if (stats && stats.size < smallestSize) {
        smallestSize = stats.size
        smallestIndex = i
      }
    })

    return { keepIndex: smallestIndex, action: 'keep-smallest' }
  }

  if (keep === 'largest') {
    let largestIndex = 0
    let largestSize = 0

    files.forEach((f, i) => {
      const stats = getStats(f)
      if (stats && stats.size > largestSize) {
        largestSize = stats.size
        largestIndex = i
      }
    })

    return { keepIndex: largestIndex, action: 'keep-largest' }
  }

  return { keepIndex: 0, action: 'keep-first' }
}

/**
 * Remove or move duplicate files
 */
function removeDuplicates(params) {
  const { directories, options = {} } = params

  if (!directories || !Array.isArray(directories)) {
    throw new Error('directories must be an array of directory paths')
  }

  const findResult = findDuplicates({ directories, options })
  const { duplicates } = findResult

  const action = options.action || config.removal?.defaultAction || 'delete'
  const dryRun = options.dryRun !== undefined ? options.dryRun : config.removal?.dryRunDefault
  const archivePath = options.archivePath || config.removal?.archivePath
  const sizeThreshold = options.sizeThreshold || config.removal?.sizeThreshold

  let filesRemoved = 0
  let spaceSaved = 0
  const errors = []
  const processed = new Set()

  // Log file path
  const logFilePath = config.logging?.logFile
    ? path.join(path.dirname(configPath), config.logging.logFile)
    : path.join(__dirname, 'deduplication.log')

  for (const dup of duplicates) {
    const { files, keepIndex, spaceWasted } = dup

    if (files.length <= 1) {
      log(`Skipping ${files[0]} (only 1 file in group)`)
      continue
    }

    // Check size threshold
    const stats = getStats(files[0])
    if (stats && stats.size > sizeThreshold) {
      log(`Skipping ${files[0]} (size ${stats.size} exceeds threshold ${sizeThreshold})`)
      continue
    }

    // Determine which files to remove
    const toRemove = []
    for (let i = 0; i < files.length; i++) {
      if (i === keepIndex) continue // Keep this one
      if (processed.has(files[i])) continue // Already handled
      toRemove.push(i)
    }

    if (toRemove.length === 0) {
      log(`No files to remove from duplicate group`)
      continue
    }

    // Process each file for removal
    for (const index of toRemove) {
      const fileToRemove = files[index]
      const key = `${fileToRemove}:${spaceWasted}:${action}`

      if (processed.has(key)) {
        log(`Already processed: ${fileToRemove}`)
        continue
      }
      processed.add(key)

      if (dryRun) {
        log(`[DRY RUN] Would ${action}: ${fileToRemove} (${formatBytes(spaceWasted)})`)
      } else {
        try {
          if (action === 'delete') {
            fs.unlinkSync(fileToRemove)
            log(`Deleted: ${fileToRemove}`)
            filesRemoved++
            spaceSaved += spaceWasted
          } else if (action === 'move') {
            if (!archivePath) {
              throw new Error('archivePath required for move action')
            }

            const archiveDir = path.resolve(archivePath)
            if (!fs.existsSync(archiveDir)) {
              fs.mkdirSync(archiveDir, { recursive: true })
            }

            const fileName = path.basename(fileToRemove)
            const destPath = path.join(archiveDir, fileName)

            // Handle name collisions
            let finalDest = destPath
            let counter = 1
            while (fs.existsSync(finalDest)) {
              const ext = path.extname(fileName)
              const base = path.basename(fileName, ext)
              finalDest = path.join(archiveDir, `${base}_${counter}${ext}`)
              counter++
            }

            fs.renameSync(fileToRemove, finalDest)
            log(`Moved: ${fileToRemove} -> ${finalDest}`)
            filesRemoved++
            spaceSaved += spaceWasted
          } else if (action === 'archive') {
            log(`Archived in place: ${fileToRemove}`)
            filesRemoved++
            spaceSaved += spaceWasted
          }
        } catch (err) {
          const errorMsg = {
            file: fileToRemove,
            errorMsg: err.message || err,
            action: action,
          }
          errors.push(errorMsg)
          log(`Error ${action} ${fileToRemove}: ${err.message}`)
        }
      }
    }
  }

  // Write log file
  const logContent = errors.length > 0 ? `${errors.map((e) => JSON.stringify(e)).join('\n')}` : ''
  fs.writeFileSync(logFilePath, logContent, { flag: 'a' })

  return {
    filesRemoved,
    spaceSaved,
    errors,
    logPath: logFilePath,
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const m = k * k
  const g = m * k

  let i = 0
  let unitIndex = 0

  while (bytes >= 1024 && i < units.length - 1) {
    i++
    bytes /= 1024
  }

  if (bytes < 1024) {
    return `${bytes.toFixed(2)} ${units[i]}`
  }

  unitIndex = i
  const size = bytes.toFixed(2)
  return `${size} ${units[unitIndex]}`
}

/**
 * Analyze a directory for duplicate statistics
 */
function analyzeDirectory(params) {
  const { directory, options = {} } = params

  if (!directory) {
    throw new Error('directory is required')
  }

  const startTime = Date.now()
  const { files: dirFiles, scannedCount } = scanDirectory(directory, options)
  const { duplicates, totalFiles } = findDuplicates({ directories: [directory], options })

  const scanDuration = Date.now() - startTime

  const totalSize = dirFiles.reduce((sum, f) => sum + (getStats(f)?.size || 0), 0)
  const duplicateSize = duplicates.reduce((sum, dup) => sum + (dup.spaceWasted || 0), 0)

  return {
    fileCount: scannedCount,
    totalFiles: totalFiles,
    duplicateCount: duplicates.length,
    duplicateSize: duplicateSize,
    totalSize: totalSize,
    duplicateRatio: totalSize > 0 ? ((duplicateSize / totalSize) * 100).toFixed(2) : 0,
    scanDuration,
    directories: [directory],
  }
}

/**
 * Main function - handles tool invocations
 */
function main(action, params) {
  switch (action) {
    case 'findDuplicates':
      return findDuplicates(params)

    case 'removeDuplicates':
      return removeDuplicates(params)

    case 'analyzeDirectory':
      return analyzeDirectory(params)

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const action = args[0]

  try {
    const params = JSON.parse(args[1] || '{}')
    const result = main(action, params)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          error: error.message || error,
        },
        null,
        2,
      ),
    )
    process.exit(1)
  }
}

module.exports = { main, findDuplicates, removeDuplicates, analyzeDirectory }
