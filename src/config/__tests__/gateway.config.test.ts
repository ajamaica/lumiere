import { agentConfig, clientConfig, protocolConfig } from '../gateway.config'

describe('clientConfig', () => {
  it('has the expected shape', () => {
    expect(clientConfig).toEqual({
      id: 'openclaw-ios',
      mode: 'webchat',
      version: '1.1.0',
      platform: 'ios',
    })
  })
})

describe('protocolConfig', () => {
  it('has matching min and max protocol', () => {
    expect(protocolConfig.minProtocol).toBe(3)
    expect(protocolConfig.maxProtocol).toBe(3)
    expect(protocolConfig.maxProtocol).toBeGreaterThanOrEqual(protocolConfig.minProtocol)
  })
})

describe('agentConfig', () => {
  it('has a default agent ID', () => {
    expect(agentConfig.defaultAgentId).toBe('main')
  })

  it('has a default session key matching the pattern', () => {
    expect(agentConfig.defaultSessionKey).toMatch(/^agent:.+:.+$/)
  })

  it('has a default model', () => {
    expect(agentConfig.defaultModel).toBeDefined()
    expect(typeof agentConfig.defaultModel).toBe('string')
  })
})
