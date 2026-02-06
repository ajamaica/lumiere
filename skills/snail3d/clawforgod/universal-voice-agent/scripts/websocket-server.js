#!/usr/bin/env node

/**
 * Twilio WebSocket Server
 * Handles real-time audio streaming for voice calls
 *
 * Receives audio from Twilio → Processes with Groq/Haiku/ElevenLabs → Sends back
 */

require('dotenv').config()

const express = require('express')
const WebSocket = require('ws')
const http = require('http')
const twilio = require('twilio')

const app = express()
const server = http.createServer(app)

// Middleware for parsing JSON bodies
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// WebSocket server on the same HTTP server
const wss = new WebSocket.Server({ server, path: '/media-stream' })

// Configuration
const PORT = process.env.PORT || 5001
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC35fce9f5069e4a19358da26286380ca9'
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'a7700999dcff89b738f62c78bd1e33c1'
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+19152237302'

// Groq & ElevenLabs
const GROQ_API_KEY =
  process.env.GROQ_API_KEY || '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'
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || 'sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a'

const twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN)

// Store active calls
const activeCalls = new Map()

class CallSession {
  constructor(callSid, goal) {
    this.callSid = callSid
    this.goal = goal
    this.ws = null
    this.conversationHistory = []
    this.audioBuffer = []
    this.startTime = Date.now()
    this.lastAudioTime = Date.now()
    this.goalAchieved = false
  }

  recordMessage(role, text) {
    this.conversationHistory.push({
      role,
      text,
      timestamp: Date.now(),
    })
  }

  checkTimeout() {
    const elapsedMs = Date.now() - this.startTime
    const silenceMs = Date.now() - this.lastAudioTime

    // 20 minute timeout
    if (elapsedMs > 20 * 60 * 1000) {
      return { timeout: true, reason: 'max_call_time' }
    }

    // 5 minute silence timeout
    if (silenceMs > 5 * 60 * 1000) {
      return { timeout: true, reason: 'silence_timeout' }
    }

    // 10 second silence = ask "hello?"
    if (silenceMs > 10 * 1000 && silenceMs < 12 * 1000) {
      return { checkIn: true, reason: 'prolonged_silence' }
    }

    return { timeout: false }
  }
}

/**
 * TwiML response that connects to WebSocket
 * This is what Twilio gets when making the call
 */
app.post('/call-webhook', (req, res) => {
  const goal = req.body.goal || 'Have a conversation'
  const callSid = req.body.CallSid

  console.log(`\n📞 Incoming call: ${callSid}`)
  console.log(`Goal: ${goal}\n`)

  // Create TwiML response
  const twiml = new twilio.twiml.VoiceResponse()

  // Connect to WebSocket for real-time media stream
  twiml.connect().stream({
    url: `wss://${req.get('host')}/media-stream?goal=${encodeURIComponent(goal)}&callSid=${callSid}`,
  })

  // Send response
  res.type('text/xml')
  res.send(twiml.toString())
})

/**
 * WebSocket handler for real-time audio
 */
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const goal = url.searchParams.get('goal')
  const callSid = url.searchParams.get('callSid')

  console.log(`🔌 WebSocket connected: ${callSid}`)

  const session = new CallSession(callSid, goal)
  session.ws = ws
  activeCalls.set(callSid, session)

  // Handle incoming messages (audio from Twilio)
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)

      if (data.event === 'connected') {
        console.log(`✅ Media stream connected: ${callSid}`)
      } else if (data.event === 'start') {
        console.log(`▶️ Call started: ${callSid}`)
      } else if (data.event === 'media') {
        // Audio payload (only fire processAudio occasionally, not every packet)
        session.lastAudioTime = Date.now()
        session.audioBuffer.push(data.media.payload)

        // Process every ~1 second of audio (adjust as needed)
        if (session.audioBuffer.length % 50 === 0) {
          await processAudio(session)
        }
      } else if (data.event === 'stop') {
        console.log(`⏹️ Call stopped: ${callSid}`)
        session.goalAchieved = true
        ws.close()
      }
    } catch (error) {
      console.error(`❌ Error processing message: ${error.message}`)
    }
  })

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`❌ WebSocket closed: ${callSid}`)
    activeCalls.delete(callSid)
    sendCallSummary(session)
  })

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error: ${error.message}`)
  })
})

/**
 * Process incoming audio
 * 1. Transcribe with Groq
 * 2. Think with Haiku
 * 3. Speak with ElevenLabs
 */
async function processAudio(session) {
  try {
    if (session.audioBuffer.length === 0) return

    // 1. TRANSCRIBE with Groq Whisper
    const transcript = await transcribeWithGroq(session.audioBuffer)
    if (!transcript || transcript.trim().length === 0) {
      console.log(`[Silence detected, skipping...]`)
      return
    }

    session.lastAudioTime = Date.now()
    session.recordMessage('other', transcript)
    console.log(`\n🔊 Them: "${transcript}"`)

    // 2. CHECK TIMEOUT & SILENCE
    const timeout = session.checkTimeout()
    if (timeout.checkIn) {
      const checkInMsg = 'Hello? Are you still there?'
      session.recordMessage('you', checkInMsg)
      console.log(`🎤 You: "${checkInMsg}"`)

      const audio = await generateSpeechWithElevenLabs(checkInMsg)
      sendAudioToTwilio(session, audio)
      return
    }
    if (timeout.timeout) {
      console.log(`⏰ Call timeout: ${timeout.reason}. Hanging up gracefully.`)
      const goodbye = 'Thank you for your time. Goodbye!'
      const audio = await generateSpeechWithElevenLabs(goodbye)
      sendAudioToTwilio(session, audio)
      session.ws.close()
      return
    }

    // 3. THINK with Haiku
    const response = await thinkWithHaiku(session.goal, session.conversationHistory, transcript)

    session.recordMessage('you', response)
    console.log(`🎤 You: "${response}"`)

    // 4. CHECK IF GOAL ACHIEVED
    const goalIndicators = [
      'confirm',
      'confirmed',
      'order placed',
      'reservation made',
      'thank you',
      'goodbye',
      'thanks',
    ]
    if (goalIndicators.some((word) => response.toLowerCase().includes(word))) {
      session.goalAchieved = true
      console.log(`✅ Goal achieved!`)
    }

    // 5. SPEAK with ElevenLabs
    const audio = await generateSpeechWithElevenLabs(response)
    sendAudioToTwilio(session, audio)
  } catch (error) {
    console.error(`Error processing audio: ${error.message}`)
    // Send fallback response
    try {
      const fallback = "I'm having trouble understanding. Can you repeat that?"
      const audio = await generateSpeechWithElevenLabs(fallback)
      sendAudioToTwilio(session, audio)
    } catch (fallbackError) {
      console.error(`Failed to send fallback: ${fallbackError.message}`)
    }
  }
}

/**
 * Transcribe audio with Groq Whisper
 */
async function transcribeWithGroq(audioBuffer) {
  try {
    const audioBase64 = audioBuffer.join('')
    if (!audioBase64 || audioBase64.length < 100) {
      return null // Too short, skip
    }

    // Convert base64 to buffer
    const audioBytes = Buffer.from(audioBase64, 'base64')

    // Create FormData for multipart request
    const FormData = require('form-data')
    const form = new FormData()
    form.append('file', audioBytes, 'audio.wav')
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'en')

    // Send to Groq Whisper API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    })

    if (!response.ok) {
      console.error(`Groq error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data.text || null
  } catch (error) {
    console.error(`Transcription error: ${error.message}`)
    return null
  }
}

/**
 * Think with Haiku
 */
async function thinkWithHaiku(goal, conversationHistory, lastMessage) {
  try {
    // Build prompt with goal + history
    const historyText = conversationHistory
      .map((m) => `${m.role === 'you' ? 'You' : 'Them'}: ${m.text}`)
      .join('\n')

    const prompt = `You are on a phone call trying to achieve this goal: "${goal}"

Conversation so far:
${historyText}

They just said: "${lastMessage}"

What should you say next? Keep it brief (1-2 sentences), natural, and goal-focused. Respond with ONLY the text you should say, nothing else.`

    // Call Haiku via fetch (using environment/config credentials)
    // Since we're in Node, we'll use the Anthropic SDK approach

    // For now, use a simple fetch-based call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Haiku error: ${response.status} ${error}`)
      return "I'm sorry, I'm having trouble thinking. Can you repeat that?"
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || 'Let me think about that.'
    return text.replace(/^["']|["']$/g, '').trim() // Remove quotes if any
  } catch (error) {
    console.error(`Haiku error: ${error.message}`)
    return "I didn't catch that. Could you say it again?"
  }
}

/**
 * Generate speech with ElevenLabs
 */
async function generateSpeechWithElevenLabs(text) {
  try {
    if (!text || text.length === 0) {
      return null
    }

    // Use default voice ID (you can customize this)
    // For your voice, you'd use your specific voice ID from ElevenLabs
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Default English voice

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`ElevenLabs error: ${response.status} ${error}`)
      return null
    }

    // Response is audio/mpeg
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    return audioBase64
  } catch (error) {
    console.error(`TTS error: ${error.message}`)
    return null
  }
}

/**
 * Send audio back to Twilio
 */
function sendAudioToTwilio(session, audioBase64) {
  if (!session.ws || session.ws.readyState !== WebSocket.OPEN) {
    return
  }

  session.ws.send(
    JSON.stringify({
      event: 'media',
      sequenceNumber: session.conversationHistory.length,
      media: {
        payload: audioBase64,
      },
    }),
  )
}

/**
 * Send SMS summary after call ends
 */
async function sendCallSummary(session) {
  try {
    const elapsedSeconds = Math.round((Date.now() - session.startTime) / 1000)
    const status = session.goalAchieved ? 'completed' : 'ended'

    const summaryText = `${status === 'completed' ? '✅' : '⚠️'} Voice Call: ${session.goal}

${session.conversationHistory.map((m) => `- ${m.role}: ${m.text}`).join('\n')}

Duration: ${elapsedSeconds}s`

    console.log(`\n📱 Call Summary:\n${summaryText}\n`)

    // TODO: Send SMS via Twilio
    // await twilioClient.messages.create({...})
  } catch (error) {
    console.error(`Error sending summary: ${error.message}`)
  }
}

/**
 * Make a call (initiate from your code)
 */
async function makeCall(phoneNumber, goal, webhookUrl) {
  try {
    console.log(`\n📞 Initiating call to ${phoneNumber}`)
    console.log(`Goal: ${goal}\n`)

    // Use ngrok URL if provided, otherwise fall back to localhost (for testing)
    const callbackUrl = webhookUrl || `http://localhost:${PORT}/call-webhook`

    const call = await twilioClient.calls.create({
      url: `${callbackUrl}?goal=${encodeURIComponent(goal)}`,
      to: phoneNumber,
      from: TWILIO_PHONE,
    })

    console.log(`✅ Call initiated: ${call.sid}`)
    return call.sid
  } catch (error) {
    console.error(`❌ Error making call: ${error.message}`)
    throw error
  }
}

// REST API to start calls
app.post('/make-call', async (req, res) => {
  try {
    const { phoneNumber, goal, webhookUrl } = req.body

    if (!phoneNumber || !goal) {
      return res.status(400).json({ error: 'Missing phoneNumber or goal' })
    }

    const callSid = await makeCall(phoneNumber, goal, webhookUrl)
    res.json({ callSid, status: 'initiated' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeCalls: activeCalls.size })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log(`\n📍 Webhook URL: http://localhost:${PORT}/call-webhook`)
  console.log(`🔌 WebSocket URL: wss://localhost:${PORT}/media-stream`)
  console.log(`\n⚠️ You need to expose this server publicly or use ngrok:\n`)
  console.log(`   ngrok http ${PORT}`)
  console.log(`   Then update Twilio webhook to your ngrok URL\n`)
  console.log(`📌 To make a call:\n`)
  console.log(`   curl -X POST http://localhost:${PORT}/make-call \\`)
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -d '{"phoneNumber":"+1-555-123-4567", "goal":"Order pizza"}'\n`)
})

module.exports = { makeCall, activeCalls }
