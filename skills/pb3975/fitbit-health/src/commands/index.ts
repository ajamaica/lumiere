import { Command } from 'commander'

import { registerActivity } from './activity.js'
import { registerAuth } from './auth.js'
import { registerConfigure } from './configure.js'
import { registerProfile } from './profile.js'
import { registerSummary } from './summary.js'

export function registerAllCommands(program: Command): void {
  registerConfigure(program)
  registerAuth(program)
  registerProfile(program)
  registerActivity(program)
  registerSummary(program)
}
