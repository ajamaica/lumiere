const fs = require('fs')
const path = require('path')
const { program } = require('commander')

// Configuration
const MEMORY_FILE = path.resolve(process.env.OPENCLAW_WORKSPACE || '.', 'MEMORY.md')
const MEMORY_DIR = path.resolve(process.env.OPENCLAW_WORKSPACE || '.', 'memory')

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
}

program.version('1.0.0').description('Progressive Memory Manager')

program
  .command('memorize <topic> <content>')
  .description('Save detailed content to a sub-file and index it in MEMORY.md')
  .option('--overwrite', 'Overwrite existing topic file instead of appending', false)
  .action((topic, content, options) => {
    const filename = `${topic.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.md`
    const filePath = path.join(MEMORY_DIR, filename)
    const indexLine = `- **${topic}**: See \`memory/${filename}\` (Progressive Memory)`

    // 1. Write the content file
    try {
      if (options.overwrite) {
        fs.writeFileSync(filePath, `# ${topic}\n\n${content}\n`)
        console.log(`[Success] Overwrote ${filePath}`)
      } else {
        // Check if file exists to add header if new
        const exists = fs.existsSync(filePath)
        if (!exists) {
          fs.writeFileSync(filePath, `# ${topic}\n\n${content}\n`)
        } else {
          fs.appendFileSync(filePath, `\n\n${content}\n`)
        }
        console.log(`[Success] Updated ${filePath}`)
      }
    } catch (err) {
      console.error(`[Error] Failed to write to ${filePath}: ${err.message}`)
      process.exit(1)
    }

    // 2. Update MEMORY.md Index
    try {
      let memoryContent = ''
      if (fs.existsSync(MEMORY_FILE)) {
        memoryContent = fs.readFileSync(MEMORY_FILE, 'utf8')
      }

      // Check if already indexed
      if (!memoryContent.includes(`memory/${filename}`)) {
        // Find a good place to insert. Look for "## Progressive Memory Index" or similar.
        // If not found, append to end or create section.
        const sectionHeader = '## 📚 Progressive Memory Index'

        if (memoryContent.includes(sectionHeader)) {
          // Insert after header
          memoryContent = memoryContent.replace(sectionHeader, `${sectionHeader}\n${indexLine}`)
        } else {
          // Append section to end
          memoryContent += `\n\n${sectionHeader}\n${indexLine}\n`
        }

        fs.writeFileSync(MEMORY_FILE, memoryContent)
        console.log(`[Success] Indexed in MEMORY.md`)
      } else {
        console.log(`[Info] Already indexed in MEMORY.md`)
      }
    } catch (err) {
      console.error(`[Error] Failed to update MEMORY.md: ${err.message}`)
      // Don't exit, as the subfile write was successful
    }
  })

program
  .command('recall <topic>')
  .description('Find and read a progressive memory file')
  .action((topic) => {
    // Naive search: filename match first
    const filename = `${topic.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.md`
    const filePath = path.join(MEMORY_DIR, filename)

    if (fs.existsSync(filePath)) {
      console.log(fs.readFileSync(filePath, 'utf8'))
      return
    }

    // Secondary search: grep in MEMORY.md for the topic to find the file
    // (Not implemented in v1, relies on naming convention)
    console.error(`[Error] No progressive memory found for topic '${topic}' (checked ${filename})`)
    process.exit(1)
  })

program.parse(process.argv)
