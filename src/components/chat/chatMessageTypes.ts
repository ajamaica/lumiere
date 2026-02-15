export interface MessageAttachment {
  type: 'image' | 'video' | 'file'
  uri: string
  base64?: string
  mimeType?: string
  name?: string
}

export interface TextMessage {
  id: string
  type?: 'text'
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  streaming?: boolean
  attachments?: MessageAttachment[]
}

export interface ToolEventMessage {
  id: string
  type: 'tool_event'
  toolName: string
  toolCallId: string
  toolInput?: Record<string, unknown>
  status: 'running' | 'completed' | 'error'
  sender: 'agent'
  timestamp: Date
  text: string
}

export interface LifecycleEventMessage {
  id: string
  type: 'lifecycle_event'
  phase: 'start' | 'end'
  sender: 'agent'
  timestamp: Date
  text: string
}

export type Message = TextMessage | ToolEventMessage | LifecycleEventMessage
