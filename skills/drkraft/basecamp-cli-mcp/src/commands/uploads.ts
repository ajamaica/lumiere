import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { createUpload, getUpload, listUploads, updateUpload } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createUploadsCommands(): Command {
  const uploads = new Command('uploads').description('Manage uploads (binary files)')

  uploads
    .command('list')
    .description('List uploads in a vault')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-v, --vault <id>', 'Vault ID')
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
        const uploadsList = await listUploads(projectId, vaultId)

        if (options.format === 'json') {
          console.log(JSON.stringify(uploadsList, null, 2))
          return
        }

        if (uploadsList.length === 0) {
          console.log(chalk.yellow('No uploads found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Filename', 'Type', 'Size', 'Comments', 'Created'],
          wordWrap: true,
        })

        uploadsList.forEach((upload) => {
          const sizeKB = (upload.byte_size / 1024).toFixed(2)
          table.push([
            upload.id,
            upload.filename,
            upload.content_type,
            `${sizeKB} KB`,
            upload.comments_count,
            new Date(upload.created_at).toLocaleDateString(),
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${uploadsList.length} uploads`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list uploads:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  uploads
    .command('get <id>')
    .description('Get upload details')
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
        const uploadId = parseInt(id, 10)
        if (isNaN(uploadId)) {
          console.error(chalk.red('Invalid upload ID: must be a number'))
          process.exit(1)
        }
        const upload = await getUpload(projectId, uploadId)

        if (options.format === 'json') {
          console.log(JSON.stringify(upload, null, 2))
          return
        }

        console.log(chalk.bold(upload.title))
        console.log(chalk.dim(`ID: ${upload.id}`))
        console.log(chalk.dim(`Filename: ${upload.filename}`))
        console.log(chalk.dim(`Content Type: ${upload.content_type}`))
        console.log(chalk.dim(`Size: ${(upload.byte_size / 1024).toFixed(2)} KB`))
        if (upload.width && upload.height) {
          console.log(chalk.dim(`Dimensions: ${upload.width}x${upload.height}`))
        }
        console.log(chalk.dim(`Status: ${upload.status}`))
        console.log(chalk.dim(`Position: ${upload.position}`))
        console.log(chalk.dim(`Comments: ${upload.comments_count}`))
        console.log(chalk.dim(`Created: ${upload.created_at}`))
        console.log(chalk.dim(`Updated: ${upload.updated_at}`))
        console.log(chalk.dim(`Download URL: ${upload.download_url}`))
        console.log(chalk.dim(`App URL: ${upload.app_url}`))
        if (upload.description) {
          console.log('\n' + chalk.bold('Description:'))
          console.log(upload.description)
        }
      } catch (error) {
        console.error(
          chalk.red('Failed to get upload:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  uploads
    .command('create')
    .description('Create an upload (requires attachable_sgid from attachment API)')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-v, --vault <id>', 'Vault ID')
    .requiredOption('-a, --attachable-sgid <sgid>', 'Attachable SGID from attachment upload')
    .option('-d, --description <description>', 'Upload description (HTML)')
    .option('-n, --name <name>', 'Base name (filename without extension)')
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

        const uploadOptions: { description?: string; base_name?: string } = {}
        if (options.description) uploadOptions.description = options.description
        if (options.name) uploadOptions.base_name = options.name

        const upload = await createUpload(projectId, vaultId, options.attachableSgid, uploadOptions)

        if (options.format === 'json') {
          console.log(JSON.stringify(upload, null, 2))
          return
        }

        console.log(chalk.green('✓ Upload created'))
        console.log(chalk.dim(`ID: ${upload.id}`))
        console.log(chalk.dim(`Filename: ${upload.filename}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create upload:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  uploads
    .command('update <id>')
    .description('Update an upload')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-d, --description <description>', 'New upload description (HTML)')
    .option('-n, --name <name>', 'New base name (filename without extension)')
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
        const uploadId = parseInt(id, 10)
        if (isNaN(uploadId)) {
          console.error(chalk.red('Invalid upload ID: must be a number'))
          process.exit(1)
        }

        const updates: { description?: string; base_name?: string } = {}
        if (options.description) updates.description = options.description
        if (options.name) updates.base_name = options.name

        if (Object.keys(updates).length === 0) {
          console.error(chalk.red('No updates provided. Use --description or --name'))
          process.exit(1)
        }

        const upload = await updateUpload(projectId, uploadId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(upload, null, 2))
          return
        }

        console.log(chalk.green('✓ Upload updated'))
        console.log(chalk.dim(`ID: ${upload.id}`))
        console.log(chalk.dim(`Filename: ${upload.filename}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update upload:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return uploads
}
