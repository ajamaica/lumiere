import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { hasQmdMock } = vi.hoisted(() => ({
  hasQmdMock: vi.fn(),
}))

vi.mock('../lib/search.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/search.js')>('../lib/search.js')
  return {
    ...actual,
    hasQmd: hasQmdMock,
  }
})

import { setupCommand } from './setup.js'

describe('setup command', () => {
  let baseDir: string
  let vaultPath: string

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-setup-'))
    vaultPath = path.join(baseDir, 'vault')
    process.env.CLAWVAULT_PATH = vaultPath
  })

  afterEach(() => {
    delete process.env.CLAWVAULT_PATH
    fs.rmSync(baseDir, { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it('creates a vault at CLAWVAULT_PATH when set', async () => {
    hasQmdMock.mockReturnValue(false)
    // Ensure the path doesn't exist before setup
    expect(fs.existsSync(vaultPath)).toBe(false)
    await setupCommand()
    // CLAWVAULT_PATH should be used even if OpenClaw default exists
    expect(fs.existsSync(vaultPath)).toBe(true)
    expect(fs.existsSync(path.join(vaultPath, '.clawvault.json'))).toBe(true)
    expect(fs.existsSync(path.join(vaultPath, 'inbox'))).toBe(true)
  })
})
