#!/usr/bin/env node
/**
 * Check ETH and token balances on Abstract
 *
 * Usage:
 *   node check-balances.js <wallet-address> [token-address]
 *
 * Examples:
 *   node check-balances.js 0x1234...  # Check ETH balance
 *   node check-balances.js 0x1234... 0x84A7...  # Check specific token
 *   node check-balances.js 0x1234... all  # Check ETH + common tokens
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

// Common tokens on Abstract
const TOKENS = {
  USDC: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1',
  WETH: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809',
}

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

async function getEthBalance(provider, address) {
  const balance = await provider.getBalance(address)
  return ethers.formatEther(balance)
}

async function getTokenBalance(provider, walletAddress, tokenAddress) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const [balance, decimals, symbol] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals(),
    contract.symbol(),
  ])
  return {
    symbol,
    balance: ethers.formatUnits(balance, decimals),
    raw: balance.toString(),
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log('Usage: node check-balances.js <wallet-address> [token-address|all]')
    process.exit(1)
  }

  const walletAddress = args[0]
  const tokenArg = args[1]

  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  console.log(`\n📊 Balances for ${walletAddress}`)
  console.log(`Chain: Abstract (${ABSTRACT_RPC})\n`)

  // Always show ETH
  const ethBalance = await getEthBalance(provider, walletAddress)
  console.log(`ETH: ${ethBalance}`)

  if (tokenArg === 'all') {
    // Check all common tokens
    for (const [name, address] of Object.entries(TOKENS)) {
      try {
        const token = await getTokenBalance(provider, walletAddress, address)
        console.log(`${token.symbol}: ${token.balance}`)
      } catch (e) {
        console.log(`${name}: Error - ${e.message}`)
      }
    }
  } else if (tokenArg) {
    // Check specific token
    try {
      const token = await getTokenBalance(provider, walletAddress, tokenArg)
      console.log(`${token.symbol}: ${token.balance}`)
    } catch (e) {
      console.log(`Token error: ${e.message}`)
    }
  }

  console.log('')
}

main().catch(console.error)
