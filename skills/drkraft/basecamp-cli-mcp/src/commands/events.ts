import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { listEvents } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createEventsCommands(): Command {
  const events = new Command('events').description('View activity feed and events')

  events
    .command('list')
    .description('List events for a recording')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-r, --recording <id>', 'Recording ID')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      if (!isAuthenticated()) {
        console.log(chalk.yellow('Not authenticated. Run "basecamp auth login" to login.'))
        return
      }

      try {
        const projectId = parseInt(options.project, 10)
        if (isNaN(projectId)) {
          console.error(chalk.red('Invalid project ID: must be a number'))
          process.exit(1)
        }
        const recordingId = parseInt(options.recording, 10)
        if (isNaN(recordingId)) {
          console.error(chalk.red('Invalid recording ID: must be a number'))
          process.exit(1)
        }

        const eventList = await listEvents(projectId, recordingId)

        if (options.format === 'json') {
          console.log(JSON.stringify(eventList, null, 2))
          return
        }

        if (eventList.length === 0) {
          console.log(chalk.yellow('No events found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Action', 'Creator', 'Created At'],
          wordWrap: true,
        })

        eventList.forEach((event) => {
          table.push([
            event.id,
            event.action,
            event.creator?.name || '-',
            event.created_at?.substring(0, 19) || '-',
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${eventList.length} events`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list events:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return events
}
