import { API_CONFIG, DEFAULT_MODELS, OPENAI_IMAGE_MODELS } from '../../constants'
import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  ProviderConfig,
  SendMessageParams,
} from '../providers/types'

/** Prefix users can type to generate an image inline (e.g. "/image a sunset") */
const IMAGE_COMMAND_PREFIX = '/image '

interface OpenAIImageResponse {
  data: Array<{
    b64_json?: string
    url?: string
    revised_prompt?: string
  }>
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | OpenAIContentPart[]
}

type OpenAIContentPart = OpenAITextPart | OpenAIImagePart

interface OpenAITextPart {
  type: 'text'
  text: string
}

interface OpenAIImagePart {
  type: 'image_url'
  image_url: {
    url: string
  }
}

interface OpenAIStreamChunk {
  id: string
  choices: Array<{
    delta: {
      content?: string
      role?: string
    }
    finish_reason: string | null
  }>
  error?: {
    message: string
  }
}

/**
 * Chat provider for the OpenAI Chat Completions API.
 *
 * Uses the /v1/chat/completions endpoint with streaming support
 * for real-time response delivery. Compatible with OpenAI and
 * any OpenAI-compatible API (e.g. Azure OpenAI, local proxies).
 */
export class OpenAIChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: true,
    imageGeneration: true,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private baseUrl: string
  private apiKey: string
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private activeXhr: XMLHttpRequest | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, OpenAIMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.OPENAI
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok && response.status !== 401) {
        throw new Error(`API returned status ${response.status}`)
      }

      // 401 means the endpoint exists but key is wrong; we still consider
      // this a successful "connection test" for URL reachability, but
      // actual auth errors will surface on first message send.
      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Cannot connect to OpenAI API. Check your API key and endpoint.')
    }
  }

  disconnect(): void {
    if (this.activeXhr) {
      this.activeXhr.abort()
      this.activeXhr = null
    }
    this.connected = false
    this.notifyConnectionState(false, false)
  }

  isConnected(): boolean {
    return this.connected
  }

  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean) => void,
  ): () => void {
    this.connectionListeners.push(listener)
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener)
    }
  }

  private notifyConnectionState(connected: boolean, reconnecting: boolean) {
    this.connectionListeners.forEach((l) => l(connected, reconnecting))
  }

  private getSessionMessages(sessionKey: string): OpenAIMessage[] {
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, [])
    }
    return this.sessions.get(sessionKey)!
  }

  /**
   * Check whether the configured model is a known image generation model.
   */
  private isImageModel(): boolean {
    return OPENAI_IMAGE_MODELS.some((prefix) => this.model.startsWith(prefix))
  }

  /**
   * Determine whether a message should be routed to image generation.
   * Returns the image prompt (stripped of the /image prefix) or null.
   */
  private getImagePrompt(message: string): string | null {
    // If the model is an image model, every message is an image prompt
    if (this.isImageModel()) {
      return message
    }
    // Otherwise, detect the /image command prefix
    if (message.toLowerCase().startsWith(IMAGE_COMMAND_PREFIX)) {
      return message.slice(IMAGE_COMMAND_PREFIX.length).trim()
    }
    return null
  }

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const imagePrompt = this.getImagePrompt(params.message)

    if (imagePrompt) {
      return this.sendImageGeneration(params, imagePrompt, onEvent)
    }

    return this.sendChatMessage(params, onEvent)
  }

  /**
   * Generate an image using the OpenAI Images API.
   */
  private async sendImageGeneration(
    params: SendMessageParams,
    prompt: string,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const messages = this.getSessionMessages(params.sessionKey)

    // Record the user message in session history
    messages.push({ role: 'user', content: params.message })

    onEvent({ type: 'lifecycle', phase: 'start' })

    try {
      const imageModel = this.isImageModel() ? this.model : DEFAULT_MODELS.OPENAI_IMAGE

      const response = await fetch(`${this.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: imageModel,
          prompt,
          n: 1,
          size: API_CONFIG.OPENAI_IMAGE_SIZE,
          quality: API_CONFIG.OPENAI_IMAGE_QUALITY,
          response_format: 'b64_json',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Image generation failed: ${response.status} - ${errorText}`)
      }

      const result: OpenAIImageResponse = await response.json()
      const imageData = result.data?.[0]

      if (!imageData?.b64_json) {
        throw new Error('No image data returned from API')
      }

      const dataUri = `data:image/png;base64,${imageData.b64_json}`

      // Emit the generated image event
      onEvent({
        type: 'image',
        image: {
          url: dataUri,
          revisedPrompt: imageData.revised_prompt,
        },
      })

      // If the API revised the prompt, also emit it as text
      if (imageData.revised_prompt) {
        onEvent({ type: 'delta', delta: imageData.revised_prompt })
      }

      // Store assistant response in session history
      messages.push({
        role: 'assistant',
        content: imageData.revised_prompt || `[Generated image for: ${prompt}]`,
      })

      onEvent({ type: 'lifecycle', phase: 'end' })
    } catch (err) {
      onEvent({ type: 'lifecycle', phase: 'end' })
      throw err
    }
  }

  /**
   * Send a regular chat completion message with streaming.
   */
  private async sendChatMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const messages = this.getSessionMessages(params.sessionKey)

    // Build the user message content
    const contentParts: OpenAIContentPart[] = []

    if (params.message) {
      contentParts.push({ type: 'text', text: params.message })
    }

    // Add image attachments if present
    if (params.attachments?.length) {
      for (const attachment of params.attachments) {
        if (attachment.type === 'image' && attachment.data) {
          const mimeType = attachment.mimeType || 'image/png'
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${attachment.data}`,
            },
          })
        }
      }
    }

    const userMsg: OpenAIMessage = {
      role: 'user',
      content:
        contentParts.length === 1 && contentParts[0].type === 'text'
          ? contentParts[0].text
          : contentParts,
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    // Use XMLHttpRequest for streaming — React Native's fetch does not
    // support response.body ReadableStream, so XHR with onprogress is
    // the reliable way to receive incremental SSE data.
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      this.activeXhr = xhr

      let fullResponse = ''
      let lastIndex = 0

      xhr.open('POST', `${this.baseUrl}/v1/chat/completions`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`)

      xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length

        const lines = newData.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const chunk: OpenAIStreamChunk = JSON.parse(data)

              if (chunk.error) {
                reject(new Error(chunk.error.message || 'Stream error'))
                xhr.abort()
                return
              }

              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                fullResponse += delta
                onEvent({ type: 'delta', delta })
              }
            } catch {
              // Ignore JSON parse errors from partial chunks
            }
          }
        }
      }

      xhr.onload = () => {
        this.activeXhr = null
        if (xhr.status >= 200 && xhr.status < 300) {
          if (fullResponse) {
            messages.push({ role: 'assistant', content: fullResponse })
          }
          onEvent({ type: 'lifecycle', phase: 'end' })
          resolve()
        } else {
          onEvent({ type: 'lifecycle', phase: 'end' })
          reject(new Error(`API error: ${xhr.status} - ${xhr.responseText}`))
        }
      }

      xhr.onerror = () => {
        this.activeXhr = null
        onEvent({ type: 'lifecycle', phase: 'end' })
        reject(new Error('Network error'))
      }

      xhr.onabort = () => {
        this.activeXhr = null
        onEvent({ type: 'lifecycle', phase: 'end' })
        resolve()
      }

      xhr.send(
        JSON.stringify({
          model: this.model,
          max_tokens: API_CONFIG.OPENAI_MAX_TOKENS,
          messages: messages.map(this.formatMessageForApi),
          stream: true,
        }),
      )
    })
  }

  private formatMessageForApi(msg: OpenAIMessage): { role: string; content: unknown } {
    return {
      role: msg.role,
      content: msg.content,
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced
      .filter(
        (m): m is OpenAIMessage & { role: 'user' | 'assistant' } =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m, i) => ({
        role: m.role,
        content: [{ type: 'text', text: this.extractTextContent(m.content) }],
        timestamp: Date.now() - (sliced.length - i) * 1000,
      }))

    return { messages: historyMessages }
  }

  private extractTextContent(content: string | OpenAIContentPart[]): string {
    if (typeof content === 'string') {
      return content
    }
    const textParts = content.filter((p): p is OpenAITextPart => p.type === 'text' && !!p.text)
    return textParts.map((p) => p.text).join('\n')
  }

  async resetSession(sessionKey: string): Promise<void> {
    this.sessions.delete(sessionKey)
  }

  async listSessions(): Promise<unknown> {
    return {
      sessions: Array.from(this.sessions.keys()).map((key) => ({
        key,
        messageCount: this.sessions.get(key)?.length ?? 0,
      })),
    }
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok) {
        return { status: 'healthy' }
      }
      return { status: 'degraded' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
