import { DEFAULT_SESSION_KEY } from '../constants'

export const clientConfig = {
  id: 'cli',
  mode: 'cli',
  version: '1.0.0',
  platform: 'ios',
} as const

export const protocolConfig = {
  minProtocol: 3,
  maxProtocol: 3,
} as const

export const agentConfig = {
  defaultAgentId: 'main',
  defaultSessionKey: DEFAULT_SESSION_KEY,
  defaultModel: 'claude-sonnet-4-5',
} as const
