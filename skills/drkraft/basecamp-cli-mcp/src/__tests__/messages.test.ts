import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMessage, getMessage, listMessages } from '../lib/api.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

describe('Messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list messages for a project message board', async () => {
    const messages = await listMessages(2)
    expect(Array.isArray(messages)).toBe(true)
    expect(messages[0]?.subject).toBe('Test Message')
  })

  it('should fetch a message by ID', async () => {
    const message = await getMessage(2, 1)
    expect(message).toBeDefined()
    expect(message.subject).toBe('Test Message')
  })

  it('should create a new message', async () => {
    const message = await createMessage(2, 'New Message', '<p>Body</p>')
    expect(message).toBeDefined()
    expect(message.subject).toBe('New Message')
  })
})
