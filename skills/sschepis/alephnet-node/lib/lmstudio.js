/**
 * LMStudio API Client
 *
 * Connects to LMStudio's OpenAI-compatible API for local LLM inference.
 * Supports both regular and streaming chat completions.
 */

const http = require('http')
const https = require('https')

/**
 * Clean LLM control tokens and structured output syntax from output
 * These tokens are used by some models (Qwen, LLaMA variants) for structured output
 * but should not appear in the final response
 */
function cleanControlTokens(text, isStreaming = false) {
  if (!text || typeof text !== 'string') return text

  // Pattern for control tokens like <|channel|>, <|constrain|>, <|message|>, <|im_start|>, etc.
  // Replace with a space to avoid merging adjacent words
  const controlTokenPattern = /<\|[^|>]+\|>/g

  // Clean the tokens - replace with space to preserve word boundaries
  let cleaned = text.replace(controlTokenPattern, ' ')

  // Clean concatenated structured output patterns (tokens get joined together)
  // Pattern: "commentaryto=functions/..." or "systemto=..."
  cleaned = cleaned.replace(/\b(commentary|system|user|assistant|tool)to=\S*/gi, ' ')

  // Pattern: "channel_name to=target" with space
  cleaned = cleaned.replace(/\b(commentary|system|user|assistant|tool)\s+to=[^\s]+/gi, ' ')

  // Pattern: "json{" or "json[" - constrain type immediately before JSON
  cleaned = cleaned.replace(/\bjson\s*(?=[\[{])/gi, '')

  // Pattern: "to=functions/something" anywhere (standalone)
  cleaned = cleaned.replace(/\bto=\S+/g, ' ')

  // Pattern: standalone channel names ONLY at start of line followed by colon or specific markers
  // This targets control tokens like "user:" or "assistant:" at line starts, not normal word usage
  cleaned = cleaned.replace(/^\s*(commentary|system|user|assistant|tool)\s*:/gim, ' ')

  // Pattern: channel names followed by message markers (from structured output)
  // e.g., "user message:" or "assistant response:"
  cleaned = cleaned.replace(
    /\b(commentary|system|user|assistant|tool)\s+(message|response|output|input)\s*:/gi,
    ' ',
  )

  // If streaming, we skip the aggressive JSON detection and whitespace normalization
  // because we might only have a partial chunk
  if (isStreaming) {
    return cleaned
  }

  // If the remaining content is primarily a JSON object (tool call), return empty
  const trimmed = cleaned.trim()
  if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed)
      // If it looks like a tool call JSON (has specific tool-related keys)
      if (
        parsed.path ||
        parsed.command ||
        parsed.arguments ||
        parsed.function ||
        parsed.tool ||
        parsed.name ||
        parsed.input
      ) {
        return ''
      }
    } catch (e) {
      // Not valid JSON, keep it
    }
  }

  // If content starts with JSON that looks like a tool call, remove it
  cleaned = cleaned.replace(/^\s*\{"path"\s*:\s*"[^"]*"\s*\}\s*/g, '')
  cleaned = cleaned.replace(/^\s*\{[^}]*"function"\s*:[^}]*\}\s*/g, '')

  // Clean up excessive newlines but PRESERVE internal spacing for markdown tables/code
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Multiple newlines -> double

  return cleaned.trim()
}

class LMStudioClient {
  /**
   * Create a new LMStudio client
   * @param {Object} options - Configuration options
   * @param {string} options.baseUrl - LMStudio API URL (default: http://localhost:1234/v1)
   * @param {string} options.model - Model identifier (default: 'local-model')
   * @param {number} options.temperature - Sampling temperature (default: 0.7)
   * @param {number} options.maxTokens - Maximum response tokens (default: 2048)
   * @param {number} options.timeout - Request timeout in ms (default: 60000)
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:1234/v1'
    this.model = options.model || 'local-model'
    this.temperature = options.temperature ?? 0.7
    this.maxTokens = options.maxTokens || 32768
    this.timeout = options.timeout || 120000

    // Parse base URL
    const url = new URL(this.baseUrl)
    this.protocol = url.protocol === 'https:' ? https : http
    this.host = url.hostname
    this.port = url.port || (url.protocol === 'https:' ? 443 : 80)
    this.basePath = url.pathname.replace(/\/$/, '')
  }

  /**
   * Make an HTTP request
   * @private
   */
  _request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: `${this.basePath}${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: this.timeout,
      }

      const req = this.protocol.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json)
            } else {
              reject(new Error(json.error?.message || `HTTP ${res.statusCode}`))
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 100)}`))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      if (body) {
        req.write(JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * List available models
   * @returns {Promise<Array>} Array of model objects
   */
  async listModels() {
    const response = await this._request('GET', '/models')
    return response.data || []
  }

  /**
   * Check if LMStudio is connected and responding
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    try {
      await this.listModels()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the current model name (or first available)
   * @returns {Promise<string|null>}
   */
  async getCurrentModel() {
    try {
      const models = await this.listModels()
      if (models.length > 0) {
        return models[0].id
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Send a chat completion request
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Override options for this request
   * @returns {Promise<Object>} Completion response
   */
  async chat(messages, options = {}) {
    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: false,
    }

    if (options.stop) body.stop = options.stop
    if (options.topP !== undefined) body.top_p = options.topP
    if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty
    if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty

    // Add tools support
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice
      }
    }

    const response = await this._request('POST', '/chat/completions', body)

    const message = response.choices?.[0]?.message || {}
    return {
      content: cleanControlTokens(message.content || ''),
      role: message.role || 'assistant',
      toolCalls: message.tool_calls || null,
      finishReason: response.choices?.[0]?.finish_reason,
      usage: response.usage,
    }
  }

  /**
   * Stream a chat completion
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Override options
   * @returns {AsyncGenerator<string>} Yields content chunks or tool calls
   */
  async *streamChat(messages, options = {}) {
    console.log('[LMStudio] streamChat called with', messages.length, 'messages')

    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: true,
    }

    if (options.stop) body.stop = options.stop

    // Add tools support
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice
      }
    }

    console.log(
      '[LMStudio] Request body model:',
      body.model,
      'messages:',
      body.messages.length,
      'stream:',
      body.stream,
    )

    const requestOptions = {
      hostname: this.host,
      port: this.port,
      path: `${this.basePath}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      timeout: this.timeout,
    }

    console.log(
      '[LMStudio] Request options:',
      requestOptions.hostname,
      requestOptions.port,
      requestOptions.path,
    )

    yield* await new Promise((resolve, reject) => {
      console.log('[LMStudio] Creating HTTP request...')

      const req = this.protocol.request(requestOptions, (res) => {
        console.log('[LMStudio] Response status:', res.statusCode)
        console.log('[LMStudio] Response headers:', JSON.stringify(res.headers))

        if (res.statusCode !== 200) {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            console.log('[LMStudio] Error response:', data.substring(0, 500))
            try {
              const json = JSON.parse(data)
              reject(new Error(json.error?.message || `HTTP ${res.statusCode}`))
            } catch {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            }
          })
          return
        }

        // Create async generator from stream
        const generator = (async function* () {
          let buffer = ''
          let toolCallsBuffer = []
          let chunkCount = 0

          console.log('[LMStudio] Starting stream read...')

          for await (const chunk of res) {
            const chunkStr = chunk.toString()
            chunkCount++

            if (chunkCount <= 3) {
              console.log('[LMStudio] Raw chunk #' + chunkCount + ':', chunkStr.substring(0, 200))
            }

            buffer += chunkStr
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  console.log('[LMStudio] Stream complete, total chunks:', chunkCount)
                  // Yield accumulated tool calls at the end
                  if (toolCallsBuffer.length > 0) {
                    yield { type: 'tool_calls', toolCalls: toolCallsBuffer }
                  }
                  return
                }
                try {
                  const json = JSON.parse(data)
                  const delta = json.choices?.[0]?.delta

                  // Handle regular content
                  if (delta?.content) {
                    // Clean control tokens in streaming chunks
                    // Pass true for isStreaming to avoid trimming/collapsing whitespace
                    const cleaned = cleanControlTokens(delta.content, true)
                    if (cleaned) {
                      yield cleaned
                    }
                  }

                  // Handle tool calls
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index || 0
                      if (!toolCallsBuffer[idx]) {
                        toolCallsBuffer[idx] = {
                          id: tc.id,
                          type: 'function',
                          function: { name: '', arguments: '' },
                        }
                      }
                      if (tc.function?.name) {
                        toolCallsBuffer[idx].function.name = tc.function.name
                      }
                      if (tc.function?.arguments) {
                        toolCallsBuffer[idx].function.arguments += tc.function.arguments
                      }
                    }
                  }
                } catch (parseErr) {
                  console.log(
                    '[LMStudio] JSON parse error for data:',
                    data.substring(0, 100),
                    parseErr.message,
                  )
                }
              }
            }
          }

          console.log('[LMStudio] Stream ended, total raw chunks:', chunkCount)
        })()

        resolve(generator)
      })

      req.on('error', (err) => {
        console.log('[LMStudio] Request error:', err.message)
        reject(err)
      })
      req.on('timeout', () => {
        console.log('[LMStudio] Request timeout')
        req.destroy()
        reject(new Error('Stream request timeout'))
      })

      const bodyStr = JSON.stringify(body)
      console.log('[LMStudio] Sending request body, length:', bodyStr.length)
      req.write(bodyStr)
      req.end()
    })
  }

  /**
   * Simple completion (convenience method)
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} Response content
   */
  async complete(prompt, systemPrompt = 'You are a helpful assistant.') {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]
    const response = await this.chat(messages)
    return response.content
  }
}

module.exports = { LMStudioClient }
