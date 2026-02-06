import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import { createDocument, getDocument, listDocuments, updateDocument } from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createDocumentsCommands(): Command {
  const documents = new Command('documents').description('Manage documents (text files)')

  documents
    .command('list')
    .description('List documents in a vault')
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
        const documentsList = await listDocuments(projectId, vaultId)

        if (options.format === 'json') {
          console.log(JSON.stringify(documentsList, null, 2))
          return
        }

        if (documentsList.length === 0) {
          console.log(chalk.yellow('No documents found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Title', 'Comments', 'Position', 'Created'],
          wordWrap: true,
        })

        documentsList.forEach((doc) => {
          table.push([
            doc.id,
            doc.title,
            doc.comments_count,
            doc.position,
            new Date(doc.created_at).toLocaleDateString(),
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${documentsList.length} documents`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list documents:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  documents
    .command('get <id>')
    .description('Get document details')
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
        const documentId = parseInt(id, 10)
        if (isNaN(documentId)) {
          console.error(chalk.red('Invalid document ID: must be a number'))
          process.exit(1)
        }
        const document = await getDocument(projectId, documentId)

        if (options.format === 'json') {
          console.log(JSON.stringify(document, null, 2))
          return
        }

        console.log(chalk.bold(document.title))
        console.log(chalk.dim(`ID: ${document.id}`))
        console.log(chalk.dim(`Status: ${document.status}`))
        console.log(chalk.dim(`Position: ${document.position}`))
        console.log(chalk.dim(`Comments: ${document.comments_count}`))
        console.log(chalk.dim(`Created: ${document.created_at}`))
        console.log(chalk.dim(`Updated: ${document.updated_at}`))
        console.log(chalk.dim(`URL: ${document.app_url}`))
        console.log('\n' + chalk.bold('Content:'))
        console.log(document.content)
      } catch (error) {
        console.error(
          chalk.red('Failed to get document:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  documents
    .command('create')
    .description('Create a document')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-v, --vault <id>', 'Vault ID')
    .requiredOption('-t, --title <title>', 'Document title')
    .requiredOption('-c, --content <content>', 'Document content (HTML)')
    .option('-s, --status <status>', 'Status (active|draft)', 'active')
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
        const document = await createDocument(
          projectId,
          vaultId,
          options.title,
          options.content,
          options.status,
        )

        if (options.format === 'json') {
          console.log(JSON.stringify(document, null, 2))
          return
        }

        console.log(chalk.green('✓ Document created'))
        console.log(chalk.dim(`ID: ${document.id}`))
        console.log(chalk.dim(`Title: ${document.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create document:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  documents
    .command('update <id>')
    .description('Update a document')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-t, --title <title>', 'New document title')
    .option('-c, --content <content>', 'New document content (HTML)')
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
        const documentId = parseInt(id, 10)
        if (isNaN(documentId)) {
          console.error(chalk.red('Invalid document ID: must be a number'))
          process.exit(1)
        }

        const updates: { title?: string; content?: string } = {}
        if (options.title) updates.title = options.title
        if (options.content) updates.content = options.content

        if (Object.keys(updates).length === 0) {
          console.error(chalk.red('No updates provided. Use --title or --content'))
          process.exit(1)
        }

        const document = await updateDocument(projectId, documentId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(document, null, 2))
          return
        }

        console.log(chalk.green('✓ Document updated'))
        console.log(chalk.dim(`ID: ${document.id}`))
        console.log(chalk.dim(`Title: ${document.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update document:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return documents
}
