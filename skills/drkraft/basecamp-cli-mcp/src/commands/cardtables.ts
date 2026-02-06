import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import {
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  getCard,
  getCardTable,
  getColumn,
  listCards,
  moveCard,
  updateCard,
  updateColumn,
} from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createCardTablesCommands(): Command {
  const cardtables = new Command('cardtables').description('Manage card tables (Kanban boards)')

  cardtables
    .command('get')
    .description('Get card table (Kanban board) for a project')
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
        const cardTable = await getCardTable(projectId)

        if (options.format === 'json') {
          console.log(JSON.stringify(cardTable, null, 2))
          return
        }

        console.log(chalk.bold(cardTable.title))
        console.log(chalk.dim(`ID: ${cardTable.id}`))
        console.log(chalk.dim(`Status: ${cardTable.status}`))
        console.log(chalk.dim(`Created: ${new Date(cardTable.created_at).toLocaleDateString()}`))
        console.log(chalk.dim(`URL: ${cardTable.app_url}`))

        if (cardTable.lists && cardTable.lists.length > 0) {
          console.log(chalk.bold('\nColumns:'))
          const table = new Table({
            head: ['ID', 'Title', 'Type', 'Cards', 'Color'],
            wordWrap: true,
          })

          cardTable.lists.forEach((column) => {
            table.push([
              column.id,
              column.title,
              column.type.replace('Kanban::', ''),
              column.cards_count,
              column.color || '-',
            ])
          })

          console.log(table.toString())
        }
      } catch (error) {
        console.error(
          chalk.red('Failed to get card table:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('columns')
    .description('List columns in a card table')
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
        const cardTable = await getCardTable(projectId)

        if (options.format === 'json') {
          console.log(JSON.stringify(cardTable.lists, null, 2))
          return
        }

        if (!cardTable.lists || cardTable.lists.length === 0) {
          console.log(chalk.yellow('No columns found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Title', 'Type', 'Cards', 'Color', 'Position'],
          wordWrap: true,
        })

        cardTable.lists.forEach((column) => {
          table.push([
            column.id,
            column.title,
            column.type.replace('Kanban::', ''),
            column.cards_count,
            column.color || '-',
            column.position !== undefined ? column.position : '-',
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${cardTable.lists.length} columns`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list columns:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('create-column')
    .description('Create a new column in a card table')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-t, --title <title>', 'Column title')
    .option('-d, --description <description>', 'Column description')
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
        const column = await createColumn(projectId, options.title, options.description)

        if (options.format === 'json') {
          console.log(JSON.stringify(column, null, 2))
          return
        }

        console.log(chalk.green('✓ Column created'))
        console.log(chalk.dim(`ID: ${column.id}`))
        console.log(chalk.dim(`Title: ${column.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create column:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('update-column <id>')
    .description('Update a column')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-t, --title <title>', 'New title')
    .option('-d, --description <description>', 'New description')
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
        const columnId = parseInt(id, 10)
        if (isNaN(columnId)) {
          console.error(chalk.red('Invalid column ID: must be a number'))
          process.exit(1)
        }

        const updates: { title?: string; description?: string } = {}
        if (options.title) updates.title = options.title
        if (options.description) updates.description = options.description

        const column = await updateColumn(projectId, columnId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(column, null, 2))
          return
        }

        console.log(chalk.green('✓ Column updated'))
        console.log(chalk.dim(`ID: ${column.id}`))
        console.log(chalk.dim(`Title: ${column.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update column:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('delete-column <id>')
    .description('Delete a column')
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
        const columnId = parseInt(id, 10)
        if (isNaN(columnId)) {
          console.error(chalk.red('Invalid column ID: must be a number'))
          process.exit(1)
        }
        await deleteColumn(projectId, columnId)
        console.log(chalk.green(`✓ Column ${columnId} deleted`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete column:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('cards')
    .description('List cards in a column')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-c, --column <id>', 'Column ID')
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
        const columnId = parseInt(options.column, 10)
        if (isNaN(columnId)) {
          console.error(chalk.red('Invalid column ID: must be a number'))
          process.exit(1)
        }
        const cards = await listCards(projectId, columnId)

        if (options.format === 'json') {
          console.log(JSON.stringify(cards, null, 2))
          return
        }

        if (cards.length === 0) {
          console.log(chalk.yellow('No cards found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Title', 'Due', 'Assignees', 'Position'],
          wordWrap: true,
        })

        cards.forEach((card) => {
          table.push([
            card.id,
            card.title,
            card.due_on || '-',
            card.assignees?.map((a) => a.name).join(', ') || '-',
            card.position,
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${cards.length} cards`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list cards:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('get-card <id>')
    .description('Get card details')
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
        const cardId = parseInt(id, 10)
        if (isNaN(cardId)) {
          console.error(chalk.red('Invalid card ID: must be a number'))
          process.exit(1)
        }
        const card = await getCard(projectId, cardId)

        if (options.format === 'json') {
          console.log(JSON.stringify(card, null, 2))
          return
        }

        console.log(chalk.bold(card.title))
        console.log(chalk.dim(`ID: ${card.id}`))
        console.log(chalk.dim(`Status: ${card.completed ? 'Completed' : 'Active'}`))
        console.log(chalk.dim(`Content: ${card.content || '-'}`))
        console.log(chalk.dim(`Description: ${card.description || '-'}`))
        console.log(chalk.dim(`Due: ${card.due_on || '-'}`))
        console.log(chalk.dim(`Assignees: ${card.assignees?.map((a) => a.name).join(', ') || '-'}`))
        console.log(chalk.dim(`Comments: ${card.comments_count}`))
        console.log(chalk.dim(`URL: ${card.app_url}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to get card:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('create-card')
    .description('Create a new card')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-c, --column <id>', 'Column ID')
    .requiredOption('-t, --title <title>', 'Card title')
    .option('--content <content>', 'Card content')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--assignees <ids>', 'Comma-separated assignee IDs')
    .option('--notify', 'Notify assignees')
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
        const columnId = parseInt(options.column, 10)
        if (isNaN(columnId)) {
          console.error(chalk.red('Invalid column ID: must be a number'))
          process.exit(1)
        }

        const cardOptions: {
          content?: string
          due_on?: string
          assignee_ids?: number[]
          notify?: boolean
        } = {}

        if (options.content) cardOptions.content = options.content
        if (options.due) cardOptions.due_on = options.due
        if (options.assignees) {
          cardOptions.assignee_ids = options.assignees
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
        }
        if (options.notify) cardOptions.notify = true

        const card = await createCard(projectId, columnId, options.title, cardOptions)

        if (options.format === 'json') {
          console.log(JSON.stringify(card, null, 2))
          return
        }

        console.log(chalk.green('✓ Card created'))
        console.log(chalk.dim(`ID: ${card.id}`))
        console.log(chalk.dim(`Title: ${card.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create card:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('update-card <id>')
    .description('Update a card')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-t, --title <title>', 'New title')
    .option('--content <content>', 'New content')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--assignees <ids>', 'Comma-separated assignee IDs')
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
        const cardId = parseInt(id, 10)
        if (isNaN(cardId)) {
          console.error(chalk.red('Invalid card ID: must be a number'))
          process.exit(1)
        }

        const updates: {
          title?: string
          content?: string
          due_on?: string | null
          assignee_ids?: number[]
        } = {}

        if (options.title) updates.title = options.title
        if (options.content) updates.content = options.content
        if (options.due) updates.due_on = options.due
        if (options.assignees) {
          updates.assignee_ids = options.assignees
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
        }

        const card = await updateCard(projectId, cardId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(card, null, 2))
          return
        }

        console.log(chalk.green('✓ Card updated'))
        console.log(chalk.dim(`ID: ${card.id}`))
        console.log(chalk.dim(`Title: ${card.title}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update card:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('move-card <id>')
    .description('Move a card to a different column')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-c, --column <id>', 'Target column ID')
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
        const cardId = parseInt(id, 10)
        if (isNaN(cardId)) {
          console.error(chalk.red('Invalid card ID: must be a number'))
          process.exit(1)
        }
        const columnId = parseInt(options.column, 10)
        if (isNaN(columnId)) {
          console.error(chalk.red('Invalid column ID: must be a number'))
          process.exit(1)
        }
        await moveCard(projectId, cardId, columnId)
        console.log(chalk.green(`✓ Card ${cardId} moved to column ${columnId}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to move card:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  cardtables
    .command('delete-card <id>')
    .description('Delete a card')
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
        const cardId = parseInt(id, 10)
        if (isNaN(cardId)) {
          console.error(chalk.red('Invalid card ID: must be a number'))
          process.exit(1)
        }
        await deleteCard(projectId, cardId)
        console.log(chalk.green(`✓ Card ${cardId} deleted`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete card:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return cardtables
}
