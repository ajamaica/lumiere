import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listEvents } from '../lib/api.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

describe('Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listEvents', () => {
    it('should list events for a recording', async () => {
      const events = await listEvents(1, 100)
      expect(events).toBeDefined()
      expect(Array.isArray(events)).toBe(true)
    })

    it('should handle empty event list', async () => {
      const events = await listEvents(1, 999)
      expect(Array.isArray(events)).toBe(true)
    })

    it('should include event details', async () => {
      const events = await listEvents(1, 100)
      if (events.length > 0) {
        const event = events[0]
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('recording_id')
        expect(event).toHaveProperty('action')
        expect(event).toHaveProperty('created_at')
        expect(event).toHaveProperty('creator')
      }
    })

    it('should handle API errors', async () => {
      await expect(listEvents(999, 999)).rejects.toThrow()
    })
  })
})
