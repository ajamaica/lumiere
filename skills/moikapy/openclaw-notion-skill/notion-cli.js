#!/usr/bin/env node

/**
 * Notion CLI for OpenClaw
 * Standalone script - no build needed
 * Usage: node notion-cli.js <command> [args]
 */

const { Client } = require('@notionhq/client')

// Get token from environment
const getToken = () => {
  const token = process.env.NOTION_TOKEN
  if (!token) {
    console.error('❌ Error: NOTION_TOKEN not set')
    console.error('Add to ~/.openclaw/.env: NOTION_TOKEN=secret_xxxxxxxxxx')
    process.exit(1)
  }
  return token
}

// Clean ID (remove hyphens)
const cleanId = (id) => id.replace(/-/g, '')

// Smart ID resolution - handles both Notion ID (#3) and direct UUID
const resolvePageId = async (notion, dbId, idOrRef) => {
  // If it starts with #, it's a Notion ID reference
  if (idOrRef.startsWith('#')) {
    const targetId = parseInt(idOrRef.replace(/^#/, ''), 10)
    if (isNaN(targetId)) {
      throw new Error(`Invalid Notion ID: ${idOrRef}`)
    }

    const response = await notion.databases.query({
      database_id: cleanId(dbId),
      page_size: 100,
    })

    const entry = response.results.find((page) => {
      const idProp = page.properties.ID
      return idProp?.unique_id?.number === targetId
    })

    if (!entry) {
      throw new Error(`No entry with Notion ID ${idOrRef} found`)
    }

    return entry.id
  }

  // Otherwise, treat as direct UUID
  return cleanId(idOrRef)
}

// Initialize client
const getClient = () => new Client({ auth: getToken() })

// Format output
const out = (data) => console.log(JSON.stringify(data, null, 2))

// Commands
const commands = {
  async test() {
    const notion = getClient()
    const results = await notion.search({ page_size: 20 })

    console.log('✅ Connected to Notion!')
    console.log(`Found ${results.results.length} accessible pages/databases:\n`)

    results.results.forEach((item, i) => {
      const title = item.title?.[0]?.text?.content || 'Untitled'
      const type = item.object === 'database' ? '📊' : '📄'
      const id = item.id.replace(/-/g, '').slice(0, 8) + '...'
      console.log(`${i + 1}. ${type} ${title} (${id})`)
    })
  },

  async 'query-database'(dbId, ...args) {
    const notion = getClient()
    const cleanDbId = cleanId(dbId)

    // Parse args
    let filter = undefined
    const filterIdx = args.indexOf('--filter')
    if (filterIdx !== -1 && args[filterIdx + 1]) {
      filter = JSON.parse(args[filterIdx + 1])
    }

    // Numbered output option
    const numberedIdx = args.indexOf('--numbered')
    const showNumbers = numberedIdx !== -1

    const response = await notion.databases.query({
      database_id: cleanDbId,
      filter,
      page_size: 100,
    })

    const simplified = response.results.map((page, index) => {
      const entry = {
        id: page.id,
        url: page.url,
        created: page.created_time,
        properties: Object.fromEntries(
          Object.entries(page.properties).map(([k, v]) => {
            // Simplify property values
            let val = v
            if (v.title) val = v.title.map((t) => t.text.content).join('')
            else if (v.rich_text) val = v.rich_text.map((t) => t.text.content).join('')
            else if (v.select) val = v.select.name
            else if (v.multi_select) val = v.multi_select.map((s) => s.name)
            else if (v.status) val = v.status.name
            else if (v.date) val = v.date
            else if (v.number !== undefined) val = v.number
            else if (v.checkbox !== undefined) val = v.checkbox
            else if (v.email) val = v.email
            else if (v.url) val = v.url
            return [k, val]
          }),
        ),
      }

      if (showNumbers) {
        entry.entry_number = index + 1
      }

      return entry
    })

    // If numbered, also save mapping for reference
    if (showNumbers && simplified.length > 0) {
      const mapping = {}
      simplified.forEach((entry) => {
        mapping[`#${entry.entry_number}`] = entry.id
      })

      // Save to temp file for potential ID lookup
      const fs = require('fs')
      const os = require('os')
      const path = require('path')
      const mappingPath = path.join(os.tmpdir(), 'notion-entry-mapping.json')
      fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2))
    }

    out(simplified)
  },

  async 'add-entry'(dbId, ...args) {
    const notion = getClient()
    const cleanDbId = cleanId(dbId)

    let properties = {}

    const titleIdx = args.indexOf('--title')
    if (titleIdx !== -1 && args[titleIdx + 1]) {
      const titleKey = 'Name' // Default, could be Title
      properties[titleKey] = { title: [{ text: { content: args[titleIdx + 1] } }] }
    }

    const propsIdx = args.indexOf('--properties')
    if (propsIdx !== -1 && args[propsIdx + 1]) {
      const extraProps = JSON.parse(args[propsIdx + 1])
      properties = { ...properties, ...extraProps }
    }

    const result = await notion.pages.create({
      parent: { database_id: cleanDbId },
      properties,
    })

    out({ id: result.id, url: result.url, created: result.created_time })
  },

  async 'get-page'(pageId, dbId) {
    const notion = getClient()

    // Smart ID resolution - supports #3 (Notion ID) or direct UUID
    let cleanPageId
    if (pageId.startsWith('#')) {
      if (!dbId) {
        console.error('❌ Database ID required when using Notion ID reference (#3)')
        console.error("Usage: get-page '#3' DATABASE_ID")
        process.exit(1)
      }
      cleanPageId = await resolvePageId(notion, dbId, pageId)
    } else {
      cleanPageId = cleanId(pageId)
    }

    const [page, blocks] = await Promise.all([
      notion.pages.retrieve({ page_id: cleanPageId }),
      notion.blocks.children.list({ block_id: cleanPageId, page_size: 100 }),
    ])

    // Format blocks for readability
    const formattedBlocks = blocks.results.map((block) => {
      const type = block.type
      let content = ''

      switch (type) {
        case 'paragraph':
          content = block.paragraph.rich_text.map((t) => t.text.content).join('')
          break
        case 'heading_1':
          content = '# ' + block.heading_1.rich_text.map((t) => t.text.content).join('')
          break
        case 'heading_2':
          content = '## ' + block.heading_2.rich_text.map((t) => t.text.content).join('')
          break
        case 'heading_3':
          content = '### ' + block.heading_3.rich_text.map((t) => t.text.content).join('')
          break
        case 'bulleted_list_item':
          content = '• ' + block.bulleted_list_item.rich_text.map((t) => t.text.content).join('')
          break
        case 'numbered_list_item':
          content = '1. ' + block.numbered_list_item.rich_text.map((t) => t.text.content).join('')
          break
        case 'code':
          content =
            '```' +
            block.code.language +
            '\n' +
            block.code.rich_text.map((t) => t.text.content).join('') +
            '\n```'
          break
        case 'quote':
          content = '> ' + block.quote.rich_text.map((t) => t.text.content).join('')
          break
        case 'to_do':
          const checked = block.to_do.checked ? '[x]' : '[ ]'
          content = checked + ' ' + block.to_do.rich_text.map((t) => t.text.content).join('')
          break
        default:
          content = `[${type}]`
      }

      return { type, content }
    })

    out({
      page: {
        id: page.id,
        url: page.url,
        created: page.created_time,
        last_edited: page.last_edited_time,
        properties: page.properties,
      },
      body: formattedBlocks,
      block_count: blocks.results.length,
    })
  },

  async 'update-page'(pageId, ...args) {
    const notion = getClient()
    const cleanPageId = cleanId(pageId)

    const propsIdx = args.indexOf('--properties')
    if (propsIdx === -1 || !args[propsIdx + 1]) {
      console.error('❌ Error: --properties required')
      process.exit(1)
    }

    const properties = JSON.parse(args[propsIdx + 1])
    const result = await notion.pages.update({ page_id: cleanPageId, properties })

    out({ id: result.id, url: result.url, last_edited: result.last_edited_time })
  },

  async 'append-body'(pageId, ...args) {
    const notion = getClient()

    // Check if database ID is provided (for Notion ID lookup)
    const dbIdx = args.indexOf('--database')
    const dbId = dbIdx !== -1 ? args[dbIdx + 1] : null

    // Smart ID resolution - supports #3 (Notion ID) or direct UUID
    let cleanPageId
    if (pageId.startsWith('#')) {
      if (!dbId) {
        console.error('❌ Database ID required when using Notion ID reference (#3)')
        console.error("Usage: append-body '#3' --database DB_ID --text 'content'")
        process.exit(1)
      }
      cleanPageId = await resolvePageId(notion, dbId, pageId)
    } else {
      cleanPageId = cleanId(pageId)
    }

    // Parse arguments
    const typeIdx = args.indexOf('--type')
    const textIdx = args.indexOf('--text')
    const blocksIdx = args.indexOf('--blocks')

    let blocks = []

    if (blocksIdx !== -1 && args[blocksIdx + 1]) {
      // Full JSON blocks mode (advanced)
      blocks = JSON.parse(args[blocksIdx + 1])
    } else if (textIdx !== -1 && args[textIdx + 1]) {
      // Simple text mode with optional type
      const text = args[textIdx + 1]
      const type = typeIdx !== -1 && args[typeIdx + 1] ? args[typeIdx + 1] : 'paragraph'

      const richText = [{ type: 'text', text: { content: text } }]

      switch (type) {
        case 'h1':
        case 'heading_1':
          blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: richText } })
          break
        case 'h2':
        case 'heading_2':
          blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: richText } })
          break
        case 'h3':
        case 'heading_3':
          blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText } })
          break
        case 'bullet':
        case 'bulleted_list_item':
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: richText },
          })
          break
        case 'numbered':
        case 'numbered_list_item':
          blocks.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: { rich_text: richText },
          })
          break
        case 'todo':
        case 'to_do':
          blocks.push({
            object: 'block',
            type: 'to_do',
            to_do: { rich_text: richText, checked: false },
          })
          break
        case 'quote':
          blocks.push({ object: 'block', type: 'quote', quote: { rich_text: richText } })
          break
        case 'code':
          const langIdx = args.indexOf('--lang')
          const language = langIdx !== -1 && args[langIdx + 1] ? args[langIdx + 1] : 'plain text'
          blocks.push({ object: 'block', type: 'code', code: { rich_text: richText, language } })
          break
        case 'divider':
          blocks.push({ object: 'block', type: 'divider', divider: {} })
          break
        default:
          blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText } })
      }
    } else {
      console.error('❌ Error: --text or --blocks required')
      console.error('Examples:')
      console.error('  node notion-cli.js append-body PAGE_ID --text "Hello world"')
      console.error('  node notion-cli.js append-body PAGE_ID --text "My Heading" --type h2')
      console.error('  node notion-cli.js append-body PAGE_ID --text "TODO item" --type todo')
      console.error(
        '  node notion-cli.js append-body PAGE_ID --text "console.log(1)" --type code --lang javascript',
      )
      process.exit(1)
    }

    const result = await notion.blocks.children.append({
      block_id: cleanPageId,
      children: blocks,
    })

    out({
      success: true,
      reference: pageId,
      resolved_id: cleanPageId,
      appended_blocks: blocks.length,
      types: blocks.map((b) => b.type),
    })
  },

  async search(query) {
    const notion = getClient()
    const results = await notion.search({ query, page_size: 20 })

    const simplified = results.results.map((item) => ({
      id: item.id,
      title: item.title?.[0]?.text?.content || 'Untitled',
      url: item.url,
      type: item.object,
    }))

    out(simplified)
  },

  async 'get-database'(dbId) {
    const notion = getClient()
    const cleanDbId = cleanId(dbId)

    const result = await notion.databases.retrieve({ database_id: cleanDbId })

    out({
      id: result.id,
      title: result.title?.[0]?.text?.content || 'Untitled',
      url: result.url,
      properties: result.properties,
    })
  },

  async 'entry-by-number'(dbId, numberStr) {
    const notion = getClient()
    const cleanDbId = cleanId(dbId)
    const targetNumber = parseInt(numberStr.replace(/^#/, ''), 10)

    if (isNaN(targetNumber) || targetNumber < 1) {
      console.error('❌ Invalid entry number. Use: entry-by-number DB_ID #3')
      process.exit(1)
    }

    const response = await notion.databases.query({
      database_id: cleanDbId,
      page_size: 100,
    })

    if (targetNumber > response.results.length) {
      console.error(
        `❌ Only ${response.results.length} entries found. #${targetNumber} doesn't exist.`,
      )
      process.exit(1)
    }

    const entry = response.results[targetNumber - 1]
    out({
      entry_number: targetNumber,
      id: entry.id,
      url: entry.url,
      name: entry.properties.Name?.title?.[0]?.text?.content || 'Untitled',
      created: entry.created_time,
    })
  },

  async 'find-by-notion-id'(dbId, notionId) {
    const notion = getClient()
    const cleanDbId = cleanId(dbId)
    const targetId = parseInt(notionId.replace(/^#/, ''), 10)

    if (isNaN(targetId)) {
      console.error('❌ Invalid ID. Use: find-by-notion-id DB_ID #3')
      process.exit(1)
    }

    // Query all entries and find by Notion auto-ID
    const response = await notion.databases.query({
      database_id: cleanDbId,
      page_size: 100,
    })

    const entry = response.results.find((page) => {
      const idProp = page.properties.ID
      return idProp?.unique_id?.number === targetId
    })

    if (!entry) {
      console.error(`❌ No entry with Notion ID #${targetId} found`)
      console.log('\nAvailable entries:')
      response.results.forEach((p) => {
        const idNum = p.properties.ID?.unique_id?.number
        const name = p.properties.Name?.title?.[0]?.text?.content
        console.log(`  Notion #${idNum}: ${name}`)
      })
      process.exit(1)
    }

    out({
      notion_id: targetId,
      page_id: entry.id,
      url: entry.url,
      name: entry.properties.Name?.title?.[0]?.text?.content || 'Untitled',
      created: entry.created_time,
    })
  },
}

// Help
const showHelp = () => {
  console.log(`
Notion CLI for OpenClaw

Usage: node notion-cli.js <command> [args]

Commands:
  test                      Test connection and list accessible pages

  query-database <id>       Query database entries
    [--filter '<json>']     Filter results
    [--numbered]            Show entry numbers (ID#1, ID#2...)

  add-entry <id>            Add entry to database
    --title "Name"
    [--properties '<json>'] Additional properties

  get-page <id> [db-id]     Get page content (supports #3 or UUID)

  update-page <id>          Update page properties
    --properties '<json>'   Properties to update

  append-body <id>          Add content to page body
    --database <id>         Required when using #3 notation
    --text "content"        Text content to add
    --type <type>           Block type: paragraph, h1, h2, h3, bullet, numbered, 
                            todo, quote, code, divider (default: paragraph)
    --lang <language>       Code language (for --type code)
    --blocks '<json>'       Raw JSON blocks array (advanced)

  entry-by-number <db> <#>  Get entry by list position number

  find-by-notion-id <db> <#>  Get entry by Notion auto-ID field

  get-database <id>         Get database schema

  search <query>            Search workspace

Environment:
  NOTION_TOKEN    Required. Set in ~/.openclaw/.env

Examples:
  # List entries with ID numbers
  node notion-cli.js query-database abc123... --numbered

  # Reference entry by number
  node notion-cli.js entry-by-number abc123... #3

  # Add content to a specific entry
  node notion-cli.js append-body page123... --text "Research notes" --type h2

  # Filter and find
  node notion-cli.js query-database abc123... --filter '{"property":"Status","select":{"equals":"Idea"}}'

Quick Reference - Two Ways to Reference Entries:

  # METHOD 1: Notion ID (what you see in the ID column)
  node notion-cli.js get-page '#3' DB_ID
  node notion-cli.js append-body '#3' --database DB_ID --text "content"

  # METHOD 2: Direct UUID (for power users, scripts, external tools)
  node notion-cli.js get-page 2fb3e4ac...
  node notion-cli.js append-body 2fb3e4ac... --text "content"

Database/Page ID Format:
  From URL: https://www.notion.so/workspace/ABC123...
  Use: ABC123... (32 characters, no hyphens)
`)
}

// Main
const main = async () => {
  const [cmd, ...args] = process.argv.slice(2)

  if (!cmd || cmd === '--help' || cmd === '-h') {
    showHelp()
    return
  }

  const handler = commands[cmd]
  if (!handler) {
    console.error(`❌ Unknown command: ${cmd}`)
    showHelp()
    process.exit(1)
  }

  try {
    await handler(...args)
  } catch (err) {
    console.error('❌ Error:', err.message)
    if (err.code === 'object_not_found') {
      console.error(
        '💡 Make sure the page/database is shared with your integration (Share → Add connections)',
      )
    }
    process.exit(1)
  }
}

main()
