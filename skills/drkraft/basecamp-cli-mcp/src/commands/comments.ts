import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import {
  createComment,
  deleteComment,
  getComment,
  listComments,
  updateComment,
} from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createCommentsCommands(): Command {
  const comments = new Command('comments').description(
    'Manage comments on recordings (todos, messages, etc.)',
  )

  comments
    .command('list')
    .description('List comments on a recording')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-r, --recording <id>', 'Recording ID (todo, message, etc.)')
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

        const commentsList = await listComments(projectId, recordingId)

        if (options.format === 'json') {
          console.log(JSON.stringify(commentsList, null, 2))
          return
        }

        if (commentsList.length === 0) {
          console.log(chalk.yellow('No comments found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Creator', 'Content', 'Created'],
          wordWrap: true,
        })

        commentsList.forEach((comment) => {
          table.push([
            comment.id,
            comment.creator?.name || '-',
            comment.content,
            new Date(comment.created_at).toLocaleDateString(),
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${commentsList.length} comments`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list comments:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  comments
    .command('get <id>')
    .description('Get comment details')
    .requiredOption('-p, --project <id>', 'Project ID')
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
        const commentId = parseInt(id, 10)
        if (isNaN(commentId)) {
          console.error(chalk.red('Invalid comment ID: must be a number'))
          process.exit(1)
        }

        const comment = await getComment(projectId, commentId)

        if (options.format === 'json') {
          console.log(JSON.stringify(comment, null, 2))
          return
        }

        console.log(chalk.bold('Comment'))
        console.log(chalk.dim(`ID: ${comment.id}`))
        console.log(chalk.dim(`Creator: ${comment.creator?.name || '-'}`))
        console.log(chalk.dim(`Created: ${new Date(comment.created_at).toLocaleString()}`))
        console.log(chalk.dim(`Updated: ${new Date(comment.updated_at).toLocaleString()}`))
        console.log(chalk.dim(`Content:\n${comment.content}`))
        console.log(chalk.dim(`URL: ${comment.app_url}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to get comment:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  comments
    .command('create')
    .description('Create a comment on a recording')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-r, --recording <id>', 'Recording ID (todo, message, etc.)')
    .requiredOption('-c, --content <content>', 'Comment content')
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

        const comment = await createComment(projectId, recordingId, options.content)

        if (options.format === 'json') {
          console.log(JSON.stringify(comment, null, 2))
          return
        }

        console.log(chalk.green('✓ Comment created'))
        console.log(chalk.dim(`ID: ${comment.id}`))
        console.log(
          chalk.dim(
            `Content: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`,
          ),
        )
      } catch (error) {
        console.error(
          chalk.red('Failed to create comment:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  comments
    .command('update <id>')
    .description('Update a comment')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-c, --content <content>', 'New comment content')
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
        const commentId = parseInt(id, 10)
        if (isNaN(commentId)) {
          console.error(chalk.red('Invalid comment ID: must be a number'))
          process.exit(1)
        }

        const comment = await updateComment(projectId, commentId, options.content)

        if (options.format === 'json') {
          console.log(JSON.stringify(comment, null, 2))
          return
        }

        console.log(chalk.green('✓ Comment updated'))
        console.log(chalk.dim(`ID: ${comment.id}`))
        console.log(
          chalk.dim(
            `Content: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`,
          ),
        )
      } catch (error) {
        console.error(
          chalk.red('Failed to update comment:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  comments
    .command('delete <id>')
    .description('Delete a comment')
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
        const commentId = parseInt(id, 10)
        if (isNaN(commentId)) {
          console.error(chalk.red('Invalid comment ID: must be a number'))
          process.exit(1)
        }

        await deleteComment(projectId, commentId)
        console.log(chalk.green(`✓ Comment ${commentId} deleted`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete comment:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return comments
}
