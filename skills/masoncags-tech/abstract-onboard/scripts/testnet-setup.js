#!/usr/bin/env node
/**
 * Abstract Testnet Setup Helper
 *
 * Helps agents get set up on Abstract testnet for testing.
 *
 * Usage:
 *   node testnet-setup.js check <wallet>     # Check testnet balance
 *   node testnet-setup.js faucet             # Get faucet instructions
 *   node testnet-setup.js verify <wallet>    # Verify setup is complete
 */

const { ethers } = require('ethers')

const ABSTRACT_TESTNET_RPC = 'https://api.testnet.abs.xyz'
const ABSTRACT_TESTNET_CHAIN_ID = 11124

// Testnet USDC (if available)
const TESTNET_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // May vary

async function checkTestnetBalance(wallet) {
  const provider = new ethers.JsonRpcProvider(ABSTRACT_TESTNET_RPC)

  try {
    const balance = await provider.getBalance(wallet)
    const network = await provider.getNetwork()

    return {
      wallet,
      chainId: Number(network.chainId),
      ethBalance: ethers.formatEther(balance),
      hasEnoughForTesting: balance > ethers.parseEther('0.001'),
    }
  } catch (e) {
    return { error: e.message }
  }
}

function getFaucetInstructions() {
  return `
🚰 Abstract Testnet Faucet Instructions

Abstract testnet uses Sepolia ETH bridged over.

Option 1: Bridge from Sepolia
  1. Get Sepolia ETH from a faucet:
     - https://sepoliafaucet.com
     - https://www.alchemy.com/faucets/ethereum-sepolia
     - https://faucet.quicknode.com/ethereum/sepolia
  
  2. Bridge to Abstract Testnet:
     - Use the Abstract bridge: https://portal.testnet.abs.xyz
     - Connect wallet, select Sepolia → Abstract Testnet
     - Bridge some ETH (0.01 is plenty for testing)

Option 2: Request from team
  - If you're building on Abstract, reach out to the team
  - They may be able to provide testnet funds directly

Testnet Details:
  - RPC: ${ABSTRACT_TESTNET_RPC}
  - Chain ID: ${ABSTRACT_TESTNET_CHAIN_ID}
  - Explorer: https://sepolia.abscan.org
`
}

async function verifySetup(wallet) {
  console.log('🔍 Verifying Abstract testnet setup...\n')

  const provider = new ethers.JsonRpcProvider(ABSTRACT_TESTNET_RPC)

  const checks = {
    rpcConnection: false,
    walletValid: false,
    hasBalance: false,
    canEstimateGas: false,
  }

  // Check RPC connection
  try {
    const network = await provider.getNetwork()
    checks.rpcConnection = Number(network.chainId) === ABSTRACT_TESTNET_CHAIN_ID
    console.log(`✅ RPC connection: OK (Chain ID: ${network.chainId})`)
  } catch (e) {
    console.log(`❌ RPC connection: Failed - ${e.message}`)
  }

  // Check wallet validity
  try {
    if (ethers.isAddress(wallet)) {
      checks.walletValid = true
      console.log(`✅ Wallet address: Valid`)
    } else {
      console.log(`❌ Wallet address: Invalid`)
    }
  } catch (e) {
    console.log(`❌ Wallet address: ${e.message}`)
  }

  // Check balance
  try {
    const balance = await provider.getBalance(wallet)
    checks.hasBalance = balance > 0n
    console.log(`${checks.hasBalance ? '✅' : '⚠️'} Balance: ${ethers.formatEther(balance)} ETH`)
    if (!checks.hasBalance) {
      console.log(`   Hint: Use 'node testnet-setup.js faucet' for instructions`)
    }
  } catch (e) {
    console.log(`❌ Balance check: ${e.message}`)
  }

  // Check gas estimation works
  try {
    const feeData = await provider.getFeeData()
    checks.canEstimateGas = feeData.gasPrice > 0n
    console.log(`✅ Gas estimation: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`)
  } catch (e) {
    console.log(`❌ Gas estimation: ${e.message}`)
  }

  console.log('\n' + '='.repeat(40))
  const allPassed = Object.values(checks).every((v) => v)
  console.log(
    allPassed ? '✅ All checks passed! Ready to test.' : '⚠️ Some checks failed. See above.',
  )

  return checks
}

async function main() {
  const [, , action, ...args] = process.argv

  console.log('🧪 Abstract Testnet Setup\n')

  if (!action) {
    console.log('Usage:')
    console.log('  node testnet-setup.js check <wallet>   # Check testnet balance')
    console.log('  node testnet-setup.js faucet           # Get faucet instructions')
    console.log('  node testnet-setup.js verify <wallet>  # Verify setup is complete')
    return
  }

  switch (action) {
    case 'check': {
      if (!args[0]) {
        console.error('Usage: node testnet-setup.js check <wallet>')
        return
      }
      const result = await checkTestnetBalance(args[0])
      console.log(JSON.stringify(result, null, 2))
      break
    }

    case 'faucet':
      console.log(getFaucetInstructions())
      break

    case 'verify': {
      if (!args[0]) {
        console.error('Usage: node testnet-setup.js verify <wallet>')
        return
      }
      await verifySetup(args[0])
      break
    }

    default:
      console.log('Unknown action:', action)
  }
}

main().catch(console.error)
