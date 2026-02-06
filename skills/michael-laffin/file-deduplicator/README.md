# File-Deduplicator

**Find and remove duplicate files intelligently. Save storage space, keep your system clean.**

## Quick Start

```bash
# Install
clawhub install file-deduplicator

# Find duplicates in directory
cd ~/.openclaw/skills/file-deduplicator
node index.js findDuplicates '{"directories":["./documents","./downloads"],"options":{"method":"content"}}'

# Remove duplicates automatically
node index.js removeDuplicates '{"directories":["./documents"],"options":{"keep":"newest","action":"delete"}}'
```

## Usage Examples

### Find All Types of Duplicates

```javascript
const result = await findDuplicates({
  directories: ['~/Documents', '~/Downloads'],
  options: {
    method: 'all', // Check content, size, and name
  },
})

console.log(`Found ${result.duplicates.length} duplicate groups`)
console.log(`Space wasted: ${formatBytes(result.totalWasted)}`)
```

### Content-Based Duplicates (Most Accurate)

```javascript
const result = await findDuplicates({
  directories: ['~/Documents'],
  options: {
    method: 'content', // MD5 hashing
  },
})
```

### Size-Based Duplicates (Fastest)

```javascript
const result = await findDuplicates({
  directories: ['~/Pictures', '~/Videos'],
  options: {
    method: 'size',
    minSize: 1048576, // 1MB minimum
    maxSize: 104857600, // 100MB maximum
  },
})
```

### Name-Based Duplicates (Find Renamed Copies)

```javascript
const result = await findDuplicates({
  directories: ['~/Documents'],
  options: {
    method: 'name',
    nameSimilarity: 0.7, // 70% similarity threshold
  },
})
```

## Tool Functions

### `findDuplicates`

Find duplicate files across directories.

**Parameters:**

- `directories` (array, required): Directory paths to scan
- `options` (object, optional):
  - `method` (string): 'content' | 'size' | 'name' | 'all' (default: 'all')
  - `includeSubdirs` (boolean): Scan recursively (default: true)
  - `minSize` (number): Minimum size in bytes (default: 0)
  - `maxSize` (number): Maximum size in bytes (default: 0)
  - `excludePatterns` (array): Glob patterns to exclude (default: '.git', 'node_modules')
  - `nameSimilarity` (number): 0-1 for name-based (default: 0.7)
  - `whitelist` (array): Directories to never scan

**Returns:**

- `duplicates` (array): Array of duplicate groups
- `totalFiles` (number): Total files scanned
- `method` (string): Detection method used

### `removeDuplicates`

Remove or move duplicate files.

**Parameters:**

- `directories` (array, required): Same as findDuplicates
- `options` (object, optional):
  - `keep` (string): 'newest' | 'oldest' | 'smallest' | 'largest' (default: 'newest')
  - `action` (string): 'delete' | 'move' | 'archive' (default: 'delete')
  - `archivePath` (string): Where to move files when action='move'
  - `dryRun` (boolean): Preview without actual action
  - `sizeThreshold` (number): Don't remove files larger than this (default: 10MB)

**Returns:**

- `filesRemoved` (number): Number of files removed/moved
- `spaceSaved` (number): Bytes saved
- `errors` (array): Error details
- `logPath` (string): Path to action log

### `analyzeDirectory`

Analyze a single directory for duplicate statistics.

**Parameters:**

- `directory` (string, required): Path to directory
- `options` (object, optional): Same as findDuplicates options

**Returns:**

- `fileCount` (number): Total files scanned
- `duplicateCount` (number): Number of duplicate groups
- `duplicateSize` (number): Total bytes in duplicates
- `totalSize` (number): Total bytes in directory
- `duplicateRatio` (number): Percentage of files that are duplicates
- `scanDuration` (number): Time taken to scan (ms)

## Use Cases

### Digital Hoarder Cleanup

- Find duplicate photos/videos
- Identify wasted storage space
- Remove old duplicates, keep newest
- Clean up download folders

### Document Management

- Find duplicate PDFs, docs, reports
- Keep latest version, archive old versions
- Prevent version confusion
- Reduce backup bloat

### Project Cleanup

- Find duplicate source files
- Remove duplicate build artifacts
- Clean up node_modules duplicates
- Save storage on SSD/HDD

### Backup Optimization

- Find duplicate backup files
- Remove redundant backups
- Identify what's actually duplicated
- Save space on backup drives

## Configuration

Edit `config.json` to customize:

```json
{
  "detection": {
    "defaultMethod": "content",
    "sizeTolerancePercent": 0,
    "nameSimilarity": 0.7,
    "includeSubdirs": true
  },
  "removal": {
    "defaultAction": "delete",
    "defaultKeep": "newest",
    "archivePath": "./archive",
    "sizeThreshold": 10485760,
    "autoConfirm": false
  },
  "exclude": {
    "patterns": [".git", "node_modules", ".vscode", ".idea"],
    "whitelist": ["important", "work", "projects"]
  }
}
```

## Performance

### Scanning Speed

- **Small directories** (<1000 files): <1s
- **Medium directories** (1000-10000 files): 1-5s
- **Large directories** (10000+ files): 5-20s

### Detection Accuracy

- **Content-based:** 100% (exact duplicates)
- **Size-based:** Fast but may miss renamed files
- **Name-based:** Detects naming patterns only

### Memory Usage

- **Hash cache:** ~1MB per 100,000 files
- **Batch processing:** Processes 1000 files at a time
- **Peak memory:** ~100MB for 1M files

## Safety Features

### Size Thresholding

Won't remove files larger than configurable threshold (default: 10MB). Prevents accidental deletion of important large files.

### Archive Mode

Move files to archive directory instead of deleting. No data loss, full recoverability.

### Action Logging

All deletions/moves are logged to file for recovery and audit.

## Tips

### Best Results

- Use content-based detection for documents (100% accurate)
- Use size-based for media files (faster)
- Run dry-run first to preview changes
- Archive instead of delete for important files

### Performance Optimization

- Process frequently used directories first
- Use size threshold to skip large media files
- Exclude hidden directories from scan
- Process directories in parallel when possible

## Troubleshooting

### Not Finding Expected Duplicates

- Check detection method (content vs size vs name)
- Verify exclude patterns aren't too broad
- Check if files are in whitelisted directories

### Removal Not Working

- Check write permissions on directories
- Verify action isn't 'delete' with autoConfirm: true
- Check size threshold isn't blocking all deletions
- Check file locks (is another program using files?)

### Slow Scanning

- Reduce includeSubdirs scope
- Use size-based detection (faster)
- Exclude large directories (node_modules, .git)
- Process directories individually instead of batch

## License

MIT

---

**Find duplicates. Save space. Keep your system clean.** 🔮
