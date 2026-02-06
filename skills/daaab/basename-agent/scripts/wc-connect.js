#!/usr/bin/env node
/**
 * 🦞 WalletConnect v2 Agent Connector
 *
 * Allows AI agents to programmatically connect to dApps via WalletConnect
 * and automatically sign transactions.
 *
 * Usage:
 *   node wc-connect.js <walletconnect-uri> [options]
 *
 * Options:
 *   --private-key <key>   Private key (or set PRIVATE_KEY env var)
 *   --chain-id <id>       Chain ID (default: 8453 for Base)
 *   --rpc <url>           RPC URL (default: https://mainnet.base.org)
 *   --auto-approve        Auto-approve all requests (default: true)
 *
 * Environment Variables:
 *   PRIVATE_KEY           Wallet private key (required)
 *   WC_PROJECT_ID         WalletConnect Project ID (optional)
 *
 * Security Note:
 *   Never commit your private key! Use environment variables or secure storage.
 */

const { Core } = require('@walletconnect/core')
const { Web3Wallet } = require('@walletconnect/web3wallet')
const { ethers } = require('ethers')

// Default configuration
const DEFAULT_CHAIN_ID = 8453 // Base
const DEFAULT_RPC = 'https://mainnet.base.org'
const DEFAULT_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64' // Public test project ID

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    uri: null,
    privateKey: process.env.PRIVATE_KEY,
    chainId: parseInt(process.env.CHAIN_ID) || DEFAULT_CHAIN_ID,
    rpc: process.env.RPC_URL || DEFAULT_RPC,
    projectId: process.env.WC_PROJECT_ID || DEFAULT_PROJECT_ID,
    autoApprove: true,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('wc:')) {
      config.uri = arg
    } else if (arg === '--private-key' && args[i + 1]) {
      config.privateKey = args[++i]
    } else if (arg === '--chain-id' && args[i + 1]) {
      config.chainId = parseInt(args[++i])
    } else if (arg === '--rpc' && args[i + 1]) {
      config.rpc = args[++i]
    } else if (arg === '--project-id' && args[i + 1]) {
      config.projectId = args[++i]
    } else if (arg === '--no-auto-approve') {
      config.autoApprove = false
    }
  }

  return config
}

async function main() {
  const config = parseArgs()

  if (!config.uri) {
    console.error('Usage: node wc-connect.js <walletconnect-uri> [options]')
    console.error('\nOptions:')
    console.error('  --private-key <key>   Private key (or set PRIVATE_KEY env var)')
    console.error('  --chain-id <id>       Chain ID (default: 8453 for Base)')
    console.error('  --rpc <url>           RPC URL')
    console.error('\nExample:')
    console.error('  PRIVATE_KEY=0x... node wc-connect.js "wc:..."')
    process.exit(1)
  }

  if (!config.privateKey) {
    console.error('❌ Error: Private key required')
    console.error('Set PRIVATE_KEY environment variable or use --private-key flag')
    process.exit(1)
  }

  // Initialize wallet
  const provider = new ethers.JsonRpcProvider(config.rpc)
  const wallet = new ethers.Wallet(config.privateKey, provider)
  const address = wallet.address

  console.log('🦞 WalletConnect v2 Agent Connector')
  console.log('═'.repeat(50))
  console.log(`📍 Address: ${address}`)
  console.log(`⛓️  Chain: ${config.chainId}`)
  console.log(`🔗 RPC: ${config.rpc}`)

  // Initialize WalletConnect Core
  const core = new Core({
    projectId: config.projectId,
  })

  // Initialize Web3Wallet
  const web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: 'AI Agent Wallet',
      description: 'Autonomous AI Agent Wallet powered by Clawdbot',
      url: 'https://clawd.bot',
      icons: ['https://clawd.bot/logo.png'],
    },
  })

  console.log('\n📡 Connecting to dApp...')

  // Handle session proposals
  web3wallet.on('session_proposal', async (proposal) => {
    console.log('\n✅ Session proposal received!')
    console.log(`   dApp: ${proposal.params.proposer.metadata.name}`)

    if (config.autoApprove) {
      const namespaces = {
        eip155: {
          accounts: [`eip155:${config.chainId}:${address}`],
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4',
          ],
          events: ['chainChanged', 'accountsChanged'],
          chains: [`eip155:${config.chainId}`],
        },
      }

      const session = await web3wallet.approveSession({
        id: proposal.id,
        namespaces,
      })

      console.log('✅ Session approved!')
      console.log(`   Topic: ${session.topic}`)
    }
  })

  // Handle signing requests
  web3wallet.on('session_request', async (event) => {
    const { topic, params, id } = event
    const { request } = params

    console.log('\n📝 Request received:')
    console.log(`   Method: ${request.method}`)

    try {
      let result

      switch (request.method) {
        case 'personal_sign': {
          const [message, from] = request.params
          console.log(`   Signing message for ${from}`)
          // Handle hex messages properly
          if (ethers.isHexString(message)) {
            result = await wallet.signMessage(ethers.getBytes(message))
          } else {
            result = await wallet.signMessage(message)
          }
          break
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          const [from, data] = request.params
          console.log(`   Signing typed data for ${from}`)
          const typedData = typeof data === 'string' ? JSON.parse(data) : data
          const { domain, types, message } = typedData
          delete types.EIP712Domain
          result = await wallet.signTypedData(domain, types, message)
          break
        }

        case 'eth_sendTransaction': {
          const [tx] = request.params
          console.log(`   Sending transaction:`)
          console.log(`   To: ${tx.to}`)
          console.log(`   Value: ${tx.value || '0'}`)

          const txResponse = await wallet.sendTransaction({
            to: tx.to,
            value: tx.value || '0x0',
            data: tx.data || '0x',
            gasLimit: tx.gas || tx.gasLimit,
          })

          console.log(`   ✅ TX Hash: ${txResponse.hash}`)
          result = txResponse.hash
          break
        }

        case 'eth_sign': {
          const [from, message] = request.params
          result = await wallet.signMessage(ethers.getBytes(message))
          break
        }

        default:
          throw new Error(`Unsupported method: ${request.method}`)
      }

      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result,
        },
      })

      console.log('✅ Request completed!')
    } catch (error) {
      console.error('❌ Error:', error.message)
      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: {
            code: 5000,
            message: error.message,
          },
        },
      })
    }
  })

  // Connect to URI
  try {
    await web3wallet.pair({ uri: config.uri })
    console.log('✅ Pairing initiated! Waiting for session...')
  } catch (error) {
    console.error('❌ Pairing failed:', error.message)
    process.exit(1)
  }

  // Keep running
  console.log('\n⏳ Listening for requests... (Press Ctrl+C to exit)')
}

main().catch(console.error)
