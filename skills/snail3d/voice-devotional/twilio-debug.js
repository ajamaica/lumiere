#!/usr/bin/env node

const twilio = require('twilio')

const accountSid = 'AC35fce9f5069e4a19358da26286380ca9'
const authToken = 'a7700999dcff89b738f62c78bd1e33c1'

const client = twilio(accountSid, authToken)

async function checkCall() {
  try {
    // Get last 3 calls
    const calls = await client.calls.list({ limit: 3 })

    console.log('📞 Recent Calls:')
    calls.forEach((call) => {
      console.log(`\nSID: ${call.sid}`)
      console.log(`From: ${call.from}`)
      console.log(`To: ${call.to}`)
      console.log(`Status: ${call.status}`)
      console.log(`Duration: ${call.duration}s`)
      if (call.status === 'failed') {
        console.log(`❌ FAILED`)
      }
    })
  } catch (err) {
    console.error(`❌ Error:`, err.message)
  }
}

checkCall()
