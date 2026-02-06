#!/usr/bin/env node
/**
 * Verify a contract exists on Abstract (has bytecode)
 *
 * Usage:
 *   node verify-contract.js <address>
 *
 * Returns exit code 0 if contract exists, 1 if not
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

async function main() {
  const address = process.argv[2]

  if (!address) {
    console.log('Usage: node verify-contract.js <address>')
    console.log('Example: node verify-contract.js 0x1234...')
    process.exit(1)
  }

  if (!ethers.isAddress(address)) {
    console.error('❌ Invalid address format')
    process.exit(1)
  }

  console.log(`\n🔍 Verifying contract: ${address}`)
  console.log(`Chain: Abstract Mainnet\n`)

  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  try {
    const code = await provider.getCode(address)

    if (!code || code === '0x' || code.length <= 2) {
      console.log('❌ NO BYTECODE FOUND')
      console.log('\nThis address is either:')
      console.log('  - An EOA (regular wallet), not a contract')
      console.log('  - A failed deployment (no code stored)')
      console.log('  - Wrong address')
      console.log('\n⚠️  DO NOT send tokens to this address if expecting a contract!')
      process.exit(1)
    }

    console.log('✅ CONTRACT VERIFIED')
    console.log(`Bytecode size: ${(code.length - 2) / 2} bytes`)
    console.log(`Explorer: https://abscan.org/address/${address}`)

    // Try to detect contract type
    const isERC20 = code.includes('70a08231') // balanceOf selector
    const isERC721 = code.includes('6352211e') // ownerOf selector

    if (isERC20) console.log('\n📝 Likely ERC20 token')
    if (isERC721) console.log('\n📝 Likely ERC721 NFT')

    process.exit(0)
  } catch (e) {
    console.error(`Error: ${e.message}`)
    process.exit(1)
  }
}

main()
