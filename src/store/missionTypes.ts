// ─── Mission types ───────────────────────────────────────

export type MissionStatus = 'pending' | 'in_progress' | 'idle' | 'completed' | 'error'

export interface MissionSubtask {
  id: string
  title: string
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
