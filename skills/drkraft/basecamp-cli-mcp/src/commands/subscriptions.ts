import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { getSubscriptions, subscribe, unsubscribe } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createSubscriptionsCommands(): Command {
  const subscriptions = new Command('subscriptions').description(
    'Manage subscriptions to recordings',
  )

  subscriptions
    .command('list')
    .description('List subscribers for a recording')
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

        const subs = await getSubscriptions(projectId, recordingId)

        if (options.format === 'json') {
          console.log(JSON.stringify(subs, null, 2))
          return
        }

        if (subs.subscribers.length === 0) {
          console.log(chalk.yellow('No subscribers found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Name', 'Email', 'Title'],
          wordWrap: true,
        })

        subs.subscribers.forEach((subscriber) => {
          table.push([
            subscriber.id,
            subscriber.name,
            subscriber.email_address,
            subscriber.title || '-',
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${subs.subscribers.length} subscribers`))
        console.log(chalk.dim(`You are ${subs.subscribed ? 'subscribed' : 'not subscribed'}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list subscriptions:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  subscriptions
    .command('subscribe')
    .description('Subscribe to a recording')
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

        const subs = await subscribe(projectId, recordingId)

        if (options.format === 'json') {
          console.log(JSON.stringify(subs, null, 2))
          return
        }

        console.log(chalk.green('✓ Subscribed to recording'))
        console.log(chalk.dim(`Total subscribers: ${subs.count}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to subscribe:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  subscriptions
    .command('unsubscribe')
    .description('Unsubscribe from a recording')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-r, --recording <id>', 'Recording ID')
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

        await unsubscribe(projectId, recordingId)
        console.log(chalk.green('✓ Unsubscribed from recording'))
      } catch (error) {
        console.error(
          chalk.red('Failed to unsubscribe:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return subscriptions
}
