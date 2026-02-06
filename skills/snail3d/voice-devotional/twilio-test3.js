#!/usr/bin/env node

const twilio = require('twilio')

const accountSid = 'AC35fce9f5069e4a19358da26286380ca9'
const authToken = 'a7700999dcff89b738f62c78bd1e33c1'
const twilioNumber = '+19152237302'
const toNumber = '+19157308926'

const client = twilio(accountSid, authToken)

async function testCall() {
  try {
    console.log(`🔔 Making test call with Auth Token...`)
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
