/**
 * TTSGenerator - ElevenLabs TTS Integration
 *
 * Handles text-to-speech generation via ElevenLabs API
 */

const https = require('https')

class TTSGenerator {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ELEVEN_LABS_API_KEY
    this.modelId = options.modelId || 'eleven_monolingual_v1'
    this.baseUrl = 'https://api.elevenlabs.io/v1'

    if (!this.apiKey) {
      throw new Error('ELEVEN_LABS_API_KEY not provided')
    }
  }

  /**
   * Generate audio from text
   *
   * @param {string} text - Text to convert to speech
   * @param {object} options - Voice settings
   * @returns {Buffer} Audio data
   */
  async generate(text, options = {}) {
    const {
      voiceId = 'pNInz6obpgDQGcFmaJgB', // Josh (deep, calm)
      stability = 0.3,
      similarity_boost = 0.75,
      style = 0.5,
    } = options

    // Validate inputs
    if (!text || text.length === 0) {
      throw new Error('Text content is required')
    }

    if (text.length > 5000) {
      // Split long text into chunks
      return this.generateChunked(text, options)
    }

    return this.generateSingle(text, {
      voiceId,
      stability,
      similarity_boost,
      style,
    })
  }

  /**
   * Generate audio for single text chunk
   */
  async generateSingle(text, options) {
    const { voiceId, stability, similarity_boost, style } = options

    const url = `${this.baseUrl}/text-to-speech/${voiceId}`

    const requestBody = {
      text,
      model_id: this.modelId,
      voice_settings: {
        stability,
        similarity_boost,
        style,
      },
    }

    return new Promise((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            let errorData = ''
            res.on('data', (chunk) => {
              errorData += chunk
            })
            res.on('end', () => {
              reject(new Error(`ElevenLabs API error ${res.statusCode}: ${errorData}`))
            })
            return
          }

          const chunks = []
          res.on('data', (chunk) => {
            chunks.push(chunk)
          })
          res.on('end', () => {
            resolve(Buffer.concat(chunks))
          })
        },
      )

      req.on('error', reject)
      req.write(JSON.stringify(requestBody))
      req.end()
    })
  }

  /**
   * Generate audio for text longer than 5000 chars
   * Splits into chunks and concatenates audio
   */
  async generateChunked(text, options) {
    console.log('  [TTS] Text too long, splitting into chunks...')

    const chunks = this.splitText(text, 4500)
    const audioBuffers = []

    for (let i = 0; i < chunks.length; i++) {
      console.log(`  [TTS] Chunk ${i + 1}/${chunks.length}...`)

      const buffer = await this.generateSingle(chunks[i], options)
      audioBuffers.push(buffer)

      // Rate limiting between chunks
      if (i < chunks.length - 1) {
        await this.sleep(500)
      }
    }

    // Concatenate audio buffers
    return Buffer.concat(audioBuffers)
  }

  /**
   * Split text into chunks
   */
  splitText(text, maxLength) {
    const chunks = []
    let currentChunk = ''

    // Split by sentences to avoid breaking mid-sentence
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = sentence
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * Get available voices
   */
  async getVoices() {
    const url = `${this.baseUrl}/voices`

    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data))
              } catch (err) {
                reject(new Error(`Failed to parse voices response: ${err.message}`))
              }
            } else {
              reject(new Error(`API error ${res.statusCode}: ${data}`))
            }
          })
        },
      )

      req.on('error', reject)
    })
  }

  /**
   * Get account usage/limits
   */
  async getUsage() {
    const url = `${this.baseUrl}/user`

    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data))
              } catch (err) {
                reject(new Error(`Failed to parse usage response: ${err.message}`))
              }
            } else {
              reject(new Error(`API error ${res.statusCode}: ${data}`))
            }
          })
        },
      )

      req.on('error', reject)
    })
  }

  /**
   * Check API key validity
   */
  async validateApiKey() {
    try {
      const usage = await this.getUsage()
      return {
        valid: true,
        subscription_tier: usage.subscription?.tier || 'free',
        character_limit: usage.subscription?.character_limit || 10000,
        character_count: usage.character_count || 0,
      }
    } catch (err) {
      return {
        valid: false,
        error: err.message,
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

module.exports = TTSGenerator
