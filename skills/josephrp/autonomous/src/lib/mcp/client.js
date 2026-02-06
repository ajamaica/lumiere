/**
 * MCP client with x402 retry: uses official MCP SDK with StreamableHTTP transport.
 * On 402 from tool call, pays via facilitator and retries in one shot (agent calls
 * the tool once; 402 + verify + settle + retry happen inside callTool; agent gets
 * final result or error, never 402).
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

import { settlePayment, verifyPayment } from '../x402/index.js'

/** Max time for a single callTool (connect + call + payment flow + retry); ms. MCP responses (e.g. prediction) can take > 1 min. */
const CALL_TOOL_TIMEOUT_MS = 300_000

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label || 'Operation'} timed out after ${ms / 1000}s`)),
      ms,
    )
    promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(t)
        reject(e)
      })
  })
}

/**
 * @param {Object} config
 * @param {string} config.baseUrl - MCP server base URL (e.g. http://localhost:4023)
 * @param {string} config.facilitatorUrl - x402 facilitator base URL (Aptos)
 * @param {string} [config.evmFacilitatorUrl] - facilitator for EVM (open_bank_account); defaults to facilitatorUrl (use public for EVM when Aptos is local)
 * @param {(r: import('../x402/types.js').PaymentRequirements) => Promise<Object>} config.getAptosPaymentPayload
 * @param {(r: import('../x402/types.js').PaymentRequirements) => Promise<Object>} config.getEvmPaymentPayload
 * @param {number} [config.maxRetries]
 * @param {number} [config.callToolTimeoutMs] - max ms for a single callTool (default 300000; MCP responses can take > 1 min)
 */
export function createMcpClient(config) {
  const baseUrl = (config.baseUrl || '').replace(/\/+$/, '')
  const mcpUrl = `${baseUrl}/mcp`
  const facilitatorUrl = config.facilitatorUrl
  const evmFacilitatorUrl = config.evmFacilitatorUrl || facilitatorUrl
  const getAptosPaymentPayload = config.getAptosPaymentPayload
  const getEvmPaymentPayload = config.getEvmPaymentPayload
  const maxRetries = config.maxRetries ?? 2
  const callToolTimeoutMs = config.callToolTimeoutMs ?? CALL_TOOL_TIMEOUT_MS

  let mcpClient = null
  let isConnected = false

  /**
   * Connect to MCP server
   */
  async function connect() {
    if (isConnected && mcpClient) {
      console.log('Already connected to MCP server')
      return
    }

    console.log(`Connecting to MCP server at ${mcpUrl}`)
    try {
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl))

      mcpClient = new Client(
        {
          name: 'cornerstone-agent',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      )

      await mcpClient.connect(transport)
      isConnected = true
      console.log('Successfully connected to MCP server')
    } catch (error) {
      console.error('Failed to connect to MCP server:', error)
      throw error
    }
  }

  /**
   * Disconnect from MCP server
   */
  async function disconnect() {
    if (mcpClient && isConnected) {
      await mcpClient.close()
      isConnected = false
      mcpClient = null
    }
  }

  /**
   * Call MCP tool by name with args; on 402 pay and retry.
   * @param {string} name - tool name (run_prediction, run_backtest, open_bank_account)
   * @param {Record<string, unknown>} args - tool arguments
   * @returns {Promise<{ result?: unknown; payment_receipt?: Object }>}
   */
  async function callTool(name, args = {}) {
    const run = async () => {
      console.log(`MCP client calling tool: ${name}`, args)
      await connect()
      console.log('MCP client connected')

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`MCP tool call attempt ${attempt + 1}`)
          const result = await mcpClient.callTool({
            name,
            arguments: args,
          })
          console.log('MCP callTool result:', result)

          // Check for 402 in result (can be in structuredContent or text content)
          let errorData = null

          // Try structuredContent first
          if (result.structuredContent?.status === 402) {
            errorData = result.structuredContent
          }
          // Try parsing text content
          else if (result.content?.[0]?.text) {
            try {
              const parsed = JSON.parse(result.content[0].text)
              if (parsed.status === 402) {
                errorData = parsed
              }
            } catch {
              // Not JSON or not 402
            }
          }

          if (errorData?.status === 402 && errorData.paymentRequirements) {
            // Handle payment
            const paymentRequirements = errorData.paymentRequirements
            const network =
              paymentRequirements && paymentRequirements.network
                ? String(paymentRequirements.network)
                : ''
            const isEvm = network.startsWith('eip155:')
            const payFacilitatorUrl = isEvm ? evmFacilitatorUrl : facilitatorUrl
            console.log(
              `Payment required for ${name}: ${paymentRequirements.amount} on ${network || '(network missing)'}`,
            )

            // Get payment payload based on network
            let paymentPayload
            try {
              if (!network) {
                return {
                  result: {
                    error:
                      'Payment requirements missing network. Check MCP server config (e.g. BASE_SEPOLIA_NETWORK, APTOS_NETWORK).',
                  },
                }
              }
              if (network.startsWith('aptos:')) {
                if (!getAptosPaymentPayload) {
                  return { result: { error: 'No Aptos wallet configured' } }
                }
                console.log('Creating Aptos payment payload...')
                paymentPayload = await getAptosPaymentPayload(paymentRequirements)
                console.log('Payment payload created')
              } else if (network.startsWith('eip155:')) {
                if (!getEvmPaymentPayload) {
                  return { result: { error: 'No EVM wallet configured' } }
                }
                paymentPayload = await getEvmPaymentPayload(paymentRequirements)
              } else {
                return { result: { error: `Unsupported network: ${paymentRequirements.network}` } }
              }

              // Verify payment with facilitator (EVM uses public facilitator for open_bank_account)
              console.log(`Verifying payment with facilitator: ${payFacilitatorUrl}`)
              const verification = await verifyPayment(
                payFacilitatorUrl,
                paymentPayload,
                paymentRequirements,
              )
              console.log('Verification result:', verification)

              if (!verification.isValid) {
                return {
                  result: { error: `Payment verification failed: ${verification.invalidReason}` },
                }
              }

              // Settle payment
              console.log('Settling payment...')
              const settlement = await settlePayment(
                payFacilitatorUrl,
                paymentPayload,
                paymentRequirements,
                verification,
              )
              const txHash = settlement.transaction ?? settlement.transactionHash
              console.log(`Payment settled: ${txHash}`)
            } catch (error) {
              console.error('Payment error:', error)
              return { result: { error: error.message } }
            }

            // Retry with payment_payload so the server receives it and processes the paid request.
            // Without this, the server gets the same args again (no payment_payload) and returns 402 again.
            const retryArgs = { ...args, payment_payload: paymentPayload }
            console.log('Retrying tool call with payment_payload...')
            const retryResult = await mcpClient.callTool({
              name,
              arguments: retryArgs,
            })
            const retryContent = retryResult.content?.[0]
            if (retryContent?.type === 'text') {
              try {
                const parsed = JSON.parse(retryContent.text)
                if (parsed.status === 402 && parsed.paymentRequirements) {
                  return {
                    result: {
                      error:
                        'Server still returned 402 after payment; payment may not have been accepted.',
                    },
                  }
                }
                return { result: parsed.result ?? parsed }
              } catch {
                return { result: retryContent.text }
              }
            }
            return { result: retryResult }
          }

          // Success
          const content = result.content?.[0]
          if (content?.type === 'text') {
            try {
              return { result: JSON.parse(content.text) }
            } catch {
              return { result: content.text }
            }
          }
          return { result: content }
        } catch (error) {
          if (attempt === maxRetries) {
            return { result: { error: error.message } }
          }
        }
      }

      return { result: { error: 'Max retries exceeded' } }
    }
    return withTimeout(run(), callToolTimeoutMs, 'MCP callTool').catch((err) => ({
      result: { error: err.message || 'MCP callTool failed' },
    }))
  }

  return { callTool, connect, disconnect }
}
