import { DEFAULT_SESSION_KEY } from '../index'

describe('DEFAULT_SESSION_KEY', () => {
  it('follows the agent:<agentId>:<sessionName> format', () => {
    expect(DEFAULT_SESSION_KEY).toMatch(/^agent:.+:.+$/)
  })

  it('has the expected default value', () => {
    expect(DEFAULT_SESSION_KEY).toBe('agent:main:main')
  })
})
