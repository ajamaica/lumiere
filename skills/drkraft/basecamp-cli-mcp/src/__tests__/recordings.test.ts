import { beforeEach, describe, expect, it, vi } from 'vitest'

import { archiveRecording, listRecordings, restoreRecording, trashRecording } from '../lib/api.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

describe('Recordings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listRecordings', () => {
    it('should list recordings by type', async () => {
      const recordings = await listRecordings('Todo')
      expect(recordings).toBeDefined()
      expect(Array.isArray(recordings)).toBe(true)
    })

    it('should support bucket filter', async () => {
      const recordings = await listRecordings('Message', { bucket: [1, 2, 3] })
      expect(recordings).toBeDefined()
      expect(Array.isArray(recordings)).toBe(true)
    })

    it('should support status filter', async () => {
      const recordings = await listRecordings('Document', { status: 'archived' })
      expect(recordings).toBeDefined()
      expect(Array.isArray(recordings)).toBe(true)
    })

    it('should support sort options', async () => {
      const recordings = await listRecordings('Upload', {
        sort: 'updated_at',
        direction: 'asc',
      })
      expect(recordings).toBeDefined()
      expect(Array.isArray(recordings)).toBe(true)
    })

    it('should handle all options together', async () => {
      const recordings = await listRecordings('Comment', {
        bucket: [1, 2],
        status: 'active',
        sort: 'created_at',
        direction: 'desc',
      })
      expect(recordings).toBeDefined()
      expect(Array.isArray(recordings)).toBe(true)
    })
  })

  describe('archiveRecording', () => {
    it('should archive a recording', async () => {
      await expect(archiveRecording(1, 100)).resolves.toBeUndefined()
    })

    it('should handle archive errors', async () => {
      await expect(archiveRecording(999, 999)).rejects.toThrow()
    })
  })

  describe('restoreRecording', () => {
    it('should restore a recording', async () => {
      await expect(restoreRecording(1, 100)).resolves.toBeUndefined()
    })

    it('should handle restore errors', async () => {
      await expect(restoreRecording(999, 999)).rejects.toThrow()
    })
  })

  describe('trashRecording', () => {
    it('should trash a recording', async () => {
      await expect(trashRecording(1, 100)).resolves.toBeUndefined()
    })

    it('should handle trash errors', async () => {
      await expect(trashRecording(999, 999)).rejects.toThrow()
    })
  })
})
