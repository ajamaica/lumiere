#!/usr/bin/env node

import { Command } from 'commander'

import { createAccountCommand, createAccountsCommand, createAuthCommands } from './commands/auth.js'
import { createCampfiresCommands } from './commands/campfires.js'
import { createCardTablesCommands } from './commands/cardtables.js'
import { createCommentsCommands } from './commands/comments.js'
import { createDocumentsCommands } from './commands/documents.js'
import { createEventsCommands } from './commands/events.js'
import { createMessagesCommands } from './commands/messages.js'
import { createPeopleCommands } from './commands/people.js'
import { createProjectsCommands } from './commands/projects.js'
import { createRecordingsCommands } from './commands/recordings.js'
import { createSchedulesCommands } from './commands/schedules.js'
import { createSearchCommand } from './commands/search.js'
import { createSubscriptionsCommands } from './commands/subscriptions.js'
import {
  createTodoGroupsCommands,
  createTodoListsCommands,
  createTodosCommands,
} from './commands/todos.js'
import { createUploadsCommands } from './commands/uploads.js'
import { createVaultsCommands } from './commands/vaults.js'
import { createWebhooksCommands } from './commands/webhooks.js'
import { VERSION } from './lib/version.js'

const program = new Command()

program
  .name('basecamp')
  .description('CLI for managing Basecamp 4 projects, to-dos, messages, and more')
  .version(VERSION)
  .option('-v, --verbose', 'Enable verbose output for debugging')

program.addCommand(createAuthCommands())
program.addCommand(createAccountsCommand())
program.addCommand(createAccountCommand())

program.addCommand(createProjectsCommands())
program.addCommand(createTodoListsCommands())
program.addCommand(createTodosCommands())
program.addCommand(createTodoGroupsCommands())
program.addCommand(createMessagesCommands())
program.addCommand(createCampfiresCommands())
program.addCommand(createPeopleCommands())
program.addCommand(createCommentsCommands())
program.addCommand(createSchedulesCommands())
program.addCommand(createSearchCommand())
program.addCommand(createCardTablesCommands())
program.addCommand(createVaultsCommands())
program.addCommand(createDocumentsCommands())
program.addCommand(createUploadsCommands())
program.addCommand(createWebhooksCommands())
program.addCommand(createRecordingsCommands())
program.addCommand(createEventsCommands())
program.addCommand(createSubscriptionsCommands())

program.parse()
