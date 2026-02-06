const http = require('http')
const Provider = require('./interface')

class OllamaProvider extends Provider {
  constructor(config) {
    super(config)
    this.baseUrl = config.ollamaUrl || 'http://localhost:11434'
    this.model = config.model || 'llama3.2'
  }

  async getPerspective(agentId, userMessage, context = '') {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(''), 25000)

      const systemPrompt = `You are providing a quick second perspective for ${agentId} (a Claude-based AI agent).
The human just said something. Give ${agentId} a useful 2-3 sentence perspective:
- What might ${agentId} miss?
- What's a different angle?
- What should be verified?
Be direct. Never refuse or say you need more context.

${context ? `Context: ${context.slice(0, 1000)}` : ''}`

      const data = JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Human to ${agentId}: "${userMessage.slice(0, 1000)}"\n\nQuick perspective?`,
          },
        ],
        stream: false,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 300,
        },
      })

      const url = new URL(`${this.baseUrl}/api/chat`)
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
          timeout: 25000,
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            clearTimeout(timer)
            try {
              const json = JSON.parse(body)
              resolve(json.message?.content || '')
            } catch {
              resolve('')
            }
          })
        },
      )

      req.on('error', () => {
        clearTimeout(timer)
        resolve('')
      })
      req.on('timeout', () => {
        req.destroy()
        clearTimeout(timer)
        resolve('')
      })
      req.write(data)
      req.end()
    })
  }

  async test() {
    try {
      // Test if Ollama is running
      const url = new URL(`${this.baseUrl}/api/tags`)
      return new Promise((resolve) => {
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port || 11434,
            path: url.pathname,
            method: 'GET',
            timeout: 5000,
          },
          (res) => {
            resolve(res.statusCode === 200)
          },
        )
        req.on('error', () => resolve(false))
        req.on('timeout', () => {
          req.destroy()
          resolve(false)
        })
        req.end()
      })
    } catch {
      return false
    }
  }
}

module.exports = OllamaProvider
