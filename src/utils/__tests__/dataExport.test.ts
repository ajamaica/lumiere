import { buildFullBackup, parseBackup } from '../dataExport'

describe('buildFullBackup', () => {
  it('creates a version 2 backup with all data', () => {
    const backup = buildFullBackup({
      servers: {
        'uuid-1': {
          id: 'uuid-1',
          name: 'My Server',
          url: 'https://example.com',
          providerType: 'claude',
          model: 'claude-sonnet-4-5',
          createdAt: 1000,
        },
      },
      favorites: [{ id: 'fav-1', text: 'Hello world', sender: 'agent', savedAt: 2000 }],
      triggers: {
        abc123: {
          id: 'abc123',
          message: 'Good morning',
          sessionKey: 'agent:main:main',
          serverId: 'uuid-1',
          createdAt: 3000,
        },
      },
      sessionAliases: {
        'agent:main:main': 'Default',
        'agent:main:work': 'Work Chat',
      },
    })

    expect(backup.version).toBe(2)
    expect(backup.exportedAt).toBeDefined()
    expect(backup.servers).toHaveLength(1)
    expect(backup.servers[0].name).toBe('My Server')
    expect(backup.favorites).toHaveLength(1)
    expect(backup.favorites[0].text).toBe('Hello world')
    expect(Object.keys(backup.triggers)).toHaveLength(1)
    expect(Object.keys(backup.sessionAliases)).toHaveLength(2)
  })

  it('excludes sensitive data from servers', () => {
    const backup = buildFullBackup({
      servers: {
        'uuid-1': {
          id: 'uuid-1',
          name: 'My Server',
          url: 'https://example.com',
          providerType: 'openai',
          createdAt: 1000,
        },
      },
      favorites: [],
      triggers: {},
      sessionAliases: {},
    })

    const exported = backup.servers[0]
    // Token should not be included (it's not part of the export shape)
    expect(exported).not.toHaveProperty('token')
    expect(exported).not.toHaveProperty('password')
  })

  it('sorts servers by createdAt', () => {
    const backup = buildFullBackup({
      servers: {
        b: {
          id: 'b',
          name: 'Second',
          url: 'https://b.com',
          providerType: 'openai',
          createdAt: 2000,
        },
        a: {
          id: 'a',
          name: 'First',
          url: 'https://a.com',
          providerType: 'claude',
          createdAt: 1000,
        },
      },
      favorites: [],
      triggers: {},
      sessionAliases: {},
    })

    expect(backup.servers[0].name).toBe('First')
    expect(backup.servers[1].name).toBe('Second')
  })
})

describe('parseBackup', () => {
  it('parses a valid v2 backup', () => {
    const input = {
      version: 2,
      exportedAt: '2024-01-01T00:00:00.000Z',
      servers: [
        { id: 'a', name: 'Test', url: 'https://a.com', providerType: 'claude', createdAt: 1000 },
      ],
      favorites: [{ id: 'fav-1', text: 'hi', sender: 'agent', savedAt: 2000 }],
      triggers: {
        slug1: { id: 'slug1', message: 'msg', sessionKey: 'sk', serverId: 'a', createdAt: 1000 },
      },
      sessionAliases: { 'agent:main:main': 'Default' },
    }

    const result = parseBackup(input)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(2)
    expect(result!.servers).toHaveLength(1)
    expect(result!.favorites).toHaveLength(1)
    expect(Object.keys(result!.triggers)).toHaveLength(1)
    expect(Object.keys(result!.sessionAliases)).toHaveLength(1)
  })

  it('parses a v1 backup (servers-only) with defaults for new fields', () => {
    const input = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      servers: [
        { id: 'a', name: 'Test', url: 'https://a.com', providerType: 'claude', createdAt: 1000 },
      ],
    }

    const result = parseBackup(input)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(2) // Upgraded to v2
    expect(result!.servers).toHaveLength(1)
    expect(result!.favorites).toEqual([])
    expect(result!.triggers).toEqual({})
    expect(result!.sessionAliases).toEqual({})
  })

  it('returns null for invalid input', () => {
    expect(parseBackup(null)).toBeNull()
    expect(parseBackup(undefined)).toBeNull()
    expect(parseBackup('string')).toBeNull()
    expect(parseBackup(42)).toBeNull()
    expect(parseBackup({ version: 3 })).toBeNull()
    expect(parseBackup({ version: 1 })).toBeNull() // Missing servers array
  })
})
