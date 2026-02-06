#!/usr/bin/env node
/**
 * Call any contract function on Abstract
 *
 * Usage (read):
 *   node call-contract.js --address 0x... --abi ./abi.json --function balanceOf --args 0x1234
 *
 * Usage (write):
 *   export WALLET_PRIVATE_KEY=0x...
 *   node call-contract.js --address 0x... --abi ./abi.json --function transfer --args 0x1234,100 --write
 */

const { ethers } = require('ethers')
const fs = require('fs')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

async function main() {
  const args = process.argv.slice(2)

  let address = null
  let abiPath = null
  let functionName = null
  let functionArgs = []
  let isWrite = false
  let value = '0'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--address') address = args[++i]
    else if (args[i] === '--abi') abiPath = args[++i]
    else if (args[i] === '--function') functionName = args[++i]
    else if (args[i] === '--args') functionArgs = args[++i].split(',')
    else if (args[i] === '--write') isWrite = true
    else if (args[i] === '--value') value = args[++i]
  }

  if (!address || !abiPath || !functionName) {
    console.log(
      'Usage: node call-contract.js --address <addr> --abi <path> --function <name> [--args a,b,c] [--write] [--value 0.1]',
    )
    process.exit(1)
  }

  // Load ABI
  let abi
  try {
    const abiContent = fs.readFileSync(abiPath, 'utf8')
    const parsed = JSON.parse(abiContent)
    abi = parsed.abi || parsed // Handle both formats
  } catch (e) {
    console.error(`Failed to load ABI: ${e.message}`)
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  let signer = provider
  if (isWrite) {
    const privateKey = process.env.WALLET_PRIVATE_KEY
    if (!privateKey) {
      console.error('Error: WALLET_PRIVATE_KEY not set (required for write operations)')
      process.exit(1)
    }
    signer = new ethers.Wallet(privateKey, provider)
    console.log(`Wallet: ${signer.address}`)
  }

  const contract = new ethers.Contract(address, abi, signer)

  console.log(`\n📝 Contract Call on Abstract`)
  console.log(`Contract: ${address}`)
  console.log(`Function: ${functionName}`)
  console.log(`Args: ${functionArgs.length > 0 ? functionArgs.join(', ') : 'none'}`)
  console.log(`Type: ${isWrite ? 'WRITE' : 'READ'}\n`)

  try {
    if (isWrite) {
      const tx = await contract[functionName](...functionArgs, {
        value: ethers.parseEther(value),
      })
      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`)
      console.log(`Explorer: https://abscan.org/tx/${tx.hash}`)
    } else {
      const result = await contract[functionName](...functionArgs)
      console.log(`Result:`, result.toString ? result.toString() : result)
    }
  } catch (e) {
    console.error(`Call failed: ${e.message}`)
    process.exit(1)
  }
}

main().catch(console.error)
