#!/usr/bin/env node

import { Command } from 'commander'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

import { NotionSkill } from './index'

// Load env from common locations
dotenv.config({ path: path.join(process.env.HOME || '', '.openclaw', '.env') })
dotenv.config({ path: path.join(process.env.HOME || '', '.env') })
dotenv.config()

const program = new Command()

program.name('notion-skill').description('Notion integration for OpenClaw').version('1.0.0')

const getToken = () => {
  const token = process.env.NOTION_TOKEN
  if (!token) {
    console.error('Error: NOTION_TOKEN environment variable required')
    console.error('Add to ~/.openclaw/.env: NOTION_TOKEN=secret_xxxxxxxxxx')
    process.exit(1)
  }
  return token
}

const formatOutput = (data: any) => JSON.stringify(data, null, 2)

// Query database
program
  .command('query-database <database-id>')
  .description('Query entries from a Notion database')
  .option(
    '-f, --filter <json>',
    'Filter JSON (e.g., \'{"property":"Status","select":{"equals":"Done"}}\')',
  )
  .option('-l, --limit <number>', 'Limit results', '100')
  .action(async (databaseId, options) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const filter = options.filter ? JSON.parse(options.filter) : undefined
      const results = await skill.queryDatabase(databaseId, filter)

      // Simplified output
      const simplified = results.map((page: any) => ({
        id: page.id,
        url: page.url,
        created: page.created_time,
        properties: page.properties,
      }))

      console.log(formatOutput(simplified))
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Add database entry
program
  .command('add-entry <database-id>')
  .description('Add a new entry to a database')
  .option('-t, --title <text>', 'Title of the entry')
  .option('-p, --properties <json>', 'Properties JSON object')
  .action(async (databaseId, options) => {
    try {
      const skill = new NotionSkill({ token: getToken() })

      let properties: any = {}

      if (options.title) {
        properties['Name'] = { title: [{ text: { content: options.title } }] }
      }

      if (options.properties) {
        const extraProps = JSON.parse(options.properties)
        properties = { ...properties, ...extraProps }
      }

      const result = await skill.addEntry(databaseId, properties)
      console.log(
        formatOutput({
          id: result.id,
          url: result.url,
          created: result.created_time,
        }),
      )
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Get page
program
  .command('get-page <page-id>')
  .description('Get page content and properties')
  .action(async (pageId) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const result = await skill.getPage(pageId)
      console.log(formatOutput(result))
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Update page
program
  .command('update-page <page-id>')
  .description('Update page properties')
  .option('-p, --properties <json>', 'Properties JSON to update', '{}')
  .action(async (pageId, options) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const properties = JSON.parse(options.properties)
      const result = await skill.updatePage(pageId, properties)
      console.log(
        formatOutput({
          id: result.id,
          url: result.url,
          last_edited: result.last_edited_time,
        }),
      )
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Append blocks
program
  .command('append-blocks <page-id>')
  .description('Append content blocks to a page')
  .option('-b, --blocks <json>', 'Blocks JSON array', '[]')
  .action(async (pageId, options) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const blocks = JSON.parse(options.blocks)
      const result = await skill.appendBlocks(pageId, blocks)
      console.log(formatOutput({ success: true, appended: blocks.length }))
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Search
program
  .command('search <query>')
  .description('Search across your Notion workspace')
  .action(async (query) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const results = await skill.search(query)

      const simplified = results.results.map((item: any) => ({
        id: item.id,
        title: item.title?.[0]?.text?.content || 'Untitled',
        url: item.url,
        type: item.object,
      }))

      console.log(formatOutput(simplified))
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Get database schema
program
  .command('get-database <database-id>')
  .description('Get database schema/properties')
  .action(async (databaseId) => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const result = await skill.getDatabase(databaseId)
      console.log(
        formatOutput({
          id: result.id,
          title: result.title?.[0]?.text?.content || 'Untitled',
          url: result.url,
          properties: result.properties,
        }),
      )
    } catch (err: any) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })

// Quick test connection
program
  .command('test')
  .description('Test Notion connection and list accessible pages')
  .action(async () => {
    try {
      const skill = new NotionSkill({ token: getToken() })
      const results = await skill.search('')

      console.log('✅ Connected to Notion!')
      console.log(`Found ${results.results.length} accessible pages/databases:\n`)

      results.results.slice(0, 10).forEach((item: any, i: number) => {
        const title = item.title?.[0]?.text?.content || 'Untitled'
        const type = item.object === 'database' ? '📊 Database' : '📄 Page'
        const id = item.id.replace(/-/g, '')
        console.log(`${i + 1}. ${type}: ${title}`)
        console.log(`   ID: ${id}`)
        console.log(`   URL: ${item.url}\n`)
      })

      if (results.results.length > 10) {
        console.log(`... and ${results.results.length - 10} more`)
      }
    } catch (err: any) {
      console.error('❌ Connection failed:', err.message)
      process.exit(1)
    }
  })

program.parse()
