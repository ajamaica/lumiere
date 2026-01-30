import { useMemo } from 'react'

export interface SlashCommand {
  command: string
  description: string
  parameters?: string
  category: 'core' | 'model' | 'execution' | 'workspace' | 'channels' | 'admin'
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Core Commands
  { command: '/help', description: 'Display help information', category: 'core' },
  { command: '/commands', description: 'List available commands', category: 'core' },
  { command: '/status', description: 'Show current status; includes provider usage/quota', category: 'core' },
  { command: '/whoami', description: 'Reveal your sender identifier', category: 'core' },
  { command: '/id', description: 'Reveal your sender identifier', category: 'core' },

  // Model & Configuration
  { command: '/model', description: 'Switch or display active language model', parameters: '[list|#|provider/model|status]', category: 'model' },
  { command: '/config', description: 'Read or modify persistent settings', parameters: '[show|get|set|unset]', category: 'model' },
  { command: '/debug', description: 'Apply temporary runtime overrides', parameters: '[show|set|unset|reset]', category: 'model' },

  // Execution & Control
  { command: '/think', description: 'Adjust reasoning depth', parameters: '[off|minimal|low|medium|high|xhigh]', category: 'execution' },
  { command: '/verbose', description: 'Enable detailed output', parameters: '[on|full|off]', category: 'execution' },
  { command: '/reasoning', description: 'Control reasoning display', parameters: '[on|off|stream]', category: 'execution' },
  { command: '/elevated', description: 'Manage privilege escalation', parameters: '[on|off|ask|full]', category: 'execution' },
  { command: '/exec', description: 'Configure execution environment', parameters: 'host=|security=|ask=|node=', category: 'execution' },
  { command: '/bash', description: 'Execute host shell commands', parameters: '<command>', category: 'execution' },
  { command: '/stop', description: 'Halt current operation', category: 'execution' },
  { command: '/restart', description: 'Reboot the system', category: 'execution' },

  // Workspace & Skills
  { command: '/skill', description: 'Invoke tool by name', parameters: '<name> [input]', category: 'workspace' },
  { command: '/context', description: 'Explain available context', parameters: '[list|detail|json]', category: 'workspace' },
  { command: '/queue', description: 'Configure message queue behavior', parameters: '<mode> [debounce|cap|drop]', category: 'workspace' },
  { command: '/reset', description: 'Start fresh session', parameters: '[model]', category: 'workspace' },
  { command: '/new', description: 'Start fresh session', parameters: '[model]', category: 'workspace' },

  // Channels & Features
  { command: '/dock-telegram', description: 'Route replies to Telegram', category: 'channels' },
  { command: '/dock-discord', description: 'Route replies to Discord', category: 'channels' },
  { command: '/dock-slack', description: 'Route replies to Slack', category: 'channels' },
  { command: '/activation', description: 'Control group mention requirements', parameters: '[mention|always]', category: 'channels' },
  { command: '/send', description: 'Toggle message sending', parameters: '[on|off|inherit]', category: 'channels' },
  { command: '/tts', description: 'Manage text-to-speech', parameters: '[off|always|inbound|tagged|status]', category: 'channels' },
  { command: '/usage', description: 'Display token/cost information', parameters: '[off|tokens|full|cost]', category: 'channels' },

  // Administration
  { command: '/allowlist', description: 'Manage access restrictions', parameters: '[list|add|remove]', category: 'admin' },
  { command: '/approve', description: 'Resolve execution prompts', parameters: '<id> [allow-once|allow-always|deny]', category: 'admin' },
  { command: '/subagents', description: 'Inspect sub-agent activity', parameters: '[list|stop|log|info|send]', category: 'admin' },
  { command: '/compact', description: 'Reduce context overhead', parameters: '[instructions]', category: 'admin' },
]

export function useSlashCommands(input: string) {
  const suggestions = useMemo(() => {
    // Only show suggestions if input starts with /
    if (!input.startsWith('/')) {
      return []
    }

    // If just "/", show all commands
    if (input === '/') {
      return SLASH_COMMANDS
    }

    // Filter commands that start with the input
    const searchTerm = input.toLowerCase()
    return SLASH_COMMANDS.filter((cmd) => cmd.command.toLowerCase().startsWith(searchTerm))
  }, [input])

  return {
    suggestions,
    hasInput: input.startsWith('/'),
    commands: SLASH_COMMANDS,
  }
}
