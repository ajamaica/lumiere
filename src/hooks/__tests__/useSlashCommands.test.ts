import { SLASH_COMMANDS, useSlashCommands } from '../useSlashCommands'

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
    const unique = new Set(commands)
    // /whoami and /id both exist with same description, which is intentional
    // but check there are no other exact duplicates
    const duplicates = commands.filter((cmd, i) => commands.indexOf(cmd) !== i)
    expect(duplicates).toEqual([])
  })
})

describe('useSlashCommands', () => {
  it('returns empty suggestions for non-slash input', () => {
    const result = useSlashCommands('hello')
    expect(result.suggestions).toEqual([])
    expect(result.hasInput).toBe(false)
  })

  it('returns all commands for just "/"', () => {
    const result = useSlashCommands('/')
    expect(result.suggestions).toEqual(SLASH_COMMANDS)
    expect(result.hasInput).toBe(true)
  })

  it('filters commands by prefix', () => {
    const result = useSlashCommands('/he')
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1)
    result.suggestions.forEach((cmd) => {
      expect(cmd.command.toLowerCase()).toMatch(/^\/he/)
    })
  })

  it('returns /help for "/help"', () => {
    const result = useSlashCommands('/help')
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: '/help' })]),
    )
  })

  it('is case-insensitive', () => {
    const lower = useSlashCommands('/he')
    const upper = useSlashCommands('/HE')
    expect(lower.suggestions.length).toBe(upper.suggestions.length)
  })

  it('returns empty for non-matching prefix', () => {
    const result = useSlashCommands('/zzzzz')
    expect(result.suggestions).toEqual([])
  })

  it('always exposes all commands', () => {
    const result = useSlashCommands('')
    expect(result.commands).toBe(SLASH_COMMANDS)
  })
})
