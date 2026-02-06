import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { archiveRecording, listRecordings, restoreRecording, trashRecording } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createRecordingsCommands(): Command {
  const recordings = new Command('recordings').description(
    'Manage recordings (cross-project content)',
  )

  recordings
    .command('list')
    .description('List recordings by type across projects')
    .requiredOption(
      '-t, --type <type>',
      'Recording type (Todo, Message, Document, Upload, Comment, etc.)',
    )
    .option('-b, --bucket <ids>', 'Comma-separated project IDs (default: all)')
    .option('-s, --status <status>', 'Status filter (active|archived|trashed)', 'active')
    .option('--sort <field>', 'Sort by (created_at|updated_at)', 'created_at')
    .option('--direction <dir>', 'Sort direction (asc|desc)', 'desc')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      if (!isAuthenticated()) {
        console.log(chalk.yellow('Not authenticated. Run "basecamp auth login" to login.'))
        return
      }

      try {
        const bucketIds = options.bucket
          ? options.bucket.split(',').map((id: string) => parseInt(id.trim(), 10))
          : undefined

        const recordings = await listRecordings(options.type, {
          bucket: bucketIds,
          status: options.status as 'active' | 'archived' | 'trashed',
          sort: options.sort as 'created_at' | 'updated_at',
          direction: options.direction as 'asc' | 'desc',
        })

        if (options.format === 'json') {
          console.log(JSON.stringify(recordings, null, 2))
          return
        }

        if (recordings.length === 0) {
          console.log(chalk.yellow(`No ${options.type} recordings found.`))
          return
        }

        const table = new Table({
          head: ['ID', 'Type', 'Title', 'Project', 'Created', 'Status'],
          wordWrap: true,
        })

        recordings.forEach((rec) => {
          table.push([
            rec.id,
            rec.type,
            rec.title || '-',
            rec.bucket?.name || '-',
            rec.created_at?.substring(0, 10) || '-',
            rec.status || '-',
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${recordings.length} recordings`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list recordings:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  recordings
    .command('archive <id>')
    .description('Archive a recording')
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
        const recordingId = parseInt(id, 10)
        if (isNaN(recordingId)) {
          console.error(chalk.red('Invalid recording ID: must be a number'))
          process.exit(1)
        }

        await archiveRecording(projectId, recordingId)
        console.log(chalk.green(`✓ Recording ${recordingId} archived`))
      } catch (error) {
        console.error(
          chalk.red('Failed to archive recording:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  recordings
    .command('restore <id>')
    .description('Restore a recording (from archive or trash)')
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
        const recordingId = parseInt(id, 10)
        if (isNaN(recordingId)) {
          console.error(chalk.red('Invalid recording ID: must be a number'))
          process.exit(1)
        }

        await restoreRecording(projectId, recordingId)
        console.log(chalk.green(`✓ Recording ${recordingId} restored`))
      } catch (error) {
        console.error(
          chalk.red('Failed to restore recording:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  recordings
    .command('trash <id>')
    .description('Move a recording to trash')
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
        const recordingId = parseInt(id, 10)
        if (isNaN(recordingId)) {
          console.error(chalk.red('Invalid recording ID: must be a number'))
          process.exit(1)
        }

        await trashRecording(projectId, recordingId)
        console.log(chalk.green(`✓ Recording ${recordingId} moved to trash`))
      } catch (error) {
        console.error(
          chalk.red('Failed to trash recording:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return recordings
}
