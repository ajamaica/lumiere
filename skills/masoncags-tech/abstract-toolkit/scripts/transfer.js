#!/usr/bin/env node
/**
 * Transfer ETH or tokens on Abstract
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node transfer.js --to 0x... --amount 0.01            # Send ETH
 *   node transfer.js --to 0x... --amount 100 --token USDC # Send token
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

const TOKENS = {
  USDC: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1',
  WETH: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809',
}

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

async function main() {
  const args = process.argv.slice(2)

  let to = null
  let amount = null
  let token = null // null = ETH

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--to') to = args[++i]
    else if (args[i] === '--amount') amount = args[++i]
    else if (args[i] === '--token') token = args[++i].toUpperCase()
  }

  if (!to || !amount) {
    console.log('Usage: node transfer.js --to <address> --amount <amount> [--token USDC]')
    process.exit(1)
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY not set')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`\n📤 Transfer on Abstract`)
  console.log(`From: ${wallet.address}`)
  console.log(`To: ${to}`)
  console.log(`Amount: ${amount} ${token || 'ETH'}\n`)

  try {
    if (!token) {
      // Transfer ETH
      const tx = await wallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount),
      })
      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Transfer complete! Block: ${receipt.blockNumber}`)
    } else {
      // Transfer token
      const tokenAddress = TOKENS[token] || token
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)

      const decimals = await contract.decimals()
      const symbol = await contract.symbol()
      const amountParsed = ethers.parseUnits(amount, decimals)

      // Check balance
      const balance = await contract.balanceOf(wallet.address)
      if (balance < amountParsed) {
        console.error(
          `Insufficient balance. Have: ${ethers.formatUnits(balance, decimals)} ${symbol}`,
        )
        process.exit(1)
      }

      const tx = await contract.transfer(to, amountParsed)
      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Transfer complete! Block: ${receipt.blockNumber}`)
    }

    console.log(`Explorer: https://abscan.org/tx/${tx?.hash || ''}`)
  } catch (e) {
    console.error(`Transfer failed: ${e.message}`)
    process.exit(1)
  }
}

main().catch(console.error)
