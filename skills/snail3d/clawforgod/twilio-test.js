#!/usr/bin/env node

const twilio = require('twilio')

// Credentials from TOOLS.md
const accountSid = 'AC35fce9f5069e4a19358da26286380ca9'
const apiSid = 'SK70650ad316ca54799b1223e528127197'
const apiKey = '2Tu5wuVeNWCulhAy8G2Y4Ai1g58tNsRp'
const twilioNumber = '(915) 223-7302'
const toNumber = '915-730-8926' // Your phone

const client = twilio(apiSid, apiKey, { accountSid })

async function testCall() {
  try {
    console.log(`🔔 Making test call...`)
    console.log(`From: ${twilioNumber}`)
    console.log(`To: ${toNumber}`)

    const call = await client.calls.create({
      url: 'http://demo.twilio.com/docs/voice.xml',
      to: toNumber,
      from: twilioNumber,
    })

    console.log(`✅ Call initiated! SID: ${call.sid}`)
    console.log(`Status: ${call.status}`)
  } catch (err) {
    console.error(`❌ Error:`, err.message)
  }
}

testCall()
