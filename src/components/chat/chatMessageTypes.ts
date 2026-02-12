export interface MessageAttachment {
  type: 'image' | 'video' | 'file'
  uri: string
  base64?: string
  mimeType?: string
  name?: string
}

export interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  streaming?: boolean
  attachments?: MessageAttachment[]
}
