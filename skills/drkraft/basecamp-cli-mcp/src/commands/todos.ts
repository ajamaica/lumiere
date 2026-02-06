import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'

import {
  completeTodo,
  createTodo,
  createTodoList,
  createTodolistGroup,
  getTodo,
  getTodoList,
  listTodolistGroups,
  listTodoLists,
  listTodos,
  moveTodo,
  trashRecording,
  uncompleteTodo,
  updateTodo,
} from '../lib/api.js'
import { isAuthenticated } from '../lib/config.js'

export function createTodoListsCommands(): Command {
  const todolists = new Command('todolists').description('Manage to-do lists')

  todolists
    .command('list')
    .description('List to-do lists in a project')
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
        const lists = await listTodoLists(projectId)

        if (options.format === 'json') {
          console.log(JSON.stringify(lists, null, 2))
          return
        }

        if (lists.length === 0) {
          console.log(chalk.yellow('No to-do lists found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Name', 'Progress', 'Description'],
          wordWrap: true,
        })

        lists.forEach((list) => {
          table.push([list.id, list.name, list.completed_ratio || '0/0', list.description || '-'])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${lists.length} lists`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list to-do lists:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todolists
    .command('create')
    .description('Create a to-do list')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-n, --name <name>', 'List name')
    .option('-d, --description <description>', 'List description')
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
        const list = await createTodoList(projectId, options.name, options.description)

        if (options.format === 'json') {
          console.log(JSON.stringify(list, null, 2))
          return
        }

        console.log(chalk.green('✓ To-do list created'))
        console.log(chalk.dim(`ID: ${list.id}`))
        console.log(chalk.dim(`Name: ${list.name}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create to-do list:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todolists
    .command('delete <id>')
    .description('Delete (trash) a to-do list')
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
        const listId = parseInt(id, 10)
        if (isNaN(listId)) {
          console.error(chalk.red('Invalid to-do list ID: must be a number'))
          process.exit(1)
        }
        await trashRecording(projectId, listId)
        console.log(chalk.green(`✓ To-do list ${listId} moved to trash`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete to-do list:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return todolists
}

export function createTodosCommands(): Command {
  const todos = new Command('todos').description('Manage to-dos')

  todos
    .command('list')
    .description('List to-dos in a to-do list')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-l, --list <id>', 'To-do list ID')
    .option('--completed', 'Show completed to-dos')
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
        const listId = parseInt(options.list, 10)
        if (isNaN(listId)) {
          console.error(chalk.red('Invalid list ID: must be a number'))
          process.exit(1)
        }
        const todoList = await listTodos(projectId, listId, options.completed)

        if (options.format === 'json') {
          console.log(JSON.stringify(todoList, null, 2))
          return
        }

        if (todoList.length === 0) {
          console.log(chalk.yellow('No to-dos found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Status', 'Content', 'Due', 'Assignees'],
          wordWrap: true,
        })

        todoList.forEach((todo) => {
          table.push([
            todo.id,
            todo.completed ? chalk.green('✓') : chalk.dim('○'),
            todo.content,
            todo.due_on || '-',
            todo.assignees?.map((a) => a.name).join(', ') || '-',
          ])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${todoList.length} to-dos`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list to-dos:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('get <id>')
    .description('Get to-do details')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }
        const todo = await getTodo(projectId, todoId)

        if (options.format === 'json') {
          console.log(JSON.stringify(todo, null, 2))
          return
        }

        console.log(chalk.bold(todo.content))
        console.log(chalk.dim(`ID: ${todo.id}`))
        console.log(chalk.dim(`Status: ${todo.completed ? 'Completed' : 'Pending'}`))
        console.log(chalk.dim(`Description: ${todo.description || '-'}`))
        console.log(chalk.dim(`Due: ${todo.due_on || '-'}`))
        console.log(chalk.dim(`Starts: ${todo.starts_on || '-'}`))
        console.log(chalk.dim(`Assignees: ${todo.assignees?.map((a) => a.name).join(', ') || '-'}`))
        console.log(chalk.dim(`Comments: ${todo.comments_count}`))
        console.log(chalk.dim(`URL: ${todo.app_url}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to get to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('create')
    .description('Create a to-do')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-l, --list <id>', 'To-do list ID')
    .requiredOption('-c, --content <content>', 'To-do content')
    .option('-d, --description <description>', 'To-do description')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--starts <date>', 'Start date (YYYY-MM-DD)')
    .option('--assignees <ids>', 'Comma-separated assignee IDs')
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
        const listId = parseInt(options.list, 10)
        if (isNaN(listId)) {
          console.error(chalk.red('Invalid list ID: must be a number'))
          process.exit(1)
        }

        const todoOptions: {
          description?: string
          due_on?: string
          starts_on?: string
          assignee_ids?: number[]
        } = {}

        if (options.description) todoOptions.description = options.description
        if (options.due) todoOptions.due_on = options.due
        if (options.starts) todoOptions.starts_on = options.starts
        if (options.assignees) {
          todoOptions.assignee_ids = options.assignees
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
        }

        const todo = await createTodo(projectId, listId, options.content, todoOptions)

        if (options.format === 'json') {
          console.log(JSON.stringify(todo, null, 2))
          return
        }

        console.log(chalk.green('✓ To-do created'))
        console.log(chalk.dim(`ID: ${todo.id}`))
        console.log(chalk.dim(`Content: ${todo.content}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('update <id>')
    .description('Update a to-do')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-c, --content <content>', 'New content')
    .option('-d, --description <description>', 'New description')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--starts <date>', 'Start date (YYYY-MM-DD)')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }

        const updates: {
          content?: string
          description?: string
          due_on?: string | null
          starts_on?: string | null
          assignee_ids?: number[]
        } = {}

        if (options.content) updates.content = options.content
        if (options.description) updates.description = options.description
        if (options.due) updates.due_on = options.due
        if (options.starts) updates.starts_on = options.starts
        if (options.assignees) {
          updates.assignee_ids = options.assignees
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
        }

        const todo = await updateTodo(projectId, todoId, updates)

        if (options.format === 'json') {
          console.log(JSON.stringify(todo, null, 2))
          return
        }

        console.log(chalk.green('✓ To-do updated'))
        console.log(chalk.dim(`ID: ${todo.id}`))
        console.log(chalk.dim(`Content: ${todo.content}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to update to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('complete <id>')
    .description('Mark a to-do as complete')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }
        await completeTodo(projectId, todoId)
        console.log(chalk.green(`✓ To-do ${todoId} completed`))
      } catch (error) {
        console.error(
          chalk.red('Failed to complete to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('uncomplete <id>')
    .description('Mark a to-do as incomplete')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }
        await uncompleteTodo(projectId, todoId)
        console.log(chalk.green(`✓ To-do ${todoId} marked as incomplete`))
      } catch (error) {
        console.error(
          chalk.red('Failed to uncomplete to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('delete <id>')
    .description('Delete (trash) a to-do')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }
        await trashRecording(projectId, todoId)
        console.log(chalk.green(`✓ To-do ${todoId} moved to trash`))
      } catch (error) {
        console.error(
          chalk.red('Failed to delete to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todos
    .command('move <id>')
    .description('Move a to-do to a different list')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-l, --list <id>', 'Target to-do list ID')
    .option('--position <pos>', 'Position in target list (default: 1)', '1')
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
        const todoId = parseInt(id, 10)
        if (isNaN(todoId)) {
          console.error(chalk.red('Invalid todo ID: must be a number'))
          process.exit(1)
        }
        const targetListId = parseInt(options.list, 10)
        if (isNaN(targetListId)) {
          console.error(chalk.red('Invalid target list ID: must be a number'))
          process.exit(1)
        }
        const position = parseInt(options.position, 10)
        if (isNaN(position) || position < 1) {
          console.error(chalk.red('Invalid position: must be a number >= 1'))
          process.exit(1)
        }
        await moveTodo(projectId, todoId, targetListId, position)
        console.log(chalk.green(`✓ To-do ${todoId} moved to list ${targetListId}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to move to-do:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return todos
}

export function createTodoGroupsCommands(): Command {
  const todogroups = new Command('todogroups').description('Manage to-do list groups')

  todogroups
    .command('list')
    .description('List to-do groups in a to-do list')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-l, --list <id>', 'To-do list ID')
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
        const listId = parseInt(options.list, 10)
        if (isNaN(listId)) {
          console.error(chalk.red('Invalid list ID: must be a number'))
          process.exit(1)
        }
        const groups = await listTodolistGroups(projectId, listId)

        if (options.format === 'json') {
          console.log(JSON.stringify(groups, null, 2))
          return
        }

        if (groups.length === 0) {
          console.log(chalk.yellow('No to-do groups found.'))
          return
        }

        const table = new Table({
          head: ['ID', 'Name', 'Progress', 'Position'],
          wordWrap: true,
        })

        groups.forEach((group) => {
          table.push([group.id, group.name, group.completed_ratio || '0/0', group.position])
        })

        console.log(table.toString())
        console.log(chalk.dim(`\nTotal: ${groups.length} groups`))
      } catch (error) {
        console.error(
          chalk.red('Failed to list to-do groups:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  todogroups
    .command('create')
    .description('Create a to-do group')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-l, --list <id>', 'To-do list ID')
    .requiredOption('-n, --name <name>', 'Group name')
    .option(
      '--color <color>',
      'Group color (white|red|orange|yellow|green|blue|aqua|purple|gray|pink|brown)',
    )
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
        const listId = parseInt(options.list, 10)
        if (isNaN(listId)) {
          console.error(chalk.red('Invalid list ID: must be a number'))
          process.exit(1)
        }
        const group = await createTodolistGroup(projectId, listId, options.name, options.color)

        if (options.format === 'json') {
          console.log(JSON.stringify(group, null, 2))
          return
        }

        console.log(chalk.green('✓ To-do group created'))
        console.log(chalk.dim(`ID: ${group.id}`))
        console.log(chalk.dim(`Name: ${group.name}`))
        console.log(chalk.dim(`Position: ${group.position}`))
      } catch (error) {
        console.error(
          chalk.red('Failed to create to-do group:'),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })

  return todogroups
}
