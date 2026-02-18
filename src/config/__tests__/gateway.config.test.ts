import { agentConfig, clientConfig, protocolConfig, roleConfig } from '../gateway.config'

describe('clientConfig', () => {
  it('has the expected shape', () => {
    expect(clientConfig).toMatchObject({
      id: 'lumiere',
      displayName: 'Lumiere',
      mode: 'ui',
      version: '1.0.0',
    })
    expect(clientConfig.platform).toBeDefined()
    expect(clientConfig.instanceId).toBeDefined()
  })
})

describe('protocolConfig', () => {
  it('has matching min and max protocol', () => {
    expect(protocolConfig.minProtocol).toBe(3)
    expect(protocolConfig.maxProtocol).toBe(3)
    expect(protocolConfig.maxProtocol).toBeGreaterThanOrEqual(protocolConfig.minProtocol)
  })
})

describe('roleConfig', () => {
  it('has operator role with admin scope', () => {
    expect(roleConfig.role).toBe('operator')
    expect(roleConfig.scopes).toContain('operator.admin')
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
