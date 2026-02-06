#!/usr/bin/env node
/**
 * Create an Abstract Global Wallet (AGW)
 *
 * AGW is a smart contract wallet that earns XP on Abstract.
 * Your EOA becomes the signer/owner of the AGW.
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node create-agw.js
 *
 * Output: Your AGW address (deterministic based on your EOA)
 */

const { createAbstractClient } = require('@abstract-foundation/agw-client')
const { http, defineChain } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')

const abstractMainnet = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.mainnet.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abscan', url: 'https://abscan.org' },
  },
})

async function main() {
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY environment variable not set')
    console.log('\nUsage:')
    console.log('  export WALLET_PRIVATE_KEY=0x...')
    console.log('  node create-agw.js')
    process.exit(1)
  }

  console.log('🔐 Creating Abstract Global Wallet...\n')

  const account = privateKeyToAccount(privateKey)
  console.log('Signer EOA:', account.address)

  try {
    const abstractClient = await createAbstractClient({
      signer: account,
      chain: abstractMainnet,
      transport: http('https://api.mainnet.abs.xyz'),
    })

    const agwAddress = abstractClient.account?.address

    if (agwAddress) {
      console.log('\n✅ Abstract Global Wallet Ready!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('AGW Address:', agwAddress)
      console.log('Signer EOA:', account.address)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\nExplorer: https://abscan.org/address/' + agwAddress)

      console.log('\n⚠️  IMPORTANT: Funding Flow')
      console.log('   1. Fund your EOA first (small amount for gas)')
      console.log('   2. AGW deploys on first transaction (EOA pays gas)')
      console.log('   3. Then fund AGW with your main balance')
      console.log('   4. All future transactions run through AGW')

      console.log('\n⚠️  VERSION WARNING')
      console.log('   Different agw-client versions compute different AGW addresses!')
      console.log('   If you change library versions, re-run this script to verify')
      console.log("   your AGW address hasn't changed before sending funds.")

      console.log('\n🎮 XP: Once active, your transactions earn Abstract XP!')

      return agwAddress
    } else {
      console.error('Failed to get AGW address')
      process.exit(1)
    }
  } catch (e) {
    console.error('Error:', e.message)
    console.log('\nTroubleshooting:')
    console.log('- Ensure you have @abstract-foundation/agw-client installed')
    console.log('- Check your private key is valid')
    console.log('- Try again - RPC might be slow')
    process.exit(1)
  }
}

main()
