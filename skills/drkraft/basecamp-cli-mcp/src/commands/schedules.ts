import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import {
  createScheduleEntry,
  deleteScheduleEntry,
  getSchedule,
  getScheduleEntry,
  listScheduleEntries,
  updateScheduleEntry,
} from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createSchedulesCommands(): Command {
  const schedules = new Command('schedules').description('Manage schedules and schedule entries')

  schedules
    .command('get')
    .description('Get schedule info for a project')
    .requiredOption('-p, --project <id>', 'Project ID')
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

        const schedule = await getSchedule(projectId)

        if (options.format === 'json') {
          console.log(JSON.stringify(schedule, null, 2))
          return
        }

        console.log(chalk.bold(schedule.title))
        console.log(chalk.dim(`ID: ${schedule.id}`))
        console.log(chalk.dim(`Status: ${schedule.status}`))
        console.log(chalk.dim(`Entries: ${schedule.entries_count}`))
        console.log(chalk.dim(`Include due assignments: ${schedule.include_due_assignments}`))
        console.log(chalk.dim(`Created: ${new Date(schedule.created_at).toLocaleDateString()}`))
        console.log(chalk.dim(`URL: ${schedule.app_url}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to get schedule:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  schedules
    .command('entries')
    .description('List schedule entries in a project')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('--status <status>', 'Filter by status (upcoming|past)')
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

        const entries = await listScheduleEntries(projectId, options.status)

        if (options.format === 'json') {
          console.log(JSON.stringify(entries, null, 2))
          return
        }

        if (entries.length === 0) {
          console.log(chalk.yellow('No schedule entries found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Summary', 'Start', 'End', 'All Day', 'Participants'],
          wordWrap: true,
        })

        entries.forEach((entry) => {
          const startDate = new Date(entry.starts_at).toLocaleDateString()
          const endDate = entry.ends_at ? new Date(entry.ends_at).toLocaleDateString() : '-'
          const participants = entry.participants?.map((p) => p.name).join(', ') || '-'

          table.push([
            entry.id,
            entry.summary,
            startDate,
            endDate,
            entry.all_day ? 'Yes' : 'No',
            participants,
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${entries.length} entries`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list schedule entries:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  schedules
    .command('create-entry')
    .description('Create a schedule entry')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-s, --summary <summary>', 'Event summary')
    .requiredOption('--starts-at <datetime>', 'Start date/time (ISO 8601)')
    .option('--ends-at <datetime>', 'End date/time (ISO 8601)')
    .option('-d, --description <description>', 'Event description')
    .option('--all-day', 'Mark as all-day event')
    .option('--participants <ids>', 'Comma-separated participant IDs')
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

        const entryOptions: {
          description?: string
          endsAt?: string
          allDay?: boolean
          participantIds?: number[]
        } = {}

        if (options.description) entryOptions.description = options.description
        if (options.endsAt) entryOptions.endsAt = options.endsAt
        if (options.allDay) entryOptions.allDay = true
        if (options.participants) {
          entryOptions.participantIds = options.participants
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
        }

        const entry = await createScheduleEntry(
          projectId,
          options.summary,
          options.startsAt,
          entryOptions,
        )

        if (options.format === 'json') {
          console.log(JSON.stringify(entry, null, 2))
          return
        }

        console.log(chalk.green('✓ Schedule entry created'))
        console.log(chalk.dim(`ID: ${entry.id}`))
        console.log(chalk.dim(`Summary: ${entry.summary}`))
        console.log(chalk.dim(`Start: ${new Date(entry.starts_at).toLocaleString()}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create schedule entry:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  schedules
    .command('update-entry <id>')
    .description('Update a schedule entry')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-s, --summary <summary>', 'New summary')
    .option('-d, --description <description>', 'New description')
    .option('--starts-at <datetime>', 'New start date/time (ISO 8601)')
    .option('--ends-at <datetime>', 'New end date/time (ISO 8601)')
    .option('--all-day', 'Mark as all-day event')
    .option('--participants <ids>', 'Comma-separated participant IDs')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .action(async (id: string, options) => {
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

        const entryId = parseInt(id, 10)
        if (isNaN(entryId)) {
          console.error(chalk.red('Invalid entry ID: must be a number'))
          process.exit(1)
        }

        const updates: {
          summary?: string
          description?: string
          starts_at?: string
          ends_at?: string
          all_day?: boolean
          participant_ids?: number[]
        } = {}

        if (options.summary) updates.summary = options.summary
        if (options.description) updates.description = options.description
        if (options.startsAt) updates.starts_at = options.startsAt
        if (options.endsAt) updates.ends_at = options.endsAt
        if (options.allDay) updates.all_day = true
        if (options.participants) {
          updates.participant_ids = options.participants
            .split(',')
            .map((pid: string) => parseInt(pid.trim(), 10))
        }

        const entry = await updateScheduleEntry(projectId, entryId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(entry, null, 2))
          return
        }

        console.log(chalk.green('✓ Schedule entry updated'))
        console.log(chalk.dim(`ID: ${entry.id}`))
        console.log(chalk.dim(`Summary: ${entry.summary}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update schedule entry:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  schedules
    .command('delete-entry <id>')
    .description('Delete a schedule entry')
    .requiredOption('-p, --project <id>', 'Project ID')
    .action(async (id: string, options) => {
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

        const entryId = parseInt(id, 10)
        if (isNaN(entryId)) {
          console.error(chalk.red('Invalid entry ID: must be a number'))
          process.exit(1)
        }

        await deleteScheduleEntry(projectId, entryId)
        console.log(chalk.green(`✓ Schedule entry ${entryId} deleted`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete schedule entry:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return schedules
}
