// ─── Mission types ───────────────────────────────────────

export type MissionStatus =
  | 'pending'
  | 'in_progress'
  | 'idle'
  | 'completed'
  | 'error'
  | 'stopped'
  | 'archived'

/** A sub-agent run spawned for a subtask. */
export interface SubtaskSubagent {
  runId: string
  childSessionKey: string
  task: string
  status: 'running' | 'completed' | 'error'
  result?: string
  spawnedAt: number
  completedAt?: number
}

export interface MissionSubtask {
  id: string
  title: string
  description?: string
  status: MissionStatus
  result?: string
  /** Sub-agents spawned for this subtask. */
  subagents?: SubtaskSubagent[]
}

export interface Mission {
  id: string
  title: string
  prompt: string
  systemMessage: string
  sessionKey: string
  status: MissionStatus
  subtasks: MissionSubtask[]
  conclusion?: string
  skills: string[]
  createdAt: number
  updatedAt: number
  errorMessage?: string
}

export interface MissionsDict {
  [id: string]: Mission
}

// ─── Serializable message types for persistence ─────────────

export interface SerializedTextMessage {
  id: string
  type?: 'text'
  text: string
  sender: 'user' | 'agent'
  timestamp: number
}

export interface SerializedToolEventMessage {
  id: string
  type: 'tool_event'
  toolName: string
  toolCallId: string
  toolInput?: Record<string, unknown>
  status: 'running' | 'completed' | 'error'
  sender: 'agent'
  timestamp: number
  text: string
}

export type SerializedMessage = SerializedTextMessage | SerializedToolEventMessage

export interface MissionMessagesDict {
  [missionId: string]: SerializedMessage[]
}
