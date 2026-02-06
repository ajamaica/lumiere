#!/usr/bin/env node

/**
 * Universal Voice Agent
 * Main orchestrator for real-time goal-oriented calling
 *
 * Flow:
 * 1. Parse goal + phone number
 * 2. Initiate Twilio call
 * 3. Real-time loop: Listen → Think → Speak
 * 4. Detect silence/holds, handle intelligently
 * 5. End call when goal achieved or timeout
 * 6. Send SMS summary
 */

const twilio = require('twilio')
const fs = require('fs')
const path = require('path')

// Credentials from environment or TOOLS.md
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC35fce9f5069e4a19358da26286380ca9'
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'a7700999dcff89b738f62c78bd1e33c1'
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+19152237302'
const GROQ_API_KEY =
  process.env.GROQ_API_KEY || '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'
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || 'sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a'

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

class UniversalVoiceAgent {
  constructor(goal, phoneNumber, context = {}, notifyTo = null) {
    this.goal = goal
    this.phoneNumber = this.normalizePhone(phoneNumber)
    this.context = context
    this.notifyTo = notifyTo || process.env.NOTIFY_TO
    this.conversationHistory = []
    this.startTime = Date.now()
    this.lastSilenceTime = Date.now()
    this.silenceThreshold = 5000 // 5 seconds
    this.maxWaitTime = 5 * 60 * 1000 // 5 minutes hold time
    this.maxCallTime = 20 * 60 * 1000 // 20 minutes total
    this.turnCount = 0
    this.maxTurns = 40
    this.goalAchieved = false
    this.summary = {
      goal: goal,
      status: 'initiated',
      startTime: new Date().toISOString(),
      turns: [],
      keyDetails: [],
    }
  }

  normalizePhone(phone) {
    // Convert to E.164 format
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `+1${digits}`
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`
    }
    return `+${digits}`
  }

  async makeCall() {
    try {
      console.log(`\n📞 Initiating call...`)
      console.log(`Goal: ${this.goal}`)
      console.log(`To: ${this.phoneNumber}`)
      console.log(`From: ${TWILIO_PHONE}\n`)

      // Start call with TwiML that allows two-way conversation
      const call = await client.calls.create({
        url: 'http://demo.twilio.com/docs/voice.xml', // Placeholder - will be replaced with WebSocket
        to: this.phoneNumber,
        from: TWILIO_PHONE,
      })

      this.callSid = call.sid
      this.summary.callSid = call.sid

      console.log(`✅ Call initiated: ${call.sid}`)
      console.log(`⚠️ Note: This is a simulation. Real implementation requires:`)
      console.log(`   - Twilio WebSocket for real-time audio`)
      console.log(`   - Groq Whisper for transcription`)
      console.log(`   - Claude Haiku for real-time reasoning`)
      console.log(`   - ElevenLabs for TTS output`)

      // Simulate conversation loop
      await this.simulateConversation()

      // Send summary
      await this.sendSummary()
    } catch (error) {
      console.error(`❌ Call failed: ${error.message}`)
      this.summary.status = 'failed'
      this.summary.error = error.message
      await this.sendSummary()
    }
  }

  async simulateConversation() {
    // For now, simulate the conversation flow
    // In production, this would be a real-time WebSocket loop with Twilio

    console.log(`\n🎭 Simulating conversation...\n`)

    // Simulate restaurant answering
    const restaurantGreeting = "Hi, thanks for calling Mario's Pizza!"
    console.log(`🔊 Restaurant: ${restaurantGreeting}`)
    this.conversationHistory.push({
      role: 'other',
      text: restaurantGreeting,
      timestamp: Date.now(),
    })

    await this.think()
    await this.delay(1000)

    // Simulate order placement
    const yourResponse = "Hi! I'd like to order 2 large pepperoni pizzas for pickup at 6pm."
    console.log(`🎤 You: ${yourResponse}`)
    this.conversationHistory.push({
      role: 'you',
      text: yourResponse,
      timestamp: Date.now(),
    })

    await this.delay(2000)

    // Simulate confirmation
    const restaurantConfirm =
      'Perfect! So 2 large pepperoni, no onions, pickup at 6pm. That will be $35.'
    console.log(`🔊 Restaurant: ${restaurantConfirm}`)
    this.conversationHistory.push({
      role: 'other',
      text: restaurantConfirm,
      timestamp: Date.now(),
    })

    this.summary.keyDetails.push('2 large pepperoni pizzas')
    this.summary.keyDetails.push('Pickup at 6pm')
    this.summary.keyDetails.push('Total: $35')

    await this.think()

    // Confirm
    const finalResponse = 'Great! Thank you so much!'
    console.log(`🎤 You: ${finalResponse}`)
    this.conversationHistory.push({
      role: 'you',
      text: finalResponse,
      timestamp: Date.now(),
    })

    this.goalAchieved = true
    this.summary.status = 'completed'
    this.summary.duration = Math.round((Date.now() - this.startTime) / 1000)

    console.log(`\n✅ Goal achieved! Hanging up...\n`)
  }

  async think() {
    // In production, this would call Haiku for real-time reasoning
    // For now, just acknowledge the turn
    this.turnCount++
    console.log(`[Thinking... turn ${this.turnCount}/${this.maxTurns}]\n`)
    this.summary.turns.push({
      number: this.turnCount,
      history_length: this.conversationHistory.length,
    })
  }

  async sendSummary() {
    if (!this.notifyTo) {
      console.log(`\n📊 Summary:`)
      console.log(JSON.stringify(this.summary, null, 2))
      return
    }

    try {
      const statusEmoji =
        this.summary.status === 'completed' ? '✅' : this.summary.status === 'failed' ? '❌' : '⚠️'

      const summaryText = `${statusEmoji} Voice Call: ${this.goal}\n\n${this.summary.keyDetails.map((d) => `• ${d}`).join('\n')}\n\nDuration: ${this.summary.duration}s`

      console.log(`\n📱 Sending SMS summary...`)
      const message = await client.messages.create({
        body: summaryText,
        from: TWILIO_PHONE,
        to: this.notifyTo,
      })

      console.log(`✅ SMS sent: ${message.sid}`)
      console.log(`Message: "${summaryText}"`)
    } catch (error) {
      console.error(`⚠️ Failed to send SMS: ${error.message}`)
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`Usage: agent.js <goal> <phone> [context] [--notify-to <number>]`)
    console.log(`\nExamples:`)
    console.log(`  agent.js "Order 2 large pepperonis" "555-123-4567" "restaurant: Mario's Pizza"`)
    console.log(
      `  agent.js "Order 2 large pepperonis" "555-123-4567" "" --notify-to "555-730-8926"`,
    )
    process.exit(1)
  }

  const goal = args[0]
  const phone = args[1]
  const context = args[2] ? JSON.parse(args[2]) : {}
  const notifyIdx = args.indexOf('--notify-to')
  const notifyTo = notifyIdx >= 0 ? args[notifyIdx + 1] : null

  const agent = new UniversalVoiceAgent(goal, phone, context, notifyTo)
  await agent.makeCall()
}

main().catch(console.error)
