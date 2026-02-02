export const clientConfig = {
  id: 'lumiere-mobile',
  mode: 'node',
  version: '1.0.0',
  platform: 'ios',
} as const

export const protocolConfig = {
  minProtocol: 3,
  maxProtocol: 3,
} as const

export const agentConfig = {
  defaultAgentId: 'main',
  defaultSessionKey: 'agent:main:main',
  defaultModel: 'claude-sonnet-4-5',
} as const

export const nodeConfig = {
  defaultName: 'Lumiere Mobile',
  caps: ['canvas', 'chat'],
  pairingTimeoutMs: 5 * 60 * 1000, // 5 minutes
} as const
