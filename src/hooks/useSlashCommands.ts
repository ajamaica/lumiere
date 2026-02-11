import { useMemo } from 'react'

import { ProviderType } from '../services/providers/types'

export interface SlashCommand {
  command: string
  description: string
  parameters?: string
  category: 'core' | 'model' | 'execution' | 'workspace' | 'channels' | 'admin'
  /** Provider types that support this command. If omitted, available to all providers. */
  providers?: ProviderType[]
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Core Commands
  {
    command: '/help',
    description: 'Display help information',
    category: 'core',
    providers: ['molt'],
  },
  {
    command: '/commands',
    description: 'List available commands',
    category: 'core',
    providers: ['molt'],
  },
  {
    command: '/status',
    description: 'Show current status; includes provider usage/quota',
    category: 'core',
    providers: ['molt'],
  },
  {
    command: '/whoami',
    description: 'Reveal your sender identifier',
    category: 'core',
    providers: ['molt'],
  },
  {
    command: '/id',
    description: 'Reveal your sender identifier',
    category: 'core',
    providers: ['molt'],
  },

  // Model & Configuration
  {
    command: '/model',
    description: 'Switch or display active language model',
    parameters: '[list|#|provider/model|status]',
    category: 'model',
    providers: ['molt'],
  },
  {
    command: '/config',
    description: 'Read or modify persistent settings',
    parameters: '[show|get|set|unset]',
    category: 'model',
    providers: ['molt'],
  },
  {
    command: '/debug',
    description: 'Apply temporary runtime overrides',
    parameters: '[show|set|unset|reset]',
    category: 'model',
    providers: ['molt'],
  },

  // Execution & Control
  {
    command: '/think',
    description: 'Adjust reasoning depth',
    parameters: '[off|minimal|low|medium|high|xhigh]',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/verbose',
    description: 'Enable detailed output',
    parameters: '[on|full|off]',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/reasoning',
    description: 'Control reasoning display',
    parameters: '[on|off|stream]',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/elevated',
    description: 'Manage privilege escalation',
    parameters: '[on|off|ask|full]',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/exec',
    description: 'Configure execution environment',
    parameters: 'host=|security=|ask=|node=',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/bash',
    description: 'Execute host shell commands',
    parameters: '<command>',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/stop',
    description: 'Halt current operation',
    category: 'execution',
    providers: ['molt'],
  },
  {
    command: '/restart',
    description: 'Reboot the system',
    category: 'execution',
    providers: ['molt'],
  },

  // Workspace & Skills
  {
    command: '/skill',
    description: 'Invoke tool by name',
    parameters: '<name> [input]',
    category: 'workspace',
    providers: ['molt'],
  },
  {
    command: '/context',
    description: 'Explain available context',
    parameters: '[list|detail|json]',
    category: 'workspace',
    providers: ['molt'],
  },
  {
    command: '/queue',
    description: 'Configure message queue behavior',
    parameters: '<mode> [debounce|cap|drop]',
    category: 'workspace',
    providers: ['molt'],
  },
  {
    command: '/reset',
    description: 'Start fresh session',
    parameters: '[model]',
    category: 'workspace',
    providers: ['molt'],
  },
  {
    command: '/new',
    description: 'Start fresh session',
    parameters: '[model]',
    category: 'workspace',
    providers: ['molt'],
  },

  // Channels & Features
  {
    command: '/dock-telegram',
    description: 'Route replies to Telegram',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/dock-discord',
    description: 'Route replies to Discord',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/dock-slack',
    description: 'Route replies to Slack',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/activation',
    description: 'Control group mention requirements',
    parameters: '[mention|always]',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/send',
    description: 'Toggle message sending',
    parameters: '[on|off|inherit]',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/tts',
    description: 'Manage text-to-speech',
    parameters: '[off|always|inbound|tagged|status]',
    category: 'channels',
    providers: ['molt'],
  },
  {
    command: '/usage',
    description: 'Display token/cost information',
    parameters: '[off|tokens|full|cost]',
    category: 'channels',
    providers: ['molt'],
  },

  // Administration
  {
    command: '/allowlist',
    description: 'Manage access restrictions',
    parameters: '[list|add|remove]',
    category: 'admin',
    providers: ['molt'],
  },
  {
    command: '/approve',
    description: 'Resolve execution prompts',
    parameters: '<id> [allow-once|allow-always|deny]',
    category: 'admin',
    providers: ['molt'],
  },
  {
    command: '/subagents',
    description: 'Inspect sub-agent activity',
    parameters: '[list|stop|log|info|send]',
    category: 'admin',
    providers: ['molt'],
  },
  {
    command: '/compact',
    description: 'Reduce context overhead',
    parameters: '[instructions]',
    category: 'admin',
    providers: ['molt'],
  },
]

/**
 * Returns the subset of SLASH_COMMANDS available for a given provider.
 * Commands with no `providers` field are available to all providers.
 */
export function getCommandsForProvider(providerType?: ProviderType): SlashCommand[] {
  if (!providerType) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter((cmd) => !cmd.providers || cmd.providers.includes(providerType))
}

export function useSlashCommands(input: string, providerType?: ProviderType) {
  const availableCommands = useMemo(() => getCommandsForProvider(providerType), [providerType])

  const suggestions = useMemo(() => {
    // Only show suggestions if input starts with /
    if (!input.startsWith('/')) {
      return []
    }

    // If just "/", show all available commands
    if (input === '/') {
      return availableCommands
    }

    // Filter commands that start with the input
    const searchTerm = input.toLowerCase()
    return availableCommands.filter((cmd) => cmd.command.toLowerCase().startsWith(searchTerm))
  }, [input, availableCommands])

  return {
    suggestions,
    hasInput: input.startsWith('/'),
    commands: availableCommands,
  }
}
