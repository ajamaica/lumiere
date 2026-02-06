#!/usr/bin/env node

import { Command } from 'commander'

import { createAccountCommand, createAccountsCommand, createAuthCommands } from './commands/auth.js'
import { createCampfiresCommands } from './commands/campfires.js'
import { createMessagesCommands } from './commands/messages.js'
import { createMeCommand, createPeopleCommands } from './commands/people.js'
import { createProjectsCommands } from './commands/projects.js'
import { createTodoListsCommands, createTodosCommands } from './commands/todos.js'

const program = new Command()

program
  .name('basecamp')
  .description('CLI for managing Basecamp 4 projects, to-dos, messages, and campfires')
  .version('1.0.0')

// Auth commands
program.addCommand(createAuthCommands())
program.addCommand(createAccountsCommand())
program.addCommand(createAccountCommand())

// Resource commands
program.addCommand(createProjectsCommands())
program.addCommand(createTodoListsCommands())
program.addCommand(createTodosCommands())
program.addCommand(createMessagesCommands())
program.addCommand(createCampfiresCommands())
program.addCommand(createPeopleCommands())
program.addCommand(createMeCommand())

program.parse()
