#!/usr/bin/env node
/**
 * Quick Start for AI Agents on Abstract
 *
 * One command to verify your agent is ready to operate on Abstract.
 *
 * Usage:
 *   node quick-start.js                    # Interactive setup guide
 *   node quick-start.js check <wallet>     # Quick health check
 *   node quick-start.js full-setup         # Step-by-step setup
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
const USDC_ADDRESS = '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

async function quickHealthCheck(wallet) {
  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  console.log('🏥 Agent Health Check for Abstract\n')
  console.log(`Wallet: ${wallet}\n`)

  const results = {
    network: { status: 'checking' },
    ethBalance: { status: 'checking' },
    usdcBalance: { status: 'checking' },
    gasPrice: { status: 'checking' },
  }

  // Check network connection
  try {
    const network = await provider.getNetwork()
    results.network = {
      status: 'ok',
      chainId: Number(network.chainId),
      name: 'Abstract Mainnet',
    }
    console.log('✅ Network: Connected to Abstract (Chain ID: 2741)')
  } catch (e) {
    results.network = { status: 'error', message: e.message }
    console.log('❌ Network: Connection failed')
  }

  // Check ETH balance
  try {
    const balance = await provider.getBalance(wallet)
    const ethAmount = parseFloat(ethers.formatEther(balance))
    results.ethBalance = {
      status: ethAmount > 0.001 ? 'ok' : 'low',
      amount: ethAmount,
    }
    const icon = ethAmount > 0.001 ? '✅' : '⚠️'
    console.log(`${icon} ETH Balance: ${ethAmount.toFixed(6)} ETH`)
    if (ethAmount < 0.001) {
      console.log('   💡 Consider bridging more ETH for gas')
    }
  } catch (e) {
    results.ethBalance = { status: 'error', message: e.message }
    console.log('❌ ETH Balance: Could not fetch')
  }

  // Check USDC balance
  try {
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider)
    const balance = await usdc.balanceOf(wallet)
    const decimals = await usdc.decimals()
    const usdcAmount = parseFloat(ethers.formatUnits(balance, decimals))
    results.usdcBalance = {
      status: usdcAmount > 0 ? 'ok' : 'zero',
      amount: usdcAmount,
    }
    const icon = usdcAmount > 0 ? '✅' : 'ℹ️'
    console.log(`${icon} USDC Balance: ${usdcAmount.toFixed(2)} USDC`)
  } catch (e) {
    results.usdcBalance = { status: 'error', message: e.message }
    console.log('❌ USDC Balance: Could not fetch')
  }

  // Check gas prices
  try {
    const feeData = await provider.getFeeData()
    const gasPrice = parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'))
    results.gasPrice = {
      status: 'ok',
      gwei: gasPrice,
    }
    console.log(`✅ Gas Price: ${gasPrice.toFixed(4)} gwei`)
  } catch (e) {
    results.gasPrice = { status: 'error', message: e.message }
    console.log('❌ Gas Price: Could not fetch')
  }

  console.log('\n' + '='.repeat(50))

  // Summary
  const allOk =
    results.network.status === 'ok' &&
    results.ethBalance.status === 'ok' &&
    results.gasPrice.status === 'ok'

  if (allOk) {
    console.log('🎉 Agent is ready to operate on Abstract!')
  } else if (results.ethBalance.status === 'low') {
    console.log('⚠️ Agent needs more ETH for gas. Use relay-bridge.js to bridge funds.')
  } else {
    console.log('❌ Some checks failed. Review the issues above.')
  }

  return results
}

function showSetupGuide() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🚀 AI Agent Quick Start for Abstract               ║
╚══════════════════════════════════════════════════════════════╝

Welcome! This guide will help you get your AI agent running on Abstract.

📋 PREREQUISITES
────────────────
1. Node.js 18+ installed
2. A wallet with private key (EOA)
3. Some ETH on Ethereum mainnet (for bridging)

🔧 STEP 1: SET UP ENVIRONMENT
─────────────────────────────
export WALLET_PRIVATE_KEY="0x..."   # Your EOA private key
export WALLET_ADDRESS="0x..."       # Your EOA address

🌉 STEP 2: BRIDGE ETH TO ABSTRACT
─────────────────────────────────
# Use Relay to bridge ETH from any chain to Abstract
node relay-bridge.js <amount>

Example: node relay-bridge.js 0.05
(Bridges 0.05 ETH from Ethereum to Abstract)

✅ STEP 3: VERIFY SETUP
───────────────────────
node quick-start.js check $WALLET_ADDRESS

🎮 STEP 4: START OPERATING
──────────────────────────
Now you can:
• Check balances:    node check-balances.js $WALLET_ADDRESS all
• Transfer ETH:      node transfer.js <to> <amount>
• Transfer USDC:     node usdc-ops.js transfer <to> <amount>
• Swap tokens:       node swap-tokens.js <tokenIn> <tokenOut> <amount>
• Deploy contracts:  node deploy-abstract.js <artifactPath>
• Watch events:      node watch-events.js blocks

📚 KEY ADDRESSES
────────────────
• USDC: 0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1
• WETH: 0x3439153EB7AF838Ad19d56E1571FBD09333C2809

🔗 RESOURCES
────────────
• Explorer: https://abscan.org
• Bridge: https://relay.link/bridge/abstract
• Docs: https://docs.abs.xyz

Need help? Join the Abstract Discord or ask @BigHossbot on Twitter 😈
`)
}

async function main() {
  const [, , action, ...args] = process.argv

  if (!action) {
    showSetupGuide()
    return
  }

  switch (action) {
    case 'check':
      if (!args[0]) {
        console.error('Usage: node quick-start.js check <wallet>')
        return
      }
      await quickHealthCheck(args[0])
      break

    case 'full-setup':
      showSetupGuide()
      break

    default:
      console.log('Unknown action:', action)
      console.log('\nUsage:')
      console.log('  node quick-start.js              # Show setup guide')
      console.log('  node quick-start.js check <wallet>  # Quick health check')
  }
}

main().catch(console.error)
