#!/usr/bin/env node
/**
 * USDC Operations on Abstract
 *
 * Usage:
 *   node usdc-ops.js balance <wallet>
 *   node usdc-ops.js transfer <to> <amount>
 *   node usdc-ops.js approve <spender> <amount>
 *   node usdc-ops.js allowance <owner> <spender>
 *
 * Requires: WALLET_PRIVATE_KEY env var for write operations
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
const USDC_ADDRESS = '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'
const USDC_DECIMALS = 6

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

function parseUsdc(amount) {
  return ethers.parseUnits(amount.toString(), USDC_DECIMALS)
}

function formatUsdc(amount) {
  return ethers.formatUnits(amount, USDC_DECIMALS)
}

async function getBalance(provider, wallet) {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider)
  const balance = await usdc.balanceOf(wallet)
  return formatUsdc(balance)
}

async function transfer(wallet, to, amount) {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet)
  const tx = await usdc.transfer(to, parseUsdc(amount))
  console.log('Transaction sent:', tx.hash)
  const receipt = await tx.wait()
  return receipt
}

async function approve(wallet, spender, amount) {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet)
  const tx = await usdc.approve(spender, parseUsdc(amount))
  console.log('Transaction sent:', tx.hash)
  const receipt = await tx.wait()
  return receipt
}

async function getAllowance(provider, owner, spender) {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider)
  const allowance = await usdc.allowance(owner, spender)
  return formatUsdc(allowance)
}

async function main() {
  const [, , action, ...args] = process.argv
  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  console.log('💵 USDC Operations on Abstract')
  console.log(`   Contract: ${USDC_ADDRESS}\n`)

  if (!action) {
    console.log('Usage:')
    console.log('  node usdc-ops.js balance <wallet>')
    console.log('  node usdc-ops.js transfer <to> <amount>')
    console.log('  node usdc-ops.js approve <spender> <amount>')
    console.log('  node usdc-ops.js allowance <owner> <spender>')
    return
  }

  switch (action) {
    case 'balance': {
      const wallet = args[0]
      if (!wallet) {
        console.error('Usage: node usdc-ops.js balance <wallet>')
        return
      }
      const balance = await getBalance(provider, wallet)
      console.log(`Balance: ${balance} USDC`)
      break
    }

    case 'transfer': {
      const [to, amount] = args
      if (!to || !amount) {
        console.error('Usage: node usdc-ops.js transfer <to> <amount>')
        return
      }
      const pk = process.env.WALLET_PRIVATE_KEY
      if (!pk) {
        console.error('WALLET_PRIVATE_KEY not set')
        return
      }
      const wallet = new ethers.Wallet(pk, provider)
      console.log(`Transferring ${amount} USDC to ${to}...`)
      const receipt = await transfer(wallet, to, amount)
      console.log('✅ Transfer complete!')
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Hash: ${receipt.hash}`)
      break
    }

    case 'approve': {
      const [spender, amount] = args
      if (!spender || !amount) {
        console.error('Usage: node usdc-ops.js approve <spender> <amount>')
        return
      }
      const pk = process.env.WALLET_PRIVATE_KEY
      if (!pk) {
        console.error('WALLET_PRIVATE_KEY not set')
        return
      }
      const wallet = new ethers.Wallet(pk, provider)
      console.log(`Approving ${amount} USDC for ${spender}...`)
      const receipt = await approve(wallet, spender, amount)
      console.log('✅ Approval complete!')
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Hash: ${receipt.hash}`)
      break
    }

    case 'allowance': {
      const [owner, spender] = args
      if (!owner || !spender) {
        console.error('Usage: node usdc-ops.js allowance <owner> <spender>')
        return
      }
      const allowance = await getAllowance(provider, owner, spender)
      console.log(`Allowance: ${allowance} USDC`)
      break
    }

    default:
      console.log('Unknown action:', action)
  }
}

main().catch(console.error)
