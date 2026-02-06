import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { execFileSyncMock, hasQmdMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  hasQmdMock: vi.fn(),
}))

let mockStats = { documents: 0, categories: {} as Record<string, number> }
let mockCollection = 'vault'
let mockRoot = ''

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock,
}))

vi.mock('../lib/search.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/search.js')>('../lib/search.js')
  return {
    ...actual,
    hasQmd: hasQmdMock,
  }
})

vi.mock('../lib/vault.js', () => ({
  ClawVault: class {
    private vaultPath: string

    constructor(vaultPath: string) {
      this.vaultPath = vaultPath
    }

    async load(): Promise<void> {
      return
    }

    async stats(): Promise<{ documents: number; categories: Record<string, number> }> {
      return mockStats
    }

    getPath(): string {
      return this.vaultPath
    }

    getName(): string {
      return mockCollection
    }

    getQmdCollection(): string {
      return mockCollection
    }

    getQmdRoot(): string {
      return mockRoot || this.vaultPath
    }
  },
}))

import { QmdUnavailableError } from '../lib/search.js'
import { formatStatus, getStatus } from './status.js'

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-status-'))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('status command', () => {
  it('throws when qmd is unavailable', async () => {
    hasQmdMock.mockReturnValue(false)
    await expect(getStatus('/tmp/vault')).rejects.toBeInstanceOf(QmdUnavailableError)
  })

  it('reports issues when checkpoint is missing and git/qmd are dirty', async () => {
    hasQmdMock.mockReturnValue(true)
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'qmd') {
        return JSON.stringify([{ name: 'other', root: '/somewhere' }])
      }
      if (command === 'git') {
        return ' M file.md\n?? new.md\n'
      }
      return ''
    })

    const vaultPath = makeTempVaultDir()
    try {
      fs.mkdirSync(path.join(vaultPath, '.git'), { recursive: true })
      const clawvaultDir = path.join(vaultPath, '.clawvault')
      fs.mkdirSync(clawvaultDir, { recursive: true })
      fs.writeFileSync(path.join(clawvaultDir, 'dirty-death.flag'), '2024-01-01T00:00:00Z')

      mockStats = { documents: 2, categories: { inbox: 2 } }
      mockCollection = 'vault'
      mockRoot = vaultPath

      const status = await getStatus(vaultPath)
      expect(status.health).toBe('warning')
      expect(status.issues).toEqual(
        expect.arrayContaining([
          'No checkpoint found',
          'Dirty death flag is set',
          'qmd collection missing',
          'Uncommitted changes: 2',
        ]),
      )
      expect(status.git?.dirtyCount).toBe(2)
      expect(status.qmd.indexStatus).toBe('missing')
      expect(status.links.total).toBe(0)
      expect(status.links.orphans).toBe(0)
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })

  it('returns ok status when everything is healthy', async () => {
    hasQmdMock.mockReturnValue(true)
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'qmd') {
        return JSON.stringify([{ name: mockCollection, root: mockRoot }])
      }
      if (command === 'git') {
        return ''
      }
      return ''
    })

    const vaultPath = makeTempVaultDir()
    try {
      fs.mkdirSync(path.join(vaultPath, '.git'), { recursive: true })
      const clawvaultDir = path.join(vaultPath, '.clawvault')
      fs.mkdirSync(clawvaultDir, { recursive: true })
      const timestamp = new Date(Date.now() - 60_000).toISOString()
      fs.writeFileSync(
        path.join(clawvaultDir, 'last-checkpoint.json'),
        JSON.stringify({ timestamp, workingOn: 'sync', focus: null, blocked: null }, null, 2),
      )

      mockStats = { documents: 1, categories: { inbox: 1 } }
      mockCollection = 'vault'
      mockRoot = vaultPath

      const status = await getStatus(vaultPath)
      expect(status.health).toBe('ok')
      expect(status.issues).toHaveLength(0)
      expect(status.checkpoint.exists).toBe(true)
      expect(status.qmd.indexStatus).toBe('present')
      expect(status.links.total).toBe(0)
      expect(status.links.orphans).toBe(0)
      const formatted = formatStatus(status)
      expect(formatted).toContain('Issues: none')
      expect(formatted).toContain('Links:')
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })
})
