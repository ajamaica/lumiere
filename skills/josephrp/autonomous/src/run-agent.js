#!/usr/bin/env node
/**
 * Entrypoint for the autonomous agent (x402 MCP + LangChain.js).
 * Usage: node src/run-agent.js [message]
 * If no message, runs demo prompt.
 */

import 'dotenv/config'

import { createAgent } from './agent/index.js'
import { buildAptosPaymentPayload } from './lib/aptos/index.js'
import { getEvmPaymentPayload } from './lib/evm/index.js'
import { createMcpClient } from './lib/mcp/index.js'

const DEMO_PROMPT =
  'Check my Aptos balance, then run a prediction for AAPL for 30 days and summarize the result.'

async function main() {
  const message = process.argv.slice(2).join(' ').trim() || DEMO_PROMPT

  const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:4023'
  const defaultFacilitator = 'https://x402-navy.vercel.app/facilitator'
  let facilitatorUrl = process.env.X402_FACILITATOR_URL || defaultFacilitator
  if (facilitatorUrl.includes('facilitator.x402.org')) {
    facilitatorUrl = defaultFacilitator
  }
  const evmFacilitatorUrl = process.env.X402_EVM_FACILITATOR_URL || facilitatorUrl

  let getAptosPaymentPayloadFn = null
  let getEvmPaymentPayloadFn = null
  try {
    getAptosPaymentPayloadFn = (req) => buildAptosPaymentPayload(req)
  } catch (e) {
    console.warn('Aptos payment not available:', e.message)
  }
  try {
    getEvmPaymentPayloadFn = (req) => getEvmPaymentPayload(req)
  } catch (e) {
    console.warn('EVM payment not available:', e.message)
  }

  const mcpClient = createMcpClient({
    baseUrl: mcpServerUrl,
    facilitatorUrl,
    evmFacilitatorUrl,
    getAptosPaymentPayload: getAptosPaymentPayloadFn,
    getEvmPaymentPayload: getEvmPaymentPayloadFn,
  })

  const { runAgent } = await createAgent({ mcpClient })

  console.log('Running agent with message:', message)
  const result = await runAgent(message)
  const messages = result?.messages ?? []
  const last = messages[messages.length - 1]
  if (last?.content) {
    console.log(
      'Agent response:',
      typeof last.content === 'string' ? last.content : JSON.stringify(last.content),
    )
  } else {
    console.log('Result:', JSON.stringify(result, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
