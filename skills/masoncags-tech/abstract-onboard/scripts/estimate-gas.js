#!/usr/bin/env node
/**
 * Estimate gas costs on Abstract before executing transactions
 *
 * Usage:
 *   node estimate-gas.js transfer <to> <amount>
 *   node estimate-gas.js swap <tokenIn> <tokenOut> <amount>
 *   node estimate-gas.js deploy <bytecodeSize>
 *   node estimate-gas.js call <contract> <method> [args...]
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

async function getGasPrice(provider) {
  const feeData = await provider.getFeeData()
  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  }
}

async function estimateTransfer(provider, to, amount) {
  // Simple ETH transfer
  const gasLimit = 21000n // Standard ETH transfer
  const fees = await getGasPrice(provider)

  return {
    type: 'ETH Transfer',
    gasLimit: gasLimit.toString(),
    estimatedCost: ethers.formatEther(gasLimit * (fees.gasPrice || 0n)),
    fees,
  }
}

async function estimateContractCall(provider, contract, method, args = []) {
  // Generic contract call estimation
  const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
  ]

  try {
    const contractInstance = new ethers.Contract(contract, ERC20_ABI, provider)
    const gasEstimate = await contractInstance[method].estimateGas(...args)
    const fees = await getGasPrice(provider)

    return {
      type: `Contract Call: ${method}`,
      gasLimit: gasEstimate.toString(),
      estimatedCost: ethers.formatEther(gasEstimate * (fees.gasPrice || 0n)),
      fees,
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function estimateDeploy(bytecodeSize) {
  // Rough estimation for contract deployment
  // zkSync deployments are different from EVM, this is approximate
  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)
  const fees = await getGasPrice(provider)

  // Base cost + per-byte cost (rough estimate for zkSync)
  const baseGas = 100000n
  const perByteGas = 16n
  const gasLimit = baseGas + BigInt(bytecodeSize) * perByteGas

  return {
    type: 'Contract Deployment (estimate)',
    bytecodeSize,
    gasLimit: gasLimit.toString(),
    estimatedCost: ethers.formatEther(gasLimit * (fees.gasPrice || 0n)),
    note: 'zkSync deployment costs vary - this is approximate',
    fees,
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)
  const [, , action, ...args] = process.argv

  console.log('⛽ Gas Estimation for Abstract\n')

  // Get current gas prices
  const fees = await getGasPrice(provider)
  console.log('Current Gas Prices:')
  console.log(`  Gas Price: ${ethers.formatUnits(fees.gasPrice || 0n, 'gwei')} gwei`)
  console.log(`  Max Fee: ${ethers.formatUnits(fees.maxFeePerGas || 0n, 'gwei')} gwei`)
  console.log(`  Priority Fee: ${ethers.formatUnits(fees.maxPriorityFeePerGas || 0n, 'gwei')} gwei`)
  console.log('')

  if (!action) {
    // Just show gas prices
    console.log('Usage:')
    console.log('  node estimate-gas.js transfer <to> <amount>')
    console.log('  node estimate-gas.js deploy <bytecodeSize>')
    console.log('  node estimate-gas.js call <contract> <method> [args...]')
    return
  }

  let result
  switch (action) {
    case 'transfer':
      result = await estimateTransfer(provider, args[0], args[1])
      break
    case 'deploy':
      result = await estimateDeploy(parseInt(args[0]) || 10000)
      break
    case 'call':
      result = await estimateContractCall(provider, args[0], args[1], args.slice(2))
      break
    default:
      console.log('Unknown action:', action)
      return
  }

  console.log('Estimation Result:')
  console.log(JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
}

main().catch(console.error)
