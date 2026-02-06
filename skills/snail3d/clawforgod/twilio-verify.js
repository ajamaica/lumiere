#!/usr/bin/env node

const twilio = require('twilio')

const accountSid = 'AC35fce9f5069e4a19358da26286380ca9'
const apiSid = 'SK70650ad316ca54799b1223e528127197'
const apiKey = '2Tu5wuVeNWCulhAy8G2Y4Ai1g58tNsRp'

const client = twilio(apiSid, apiKey, { accountSid })

async function verify() {
  try {
    const account = await client.api.accounts(accountSid).fetch()
    console.log('✅ Account authenticated!')
    console.log(`Account Name: ${account.friendlyName}`)
    console.log(`Account SID: ${account.sid}`)
    console.log(`Status: ${account.status}`)

    // List phone numbers
    console.log('\n📞 Incoming Phone Numbers:')
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 })
    if (numbers.length === 0) {
      console.log('❌ No phone numbers found!')
    } else {
      numbers.forEach((num) => {
        console.log(`  ${num.phoneNumber} - ${num.friendlyName}`)
      })
    }
  } catch (err) {
    console.error(`❌ Auth Error:`, err.message)
  }
}

verify()
