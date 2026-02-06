import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  testWebhook,
  updateWebhook,
} from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createWebhooksCommands(): Command {
  const webhooks = new Command('webhooks').description('Manage webhooks for project notifications')

  webhooks
    .command('list')
    .description('List webhooks in a project')
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
        const webhookList = await listWebhooks(projectId)

        if (options.format === 'json') {
          console.log(JSON.stringify(webhookList, null, 2))
          return
        }

        if (webhookList.length === 0) {
          console.log(chalk.yellow('No webhooks found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Status', 'Payload URL', 'Types'],
          wordWrap: true,
        })

        webhookList.forEach((webhook) => {
          table.push([
            webhook.id,
            webhook.active ? chalk.green('✓ Active') : chalk.dim('○ Inactive'),
            webhook.payload_url,
            webhook.types.join(', '),
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${webhookList.length} webhooks`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list webhooks:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  webhooks
    .command('get <id>')
    .description('Get webhook details')
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
        const webhookId = parseInt(id, 10)
        if (isNaN(webhookId)) {
          console.error(chalk.red('Invalid webhook ID: must be a number'))
          process.exit(1)
        }
        const webhook = await getWebhook(projectId, webhookId)

        if (options.format === 'json') {
          console.log(JSON.stringify(webhook, null, 2))
          return
        }

        console.log(chalk.bold(`Webhook ${webhook.id}`))
        console.log(chalk.dim(`Status: ${webhook.active ? 'Active' : 'Inactive'}`))
        console.log(chalk.dim(`Payload URL: ${webhook.payload_url}`))
        console.log(chalk.dim(`Types: ${webhook.types.join(', ')}`))
        console.log(chalk.dim(`Created: ${webhook.created_at}`))
        console.log(chalk.dim(`Updated: ${webhook.updated_at}`))
        console.log(chalk.dim(`URL: ${webhook.url}`))
        console.log(chalk.dim(`App URL: ${webhook.app_url}`))

        if (webhook.recent_deliveries && webhook.recent_deliveries.length > 0) {
          console.log(chalk.bold('\nRecent Deliveries:'))
          webhook.recent_deliveries
            .slice(0, 5)
            .forEach(
              (
                delivery: { created_at: string; response: { code: number; message: string } },
                index: number,
              ) => {
                console.log(
                  chalk.dim(
                    `  ${index + 1}. ${delivery.created_at} - Response: ${delivery.response.code} ${delivery.response.message}`,
                  ),
                )
              },
            )
        }
      } catch (error) {
        console.error(
          chalk.red('Failed to get webhook:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  webhooks
    .command('create')
    .description('Create a webhook')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('--payload-url <url>', 'Webhook payload URL (must be HTTPS)')
    .option('--types <types>', 'Comma-separated event types (default: all)')
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

        if (!options.payloadUrl.startsWith('https://')) {
          console.error(chalk.red('Payload URL must be HTTPS'))
          process.exit(1)
        }

        const types = options.types
          ? options.types.split(',').map((t: string) => t.trim())
          : undefined
        const webhook = await createWebhook(projectId, options.payloadUrl, { types })

        if (options.format === 'json') {
          console.log(JSON.stringify(webhook, null, 2))
          return
        }

        console.log(chalk.green('✓ Webhook created'))
        console.log(chalk.dim(`ID: ${webhook.id}`))
        console.log(chalk.dim(`Payload URL: ${webhook.payload_url}`))
        console.log(chalk.dim(`Types: ${webhook.types.join(', ')}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create webhook:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  webhooks
    .command('update <id>')
    .description('Update a webhook')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('--payload-url <url>', 'New webhook payload URL (must be HTTPS)')
    .option('--types <types>', 'Comma-separated event types')
    .option('--active <active>', 'Activate/deactivate webhook (true|false)')
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
        const webhookId = parseInt(id, 10)
        if (isNaN(webhookId)) {
          console.error(chalk.red('Invalid webhook ID: must be a number'))
          process.exit(1)
        }

        const updates: {
          payloadUrl?: string
          types?: string[]
          active?: boolean
        } = {}

        if (options.payloadUrl) {
          if (!options.payloadUrl.startsWith('https://')) {
            console.error(chalk.red('Payload URL must be HTTPS'))
            process.exit(1)
          }
          updates.payloadUrl = options.payloadUrl
        }
        if (options.types) {
          updates.types = options.types.split(',').map((t: string) => t.trim())
        }
        if (options.active !== undefined) {
          updates.active = options.active === 'true'
        }

        const webhook = await updateWebhook(projectId, webhookId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(webhook, null, 2))
          return
        }

        console.log(chalk.green('✓ Webhook updated'))
        console.log(chalk.dim(`ID: ${webhook.id}`))
        console.log(chalk.dim(`Status: ${webhook.active ? 'Active' : 'Inactive'}`))
        console.log(chalk.dim(`Payload URL: ${webhook.payload_url}`))
        console.log(chalk.dim(`Types: ${webhook.types.join(', ')}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update webhook:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  webhooks
    .command('delete <id>')
    .description('Delete a webhook')
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
        const webhookId = parseInt(id, 10)
        if (isNaN(webhookId)) {
          console.error(chalk.red('Invalid webhook ID: must be a number'))
          process.exit(1)
        }
        await deleteWebhook(projectId, webhookId)
        console.log(chalk.green(`✓ Webhook ${webhookId} deleted`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete webhook:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  webhooks
    .command('test <id>')
    .description('Send a test payload to a webhook')
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
        const webhookId = parseInt(id, 10)
        if (isNaN(webhookId)) {
          console.error(chalk.red('Invalid webhook ID: must be a number'))
          process.exit(1)
        }
        await testWebhook(projectId, webhookId)
        console.log(chalk.green(`✓ Test payload sent to webhook ${webhookId}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to test webhook:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return webhooks
}
