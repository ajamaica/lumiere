import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { createVault, getVault, listVaults, updateVault } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createVaultsCommands(): Command {
  const vaults = new Command('vaults').description('Manage vaults (file folders)')

  vaults
    .command('list')
    .description('List vaults in a project')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-V, --vault <id>', 'Parent vault ID (optional, defaults to primary vault)')
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

        const vaultId = options.vault ? parseInt(options.vault, 10) : undefined
        if (options.vault && isNaN(vaultId!)) {
          console.error(chalk.red('Invalid vault ID: must be a number'))
          process.exit(1)
        }

        const vaultsList = await listVaults(projectId, vaultId)

        if (options.format === 'json') {
          console.log(JSON.stringify(vaultsList, null, 2))
          return
        }

        if (vaultsList.length === 0) {
          console.log(chalk.yellow('No vaults found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Title', 'Documents', 'Uploads', 'Vaults', 'Position'],
          wordWrap: true,
        })

        vaultsList.forEach((vault) => {
          table.push([
            vault.id,
            vault.title,
            vault.documents_count,
            vault.uploads_count,
            vault.vaults_count,
            vault.position,
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${vaultsList.length} vaults`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list vaults:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  vaults
    .command('get <id>')
    .description('Get vault details')
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
        const vaultId = parseInt(id, 10)
        if (isNaN(vaultId)) {
          console.error(chalk.red('Invalid vault ID: must be a number'))
          process.exit(1)
        }
        const vault = await getVault(projectId, vaultId)

        if (options.format === 'json') {
          console.log(JSON.stringify(vault, null, 2))
          return
        }

        console.log(chalk.bold(vault.title))
        console.log(chalk.dim(`ID: ${vault.id}`))
        console.log(chalk.dim(`Status: ${vault.status}`))
        console.log(chalk.dim(`Position: ${vault.position}`))
        console.log(chalk.dim(`Documents: ${vault.documents_count}`))
        console.log(chalk.dim(`Uploads: ${vault.uploads_count}`))
        console.log(chalk.dim(`Child Vaults: ${vault.vaults_count}`))
        console.log(chalk.dim(`Created: ${vault.created_at}`))
        console.log(chalk.dim(`Updated: ${vault.updated_at}`))
        console.log(chalk.dim(`URL: ${vault.app_url}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to get vault:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  vaults
    .command('create')
    .description('Create a vault (folder)')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-V, --vault <id>', 'Parent vault ID')
    .requiredOption('-t, --title <title>', 'Vault title')
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
        const vaultId = parseInt(options.vault, 10)
        if (isNaN(vaultId)) {
          console.error(chalk.red('Invalid vault ID: must be a number'))
          process.exit(1)
        }
        const vault = await createVault(projectId, vaultId, options.title)

        if (options.format === 'json') {
          console.log(JSON.stringify(vault, null, 2))
          return
        }

        console.log(chalk.green('✓ Vault created'))
        console.log(chalk.dim(`ID: ${vault.id}`))
        console.log(chalk.dim(`Title: ${vault.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create vault:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  vaults
    .command('update <id>')
    .description('Update a vault')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-t, --title <title>', 'New vault title')
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
        const vaultId = parseInt(id, 10)
        if (isNaN(vaultId)) {
          console.error(chalk.red('Invalid vault ID: must be a number'))
          process.exit(1)
        }
        const vault = await updateVault(projectId, vaultId, options.title)

        if (options.format === 'json') {
          console.log(JSON.stringify(vault, null, 2))
          return
        }

        console.log(chalk.green('✓ Vault updated'))
        console.log(chalk.dim(`ID: ${vault.id}`))
        console.log(chalk.dim(`Title: ${vault.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update vault:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return vaults
}
