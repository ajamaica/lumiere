import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { search } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createSearchCommand(): Command {
  const searchCmd = new Command('search')
    .description('Search across all Basecamp content')
    .argument('<query>', 'Search query')
    .option('-t, --type <type>', 'Filter by content type (Todo, Message, Document, etc.)')
    .option('-p, --project <id>', 'Filter by project ID')
    .option('-c, --creator <id>', 'Filter by creator ID')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .action(async (query: string, options) => {
      if (!isAuthenticated()) {
        console.log(chalk.yellow('Not authenticated. Run "basecamp auth login" to login.'))
        return
      }

      try {
        const searchOptions: {
          type?: string
          bucket_id?: number
          creator_id?: number
        } = {}

        if (options.type) searchOptions.type = options.type
        if (options.project) {
          const projectId = parseInt(options.project, 10)
          if (isNaN(projectId)) {
            console.error(chalk.red('Invalid project ID: must be a number'))
            process.exit(1)
          }
          searchOptions.bucket_id = projectId
        }
        if (options.creator) {
          const creatorId = parseInt(options.creator, 10)
          if (isNaN(creatorId)) {
            console.error(chalk.red('Invalid creator ID: must be a number'))
            process.exit(1)
          }
          searchOptions.creator_id = creatorId
        }

        const results = await search(query, searchOptions)

        if (options.format === 'json') {
          console.log(JSON.stringify(results, null, 2))
          return
        }

        if (results.length === 0) {
          console.log(chalk.yellow('No results found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Type', 'Title', 'Project', 'Creator'],
          wordWrap: true,
        })

        results.forEach((result) => {
          table.push([
            result.id,
            result.type,
            result.title,
            result.bucket.name,
            result.creator.name,
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${results.length} results`))
      } catch (error) {
        console.error(chalk.red('Search failed:'), error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  return searchCmd
}
