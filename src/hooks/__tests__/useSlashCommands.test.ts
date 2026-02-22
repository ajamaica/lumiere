import { getCommandsForProvider, SLASH_COMMANDS, useSlashCommands } from '../useSlashCommands'

// Mock React's useMemo to just execute the factory
jest.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
}))

describe('SLASH_COMMANDS', () => {
  it('has commands defined', () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThan(0)
  })

  it('all commands start with /', () => {
    SLASH_COMMANDS.forEach((cmd) => {
      expect(cmd.command).toMatch(/^\//)
    })
  })

  it('all commands have a description', () => {
    SLASH_COMMANDS.forEach((cmd) => {
      expect(cmd.description).toBeTruthy()
    })
  })

  it('all commands have a valid category', () => {
    const validCategories = ['core', 'model', 'execution', 'workspace', 'channels', 'admin']
    SLASH_COMMANDS.forEach((cmd) => {
      expect(validCategories).toContain(cmd.category)
    })
  })

  it('has no duplicate commands', () => {
    const commands = SLASH_COMMANDS.map((c) => c.command)
    // /whoami and /id both exist with same description, which is intentional
    // but check there are no other exact duplicates
    const duplicates = commands.filter((cmd, i) => commands.indexOf(cmd) !== i)
    expect(duplicates).toEqual([])
  })

  it('all commands have valid provider arrays when specified', () => {
    SLASH_COMMANDS.forEach((cmd) => {
      if (cmd.providers) {
        expect(Array.isArray(cmd.providers)).toBe(true)
        expect(cmd.providers.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('getCommandsForProvider', () => {
  it('returns all commands when no provider type is given', () => {
    expect(getCommandsForProvider()).toEqual(SLASH_COMMANDS)
    expect(getCommandsForProvider(undefined)).toEqual(SLASH_COMMANDS)
  })

  it('returns opencraw commands for opencraw provider', () => {
    const opencrawCommands = getCommandsForProvider('opencraw')
    expect(opencrawCommands.length).toBeGreaterThan(0)
    // All current commands are tagged as opencraw, so opencraw should get all of them
    const opencrawTagged = SLASH_COMMANDS.filter(
      (cmd) => !cmd.providers || cmd.providers.includes('opencraw'),
    )
    expect(opencrawCommands).toEqual(opencrawTagged)
  })

  it('returns empty list for providers with no matching commands', () => {
    const ollamaCommands = getCommandsForProvider('ollama')
    // Only universal commands (no providers field) would be returned
    const universalCommands = SLASH_COMMANDS.filter((cmd) => !cmd.providers)
    expect(ollamaCommands).toEqual(universalCommands)
  })

  it('includes universal commands for any provider', () => {
    // Add a universal command scenario: commands without providers field
    // are available to all providers. Currently all commands are opencraw-only,
    // so non-opencraw providers get an empty list.
    const claudeCommands = getCommandsForProvider('claude')
    claudeCommands.forEach((cmd) => {
      expect(cmd.providers).toBeUndefined()
    })
  })
})

describe('useSlashCommands', () => {
  it('returns empty suggestions for non-slash input', () => {
    const result = useSlashCommands('hello')
    expect(result.suggestions).toEqual([])
    expect(result.hasInput).toBe(false)
  })

  it('returns all commands for just "/" when no provider specified', () => {
    const result = useSlashCommands('/')
    expect(result.suggestions).toEqual(SLASH_COMMANDS)
    expect(result.hasInput).toBe(true)
  })

  it('returns only opencraw commands for just "/" with opencraw provider', () => {
    const result = useSlashCommands('/', 'opencraw')
    const opencrawCommands = SLASH_COMMANDS.filter(
      (cmd) => !cmd.providers || cmd.providers.includes('opencraw'),
    )
    expect(result.suggestions).toEqual(opencrawCommands)
  })

  it('returns no commands for just "/" with ollama provider', () => {
    const result = useSlashCommands('/', 'ollama')
    // All current commands are opencraw-only, so ollama gets none
    const universalCommands = SLASH_COMMANDS.filter((cmd) => !cmd.providers)
    expect(result.suggestions).toEqual(universalCommands)
  })

  it('filters commands by prefix', () => {
    const result = useSlashCommands('/he', 'opencraw')
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1)
    result.suggestions.forEach((cmd) => {
      expect(cmd.command.toLowerCase()).toMatch(/^\/he/)
    })
  })

  it('returns /help for "/help" with opencraw provider', () => {
    const result = useSlashCommands('/help', 'opencraw')
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: '/help' })]),
    )
  })

  it('does not return /help for "/help" with ollama provider', () => {
    const result = useSlashCommands('/help', 'ollama')
    expect(result.suggestions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ command: '/help' })]),
    )
  })

  it('is case-insensitive', () => {
    const lower = useSlashCommands('/he', 'opencraw')
    const upper = useSlashCommands('/HE', 'opencraw')
    expect(lower.suggestions.length).toBe(upper.suggestions.length)
  })

  it('returns empty for non-matching prefix', () => {
    const result = useSlashCommands('/zzzzz', 'opencraw')
    expect(result.suggestions).toEqual([])
  })

  it('exposes provider-filtered commands list', () => {
    const opencrawResult = useSlashCommands('', 'opencraw')
    const ollamaResult = useSlashCommands('', 'ollama')
    expect(opencrawResult.commands.length).toBeGreaterThanOrEqual(ollamaResult.commands.length)
  })
})
