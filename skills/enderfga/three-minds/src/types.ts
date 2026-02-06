/**
 * Three Minds v2 - 类型定义
 */

export interface AgentPersona {
  name: string // 显示名称
  emoji: string // 标识 emoji
  persona: string // 人设描述（会作为 system prompt 的一部分）
}

export interface CouncilConfig {
  name: string
  agents: AgentPersona[]
  maxRounds: number
  projectDir: string // 共享工作目录
}

export interface AgentResponse {
  agent: string
  round: number
  content: string // agent 的回复
  consensus: boolean // 是否投票结束
  sessionKey: string // 子 session key
  timestamp: string
}

export interface CouncilSession {
  id: string
  task: string // 任务描述
  config: CouncilConfig
  responses: AgentResponse[]
  status: 'running' | 'consensus' | 'max_rounds' | 'error'
  startTime: string
  endTime?: string
  finalSummary?: string
}

export interface SpawnResult {
  status: string
  childSessionKey: string
  runId: string
}

export interface SessionHistoryMessage {
  role: string
  content: string
}
