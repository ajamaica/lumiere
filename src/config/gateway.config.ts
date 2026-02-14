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

/** Well-known gateway RPC method names. */
export const GatewayMethods = {
  CONNECT: 'connect',
  HEALTH: 'health',
  STATUS: 'status',
  CHAT_SEND: 'chat.send',
  CHAT_HISTORY: 'chat.history',
  CHAT_ABORT: 'chat.abort',
  SESSIONS_LIST: 'sessions.list',
  SESSIONS_RESET: 'sessions.reset',
  SESSIONS_DELETE: 'sessions.delete',
  CRON_STATUS: 'cron.status',
  CRON_LIST: 'cron.list',
  CRON_UPDATE: 'cron.update',
  CRON_RUN: 'cron.run',
  CRON_REMOVE: 'cron.remove',
  CRON_RUNS: 'cron.runs',
  SKILLS_TEACH: 'skills.teach',
  SKILLS_LIST: 'skills.list',
  SKILLS_REMOVE: 'skills.remove',
  SKILLS_UPDATE: 'skills.update',
  LOGS_TAIL: 'logs.tail',
  AGENT: 'agent',
  SESSIONS_SPAWN: 'sessions.spawn',
  SUBAGENTS_LIST: 'subagents.list',
  SUBAGENTS_STOP: 'subagents.stop',
} as const

/** Well-known gateway event names. */
export const GatewayEvents = {
  AGENT: 'agent',
  CHAT: 'chat',
  PRESENCE: 'presence',
  TICK: 'tick',
  SHUTDOWN: 'shutdown',
  HEALTH: 'health',
  SEQ_GAP: 'seq.gap',
  SUBAGENT: 'subagent',
  CONNECT_CHALLENGE: 'connect.challenge',
  DEVICE_PAIR_REQUESTED: 'device.pair.requested',
  DEVICE_PAIR_RESOLVED: 'device.pair.resolved',
} as const
