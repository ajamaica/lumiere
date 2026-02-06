import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { checkDirtyDeathMock, clearDirtyFlagMock } = vi.hoisted(() => ({
  checkDirtyDeathMock: vi.fn(),
  clearDirtyFlagMock: vi.fn(),
}))

vi.mock('./checkpoint.js', () => ({
  checkDirtyDeath: checkDirtyDeathMock,
  clearDirtyFlag: clearDirtyFlagMock,
}))

import { formatRecoveryInfo, recover } from './recover.js'

function makeTempVaultDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawvault-recover-'))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('recover', () => {
  it('returns clean startup info when no death is detected', async () => {
    checkDirtyDeathMock.mockResolvedValue({
      died: false,
      checkpoint: null,
      deathTime: null,
    })

    const info = await recover('/tmp/vault')
    expect(info.died).toBe(false)
    expect(info.recoveryMessage).toBe('No context death detected. Clean startup.')
    expect(clearDirtyFlagMock).not.toHaveBeenCalled()
  })

  it('returns the latest handoff and clears the flag when requested', async () => {
    checkDirtyDeathMock.mockResolvedValue({
      died: true,
      deathTime: '2024-01-01T00:00:00Z',
      checkpoint: {
        timestamp: '2024-01-01T00:00:00Z',
        workingOn: 'feature',
        focus: 'tests',
        blocked: null,
      },
    })

    const vaultPath = makeTempVaultDir()
    try {
      const handoffsDir = path.join(vaultPath, 'handoffs')
      fs.mkdirSync(handoffsDir, { recursive: true })
      fs.writeFileSync(path.join(handoffsDir, 'handoff-2024-01-01.md'), 'old handoff')
      fs.writeFileSync(path.join(handoffsDir, 'handoff-2024-01-02.md'), 'latest handoff')

      const info = await recover(vaultPath, { clearFlag: true })
      expect(info.died).toBe(true)
      expect(info.handoffPath).toBe(path.join(handoffsDir, 'handoff-2024-01-02.md'))
      expect(info.handoffContent).toBe('latest handoff')
      expect(info.recoveryMessage).toContain('CONTEXT DEATH DETECTED')
      expect(clearDirtyFlagMock).toHaveBeenCalledWith(vaultPath)
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })
})

describe('formatRecoveryInfo', () => {
  it('includes verbose checkpoint and handoff content when requested', () => {
    const info = {
      died: true,
      deathTime: '2024-01-01T00:00:00Z',
      checkpoint: {
        timestamp: '2024-01-01T00:00:00Z',
        workingOn: 'feature',
        focus: 'tests',
        blocked: null,
        sessionKey: 'key',
        model: 'model',
        tokenEstimate: 100,
      },
      handoffPath: '/tmp/vault/handoffs/handoff-2024-01-01.md',
      handoffContent: 'handoff text',
      recoveryMessage: 'message',
    }

    const output = formatRecoveryInfo(info, { verbose: true })
    expect(output).toContain('Checkpoint JSON:')
    expect(output).toContain('"sessionKey": "key"')
    expect(output).toContain('Handoff content:')
    expect(output).toContain('handoff text')
  })
})
