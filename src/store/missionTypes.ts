// ─── Mission types ───────────────────────────────────────

export type MissionStatus =
  | 'pending'
  | 'in_progress'
  | 'idle'
  | 'completed'
  | 'error'
  | 'stopped'
  | 'archived'

export interface MissionSubtask {
  id: string
  title: string
  description?: string
  status: MissionStatus
  result?: string
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
