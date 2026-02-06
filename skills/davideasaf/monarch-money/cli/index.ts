#!/usr/bin/env node

import { Command } from 'commander'

import { accountsCommand } from './commands/accounts'
import { authCommand } from './commands/auth'
import { categoriesCommand } from './commands/categories'
import { doctorCommand } from './commands/doctor'
import { receiptsCommand } from './commands/receipts'
import { testCommand } from './commands/test'
import { transactionsCommand } from './commands/transactions'

const program = new Command()

program
  .name('monarch-money')
  .description('CLI for Monarch Money budget management')
  .version('1.0.0')

// Add subcommands
program.addCommand(authCommand)
program.addCommand(transactionsCommand)
program.addCommand(categoriesCommand)
program.addCommand(accountsCommand)
program.addCommand(receiptsCommand)
program.addCommand(doctorCommand)
program.addCommand(testCommand)

program.parse()
