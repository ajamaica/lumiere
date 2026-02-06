const https = require('https')
const Provider = require('./interface')

class MoonshotProvider extends Provider {
  constructor(config) {
    super(config)
    this.apiUrl = 'https://api.moonshot.ai/v1/chat/completions'
    this.model = config.model || 'moonshot-v1-auto'
    this.apiKey = config.apiKey
  }

  async getPerspective(agentId, userMessage, context = '') {
    if (!this.apiKey) {
      throw new Error('Moonshot API key not configured')
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(''), 20000)

      const systemPrompt = `You are providing a quick second perspective for ${agentId} (a Claude-based AI agent).
Danny (the human boss) just said something. Give ${agentId} a useful 2-3 sentence perspective:
- What might ${agentId} miss?
- What's a different angle?
- What should be verified?
Be direct. Never refuse or say you need more context.

${context ? `Business context: ${context.slice(0, 1000)}` : ''}`

      const data = JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Danny to ${agentId}: "${userMessage.slice(0, 1000)}"\n\nQuick perspective?`,
          },
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 300,
      })

      const url = new URL(this.apiUrl)
      const req = https.request(
        {
          hostname: url.hostname,
          port: 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(data),
          },
          timeout: 20000,
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            clearTimeout(timer)
            try {
              const json = JSON.parse(body)
              resolve(json.choices?.[0]?.message?.content || '')
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
      const result = await this.getPerspective('test', 'Hello')
      return result.length > 0
    } catch {
      return false
    }
  }
}

module.exports = MoonshotProvider
