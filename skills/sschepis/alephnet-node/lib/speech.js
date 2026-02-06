/**
 * Speech-to-Text Module
 *
 * Provides voice input capabilities for the Sentient Observer CLI.
 * Uses the microphone for recording and Whisper API for transcription.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

/**
 * Speech Recorder
 *
 * Records audio from the microphone using sox (cross-platform)
 * or rec on macOS.
 */
class SpeechRecorder {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000
    this.channels = options.channels || 1
    this.tempDir = options.tempDir || '/tmp'
    this.recordingProcess = null
    this.isRecording = false
    this.audioFile = null
  }

  /**
   * Check if sox/rec is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const proc = spawn('which', ['sox'])
      proc.on('close', (code) => {
        resolve(code === 0)
      })
      proc.on('error', () => resolve(false))
    })
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    if (this.isRecording) return

    // Generate temp file path
    this.audioFile = path.join(this.tempDir, `sentient_audio_${Date.now()}.wav`)

    // Use rec (part of sox) for recording
    // rec is available on macOS via Homebrew: brew install sox
    this.recordingProcess = spawn(
      'rec',
      [
        '-r',
        this.sampleRate.toString(), // Sample rate
        '-c',
        this.channels.toString(), // Channels
        '-b',
        '16', // Bits per sample
        this.audioFile, // Output file
        'silence',
        '1',
        '0.1',
        '3%', // Start on voice
        '1',
        '2.0',
        '3%', // Stop after 2s silence
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    this.isRecording = true

    return new Promise((resolve, reject) => {
      this.recordingProcess.on('error', (err) => {
        this.isRecording = false
        reject(new Error(`Recording failed: ${err.message}. Install sox with: brew install sox`))
      })

      this.recordingProcess.on('close', (code) => {
        this.isRecording = false
        if (code === 0 && fs.existsSync(this.audioFile)) {
          resolve(this.audioFile)
        } else {
          reject(new Error('Recording failed or was cancelled'))
        }
      })

      // Resolve immediately to indicate recording started
      setTimeout(() => {
        if (this.isRecording) {
          resolve(null) // null means still recording
        }
      }, 100)
    })
  }

  /**
   * Stop recording and return the audio file path
   */
  async stopRecording() {
    if (!this.isRecording || !this.recordingProcess) {
      return null
    }

    return new Promise((resolve) => {
      this.recordingProcess.on('close', () => {
        this.isRecording = false
        if (this.audioFile && fs.existsSync(this.audioFile)) {
          resolve(this.audioFile)
        } else {
          resolve(null)
        }
      })

      // Send SIGTERM to stop recording
      this.recordingProcess.kill('SIGTERM')
    })
  }

  /**
   * Clean up temp files
   */
  cleanup() {
    if (this.audioFile && fs.existsSync(this.audioFile)) {
      try {
        fs.unlinkSync(this.audioFile)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Whisper Transcriber
 *
 * Transcribes audio using Whisper API (OpenAI compatible)
 */
class WhisperTranscriber {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:1234/v1'
    this.apiKey = options.apiKey || ''
    this.model = options.model || 'whisper-1'
  }

  /**
   * Transcribe an audio file
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribe(audioPath) {
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found')
    }

    // Read the audio file
    const audioData = fs.readFileSync(audioPath)

    // Parse the URL
    const url = new URL(`${this.baseUrl}/audio/transcriptions`)
    const isHttps = url.protocol === 'https:'

    // Create multipart form data
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)

    const formParts = []

    // Add file field
    formParts.push(
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`,
      `Content-Type: audio/wav\r\n\r\n`,
    )
    formParts.push(audioData)
    formParts.push('\r\n')

    // Add model field
    formParts.push(
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="model"\r\n\r\n`,
      `${this.model}\r\n`,
    )

    // End boundary
    formParts.push(`--${boundary}--\r\n`)

    // Combine all parts
    const body = Buffer.concat(
      formParts.map((part) => (typeof part === 'string' ? Buffer.from(part) : part)),
    )

    return new Promise((resolve, reject) => {
      const httpModule = isHttps ? https : http

      const req = httpModule.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const json = JSON.parse(data)
                resolve(json.text || '')
              } catch (e) {
                reject(new Error('Invalid transcription response'))
              }
            } else {
              reject(new Error(`Transcription failed: ${res.statusCode} - ${data}`))
            }
          })
        },
      )

      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

/**
 * Speech Input Manager
 *
 * Manages the complete speech-to-text flow:
 * 1. Record audio with visual feedback
 * 2. Transcribe using Whisper
 * 3. Return text for editing
 */
class SpeechInputManager {
  constructor(options = {}) {
    this.recorder = new SpeechRecorder({
      tempDir: options.tempDir || '/tmp',
      sampleRate: options.sampleRate || 16000,
    })

    this.transcriber = new WhisperTranscriber({
      baseUrl: options.whisperUrl || options.baseUrl || 'http://localhost:1234/v1',
      apiKey: options.apiKey || '',
      model: options.model || 'whisper-1',
    })

    this.isListening = false
    this.onTranscript = options.onTranscript || null
    this.onStatus = options.onStatus || null
    this.onError = options.onError || null
  }

  /**
   * Check if speech input is available
   */
  async isAvailable() {
    return await this.recorder.isAvailable()
  }

  /**
   * Start listening for speech
   */
  async startListening() {
    if (this.isListening) return

    this.isListening = true

    try {
      if (this.onStatus) {
        this.onStatus('recording', '🎙️ Listening... (speak, then pause to stop)')
      }

      // Start recording
      await this.recorder.startRecording()

      // Wait for recording to complete (auto-stops on silence)
      const audioPath = await this.waitForRecordingComplete()

      if (!audioPath) {
        if (this.onStatus) {
          this.onStatus('cancelled', 'Recording cancelled')
        }
        return null
      }

      if (this.onStatus) {
        this.onStatus('transcribing', '⚡ Transcribing...')
      }

      // Transcribe
      const text = await this.transcriber.transcribe(audioPath)

      // Clean up
      this.recorder.cleanup()

      if (this.onTranscript) {
        this.onTranscript(text)
      }

      if (this.onStatus) {
        this.onStatus('complete', '✓ Transcription complete')
      }

      return text
    } catch (error) {
      if (this.onError) {
        this.onError(error)
      }
      return null
    } finally {
      this.isListening = false
    }
  }

  /**
   * Wait for recording to complete
   */
  async waitForRecordingComplete() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.recorder.isRecording) {
          clearInterval(checkInterval)
          const audioPath = this.recorder.audioFile
          if (audioPath && fs.existsSync(audioPath)) {
            resolve(audioPath)
          } else {
            resolve(null)
          }
        }
      }, 100)

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        this.stopListening().then(resolve)
      }, 60000)
    })
  }

  /**
   * Stop listening
   */
  async stopListening() {
    if (!this.isListening) return null

    const audioPath = await this.recorder.stopRecording()
    this.isListening = false

    if (audioPath) {
      try {
        if (this.onStatus) {
          this.onStatus('transcribing', '⚡ Transcribing...')
        }

        const text = await this.transcriber.transcribe(audioPath)
        this.recorder.cleanup()

        if (this.onTranscript) {
          this.onTranscript(text)
        }

        return text
      } catch (error) {
        if (this.onError) {
          this.onError(error)
        }
        return null
      }
    }

    return null
  }

  /**
   * Cancel listening
   */
  cancel() {
    if (this.recorder.isRecording) {
      this.recorder.recordingProcess?.kill('SIGKILL')
      this.recorder.isRecording = false
    }
    this.isListening = false
    this.recorder.cleanup()
  }
}

module.exports = {
  SpeechRecorder,
  WhisperTranscriber,
  SpeechInputManager,
}
