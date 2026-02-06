/**
 * Google Vertex AI Client
 *
 * Connects to Google Vertex AI Gemini API for cloud LLM inference.
 * Supports both regular and streaming chat completions.
 *
 * Authentication priority:
 * 1. Service account JSON file (credentialsPath option or GOOGLE_APPLICATION_CREDENTIALS)
 * 2. gcloud CLI (gcloud auth print-access-token)
 *
 * Environment variables:
 * - GOOGLE_CLOUD_PROJECT: Your GCP project ID
 * - GOOGLE_CLOUD_LOCATION: Region (default: global)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

/**
 * Create a JWT for service account authentication
 */
function createJWT(serviceAccount, scope = 'https://www.googleapis.com/auth/cloud-platform') {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  }

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signatureInput)
  const signature = signer.sign(serviceAccount.private_key, 'base64url')

  return `${signatureInput}.${signature}`
}

/**
 * Exchange JWT for access token
 */
async function getAccessTokenFromServiceAccount(serviceAccount) {
  const jwt = createJWT(serviceAccount)

  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString()

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.access_token) {
            resolve(json.access_token)
          } else {
            reject(new Error(json.error_description || json.error || 'Failed to get token'))
          }
        } catch (e) {
          reject(new Error(`Token response parse error: ${data.substring(0, 100)}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

/**
 * Get access token using service account file, gcloud CLI, or google-auth-library
 * @param {string|null} credentialsPath - Path to service account JSON file
 */
async function getAccessToken(credentialsPath = null) {
  // Priority 1: Use service account JSON if provided
  const credsPath = credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (credsPath && fs.existsSync(credsPath)) {
    try {
      const content = fs.readFileSync(credsPath, 'utf-8')
      const serviceAccount = JSON.parse(content)

      if (serviceAccount.type === 'service_account' && serviceAccount.private_key) {
        console.log('[VertexAI] Authenticating with service account:', serviceAccount.client_email)
        return await getAccessTokenFromServiceAccount(serviceAccount)
      }
    } catch (e) {
      console.warn('[VertexAI] Failed to use service account file:', e.message)
    }
  }

  // Priority 2: Try gcloud CLI
  return new Promise((resolve, reject) => {
    const gcloud = spawn('gcloud', ['auth', 'print-access-token'], {
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    gcloud.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    gcloud.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    gcloud.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        console.log('[VertexAI] Authenticated via gcloud CLI')
        resolve(stdout.trim())
      } else {
        // If gcloud fails, try Google Auth Library (if available)
        try {
          const { GoogleAuth } = require('google-auth-library')
          const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          })
          auth
            .getAccessToken()
            .then((token) => {
              console.log('[VertexAI] Authenticated via google-auth-library')
              resolve(token)
            })
            .catch(() => {
              reject(
                new Error(
                  'Failed to get access token. Either:\n' +
                    '1. Provide service account JSON via --google-creds option\n' +
                    '2. Set GOOGLE_APPLICATION_CREDENTIALS env var\n' +
                    '3. Run: gcloud auth application-default login\n' +
                    `Error: ${stderr}`,
                ),
              )
            })
        } catch (e) {
          reject(
            new Error(
              'Failed to get access token. Provide service account JSON or run: gcloud auth application-default login\n' +
                `Error: ${stderr}`,
            ),
          )
        }
      }
    })

    gcloud.on('error', () => {
      reject(new Error('gcloud CLI not found. Use --google-creds option with service account JSON'))
    })
  })
}

class VertexAIClient {
  /**
   * Create a new Vertex AI client
   * @param {Object} options - Configuration options
   * @param {string} options.projectId - Google Cloud project ID
   * @param {string} options.location - Region (default: global)
   * @param {string} options.model - Model identifier (default: gemini-3-pro-preview)
   * @param {number} options.temperature - Sampling temperature (default: 0.7)
   * @param {number} options.maxTokens - Maximum response tokens (default: 8192)
   * @param {number} options.timeout - Request timeout in ms (default: 120000)
   * @param {string} options.credentialsPath - Path to service account JSON file
   */
  constructor(options = {}) {
    // Handle credentials path - can be absolute or relative
    this.credentialsPath = options.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS

    // If credentials path provided, try to extract project ID from it
    let serviceAccountProjectId = null
    if (this.credentialsPath && fs.existsSync(this.credentialsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf-8'))
        serviceAccountProjectId = creds.project_id
        console.log('[VertexAI] Loaded credentials from:', this.credentialsPath)
        console.log('[VertexAI] Project ID from credentials:', serviceAccountProjectId)
      } catch (e) {
        console.warn('[VertexAI] Failed to read credentials file:', e.message)
      }
    }

    this.projectId =
      options.projectId || process.env.GOOGLE_CLOUD_PROJECT || serviceAccountProjectId
    this.location = options.location || process.env.GOOGLE_CLOUD_LOCATION || 'global'
    this.model = options.model || 'gemini-3-pro-preview'
    this.temperature = options.temperature ?? 0.7
    this.maxTokens = options.maxTokens || 32768
    this.timeout = options.timeout || 120000
    this._accessToken = null
    this._tokenExpiry = 0

    // Construct API endpoint
    // For 'global' location, use aiplatform.googleapis.com without region prefix
    // For regional locations, use {location}-aiplatform.googleapis.com
    if (this.location === 'global') {
      this.apiEndpoint = 'aiplatform.googleapis.com'
    } else {
      this.apiEndpoint = `${this.location}-aiplatform.googleapis.com`
    }

    if (!this.projectId) {
      console.warn(
        '[VertexAI] Warning: No project ID set. Set GOOGLE_CLOUD_PROJECT env var or provide credentials file.',
      )
    }

    console.log('[VertexAI] Initialized with:')
    console.log('[VertexAI]   Project:', this.projectId)
    console.log('[VertexAI]   Location:', this.location)
    console.log('[VertexAI]   Model:', this.model)
    console.log('[VertexAI]   Endpoint:', this.apiEndpoint)
  }

  /**
   * Get a valid access token (refresh if expired)
   * @private
   */
  async _getToken() {
    const now = Date.now()
    // Refresh token if expired or about to expire (within 5 minutes)
    if (!this._accessToken || now >= this._tokenExpiry - 300000) {
      this._accessToken = await getAccessToken(this.credentialsPath)
      // Tokens typically last 1 hour
      this._tokenExpiry = now + 3600000
    }
    return this._accessToken
  }

  /**
   * Make an HTTP request to Vertex AI
   * @private
   */
  async _request(method, path, body = null, stream = false) {
    const token = await this._getToken()

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.apiEndpoint,
        port: 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: stream ? 'text/event-stream' : 'application/json',
        },
        timeout: this.timeout,
      }

      const req = https.request(options, (res) => {
        if (stream) {
          resolve(res)
          return
        }

        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json)
            } else {
              const errorMsg =
                json.error?.message || json.error?.details?.[0]?.message || `HTTP ${res.statusCode}`
              reject(new Error(errorMsg))
            }
          } catch (e) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ raw: data })
            } else {
              reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`))
            }
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
   * Convert OpenAI-style messages to Vertex AI format
   * @private
   */
  _convertMessages(messages) {
    const contents = []
    let systemInstruction = null

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Vertex AI uses systemInstruction separately
        // According to API spec, it needs role and parts
        systemInstruction = {
          role: 'user', // systemInstruction role is typically 'user' in Vertex AI
          parts: [{ text: msg.content }],
        }
      } else {
        // Map 'assistant' to 'model' for Vertex AI
        const role = msg.role === 'assistant' ? 'model' : 'user'

        // Handle tool call results
        if (msg.role === 'tool') {
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: msg.tool_call_id || 'tool_result',
                  response: {
                    content: msg.content,
                  },
                },
              },
            ],
          })
        } else if (msg.tool_calls) {
          // Handle assistant messages with tool calls
          const parts = []
          if (msg.content) {
            parts.push({ text: msg.content })
          }
          for (const tc of msg.tool_calls) {
            parts.push({
              functionCall: {
                name: tc.function?.name,
                args: JSON.parse(tc.function?.arguments || '{}'),
              },
            })
          }
          contents.push({ role, parts })
        } else {
          contents.push({
            role,
            parts: [{ text: msg.content || '' }],
          })
        }
      }
    }

    return { contents, systemInstruction }
  }

  /**
   * Convert OpenAI-style tools to Vertex AI format
   * @private
   */
  _convertTools(tools) {
    if (!tools || tools.length === 0) return null

    const functionDeclarations = tools.map((tool) => {
      const fn = tool.function || tool
      return {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      }
    })

    return [{ functionDeclarations }]
  }

  /**
   * Check if Vertex AI is connected and responding
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    try {
      if (!this.projectId) return false
      await this._getToken()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the current model name
   * @returns {Promise<string|null>}
   */
  async getCurrentModel() {
    return this.model
  }

  /**
   * List available models (simplified - returns configured model)
   * @returns {Promise<Array>}
   */
  async listModels() {
    return [{ id: this.model, name: this.model }]
  }

  /**
   * Send a chat completion request
   * @param {Array<Object>} messages - Array of message objects (OpenAI format)
   * @param {Object} options - Override options for this request
   * @returns {Promise<Object>} Completion response
   */
  async chat(messages, options = {}) {
    const model = options.model || this.model
    const path = `/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`

    const { contents, systemInstruction } = this._convertMessages(messages)

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? this.temperature,
        maxOutputTokens: options.maxTokens || this.maxTokens,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = systemInstruction
    }

    // Add tools if provided
    const tools = this._convertTools(options.tools)
    if (tools) {
      body.tools = tools
    }

    // Safety settings
    body.safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]

    console.log('[VertexAI] Sending chat request to:', path)
    const response = await this._request('POST', path, body)

    console.log('[VertexAI] Raw response:', JSON.stringify(response).substring(0, 500))

    // Parse Vertex AI response - handle both formats
    const candidate = response.candidates?.[0]
    const content = candidate?.content

    // Debug log the response structure
    if (!response.candidates || response.candidates.length === 0) {
      console.warn('[VertexAI] No candidates in response. Full response:', JSON.stringify(response))
    }
    if (candidate && !content) {
      console.warn('[VertexAI] Candidate has no content:', JSON.stringify(candidate))
    }
    if (content && (!content.parts || content.parts.length === 0)) {
      console.warn('[VertexAI] Content has no parts:', JSON.stringify(content))
    }

    // Extract text and function calls
    let textContent = ''
    let toolCalls = null

    if (content?.parts) {
      for (const part of content.parts) {
        if (part.text) {
          textContent += part.text
        }
        if (part.functionCall) {
          if (!toolCalls) toolCalls = []
          toolCalls.push({
            id: `call_${Date.now()}_${toolCalls.length}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args || {}),
            },
          })
        }
      }
    }

    console.log('[VertexAI] Extracted content length:', textContent.length)

    return {
      content: textContent,
      role: 'assistant',
      toolCalls,
      finishReason: candidate?.finishReason?.toLowerCase() || 'stop',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
      },
    }
  }

  /**
   * Stream a chat completion
   * @param {Array<Object>} messages - Array of message objects
   * @param {Object} options - Override options
   * @returns {AsyncGenerator<string>} Yields content chunks or tool calls
   */
  async *streamChat(messages, options = {}) {
    console.log('[VertexAI] streamChat called with', messages.length, 'messages')

    const model = options.model || this.model
    const path = `/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:streamGenerateContent?alt=sse`

    const { contents, systemInstruction } = this._convertMessages(messages)

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? this.temperature,
        maxOutputTokens: options.maxTokens || this.maxTokens,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = systemInstruction
    }

    // Add tools if provided
    const tools = this._convertTools(options.tools)
    if (tools) {
      body.tools = tools
    }

    // Safety settings
    body.safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]

    console.log('[VertexAI] Request path:', path)
    console.log('[VertexAI] Model:', model, 'Messages:', messages.length)

    const res = await this._request('POST', path, body, true)

    console.log('[VertexAI] Response status:', res.statusCode)

    if (res.statusCode !== 200) {
      let data = ''
      for await (const chunk of res) {
        data += chunk.toString()
      }
      console.log('[VertexAI] Error response:', data.substring(0, 500))
      try {
        const json = JSON.parse(data)
        throw new Error(json.error?.message || `HTTP ${res.statusCode}`)
      } catch (e) {
        if (e.message.includes('HTTP')) throw e
        throw new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`)
      }
    }

    let buffer = ''
    let toolCallsBuffer = []
    let chunkCount = 0
    let textYieldedCount = 0

    console.log('[VertexAI] Starting stream read...')

    for await (const chunk of res) {
      const chunkStr = chunk.toString()
      chunkCount++

      if (chunkCount <= 5) {
        console.log(
          '[VertexAI] Raw chunk #' + chunkCount + ' (length=' + chunkStr.length + '):',
          chunkStr.substring(0, 300),
        )
      }

      buffer += chunkStr
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Handle SSE format: "data: {json}" or "data:{json}"
        let jsonData = null
        if (trimmedLine.startsWith('data:')) {
          const dataContent = trimmedLine.slice(5).trim()
          if (dataContent === '[DONE]' || !dataContent) continue
          jsonData = dataContent
        } else if (trimmedLine.startsWith('{')) {
          // Handle newline-delimited JSON format
          jsonData = trimmedLine
        }

        if (!jsonData) continue

        try {
          const json = JSON.parse(jsonData)

          // Debug first few parsed responses
          if (chunkCount <= 3) {
            console.log(
              '[VertexAI] Parsed JSON candidates:',
              json.candidates?.length,
              'parts:',
              json.candidates?.[0]?.content?.parts?.length,
            )
          }

          const candidate = json.candidates?.[0]
          const content = candidate?.content

          // Check for finish reason
          if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            console.log('[VertexAI] Finish reason:', candidate.finishReason)
          }

          // Check for safety blocks
          if (candidate?.safetyRatings) {
            const blocked = candidate.safetyRatings.filter((r) => r.blocked)
            if (blocked.length > 0) {
              console.warn('[VertexAI] Content blocked by safety:', JSON.stringify(blocked))
            }
          }

          if (content?.parts) {
            for (const part of content.parts) {
              if (part.text) {
                textYieldedCount++
                if (textYieldedCount <= 3) {
                  console.log('[VertexAI] Yielding text:', part.text.substring(0, 50))
                }
                yield part.text
              }
              if (part.functionCall) {
                console.log('[VertexAI] Function call:', part.functionCall.name)
                toolCallsBuffer.push({
                  id: `call_${Date.now()}_${toolCallsBuffer.length}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args || {}),
                  },
                })
              }
            }
          } else if (!content && json.candidates) {
            console.log(
              '[VertexAI] Candidate without content:',
              JSON.stringify(candidate).substring(0, 200),
            )
          }
        } catch (parseErr) {
          console.log(
            '[VertexAI] JSON parse error for:',
            jsonData.substring(0, 100),
            'Error:',
            parseErr.message,
          )
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      const trimmedBuffer = buffer.trim()
      let jsonData = null
      if (trimmedBuffer.startsWith('data:')) {
        jsonData = trimmedBuffer.slice(5).trim()
      } else if (trimmedBuffer.startsWith('{')) {
        jsonData = trimmedBuffer
      }

      if (jsonData && jsonData !== '[DONE]') {
        try {
          const json = JSON.parse(jsonData)
          const content = json.candidates?.[0]?.content
          if (content?.parts) {
            for (const part of content.parts) {
              if (part.text) {
                yield part.text
              }
            }
          }
        } catch (e) {
          console.log('[VertexAI] Final buffer parse error:', e.message)
        }
      }
    }

    console.log(
      '[VertexAI] Stream complete - chunks:',
      chunkCount,
      'text yields:',
      textYieldedCount,
    )

    // Yield accumulated tool calls at the end
    if (toolCallsBuffer.length > 0) {
      yield { type: 'tool_calls', toolCalls: toolCallsBuffer }
    }
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

module.exports = { VertexAIClient, getAccessToken }
