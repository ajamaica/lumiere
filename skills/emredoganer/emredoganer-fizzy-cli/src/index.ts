#!/usr/bin/env node

import { Command } from 'commander'

import { createAccountCommand, createAccountsCommand, createAuthCommands } from './commands/auth.js'
import { createBoardsCommands } from './commands/boards.js'
import { createCardsCommands } from './commands/cards.js'
import { createCommentsCommands } from './commands/comments.js'
import { createStepsCommands } from './commands/steps.js'
import { createColumnsCommands, createTagsCommands } from './commands/tags.js'

const program = new Command()

program
  .name('fizzy')
  .description('CLI for managing Fizzy Kanban boards, cards, and tasks')
  .version('1.0.0')

// Auth commands
program.addCommand(createAuthCommands())
program.addCommand(createAccountsCommand())
program.addCommand(createAccountCommand())

// Resource commands
program.addCommand(createBoardsCommands())
program.addCommand(createCardsCommands())
program.addCommand(createStepsCommands())
program.addCommand(createCommentsCommands())
program.addCommand(createTagsCommands())
program.addCommand(createColumnsCommands())

program.parse()
