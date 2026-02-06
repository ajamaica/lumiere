#!/usr/bin/env node

/**
 * Contract Interaction Script - Call any contract function
 * Usage: node src/contract.js <chain> <address> <functionSig> [args...] [--value <eth>]
 */

import { encodeFunctionData, formatEther, isAddress, parseAbi, parseEther } from 'viem'

import { printUpdateNag } from './check-update.js'
import { getChain, getExplorerTxUrl } from './lib/chains.js'
import { estimateGas, estimateGasLimit, formatGwei } from './lib/gas.js'
import { createPublicClientWithRetry } from './lib/rpc.js'
import { exists, getWalletClient } from './lib/wallet.js'

// Parse command line arguments
const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const yesFlag = args.includes('--yes') || args.includes('-y')
const helpFlag = args.includes('--help') || args.includes('-h')

// Extract --value flag
let valueInEth = '0'
const valueIndex = args.indexOf('--value')
if (valueIndex !== -1 && valueIndex < args.length - 1) {
  valueInEth = args[valueIndex + 1]
  args.splice(valueIndex, 2) // Remove --value and its parameter
}

function showHelp() {
  console.log(`
EVM Contract Interaction

Usage: node src/contract.js [options] <chain> <address> <functionSig> [args...] [--value <eth>]

Arguments:
  chain          Chain name (base, ethereum, polygon, arbitrum, optimism)
  address        Contract address
  functionSig    Function signature (e.g., "balanceOf(address)" or "transfer(address,uint256)")
  args           Function arguments (space-separated)

Options:
  --value <eth>  ETH value to send with transaction (for payable functions)
  --yes          Skip confirmation prompt (for write operations)
  --json         Output in JSON format
  --help         Show this help message

Examples:
  # Read operations (view/pure functions)
  node src/contract.js base 0x833589fcd... "balanceOf(address)" 0x123...
  node src/contract.js ethereum 0x123... "symbol()"
  node src/contract.js base 0x456... "allowance(address,address)" 0x111... 0x222...
  
  # Write operations (state-changing functions)
  node src/contract.js base 0x833589fcd... "transfer(address,uint256)" 0x123... 1000000
  node src/contract.js base 0x456... "approve(address,uint256)" 0x123... 1000000000 --yes
  
  # Payable functions
  node src/contract.js ethereum 0x789... "deposit()" --value 0.1
  node src/contract.js base 0x456... "mint(address)" 0x123... --value 0.01 --yes
`)
}

function exitWithError(message, code = 1) {
  if (jsonFlag) {
    console.log(JSON.stringify({ success: false, error: message }))
  } else {
    console.error(`Error: ${message}`)
  }
  process.exit(code)
}

/**
 * Parse function signature to extract name and parameter types
 */
function parseFunctionSignature(sig) {
  const match = sig.match(/^(\w+)\((.*)\)$/)
  if (!match) {
    throw new Error('Invalid function signature format. Expected: functionName(type1,type2,...)')
  }

  const [, functionName, paramsStr] = match
  const paramTypes = paramsStr ? paramsStr.split(',').map((p) => p.trim()) : []

  return { functionName, paramTypes }
}

/**
 * Parse argument based on Solidity type
 */
function parseArgument(arg, type) {
  const normalizedType = type.toLowerCase()

  if (normalizedType === 'address') {
    if (!isAddress(arg)) {
      throw new Error(`Invalid address: ${arg}`)
    }
    return arg
  }

  if (normalizedType.startsWith('uint') || normalizedType.startsWith('int')) {
    // Handle integers
    return BigInt(arg)
  }

  if (normalizedType === 'bool') {
    if (arg.toLowerCase() === 'true' || arg === '1') {
      return true
    } else if (arg.toLowerCase() === 'false' || arg === '0') {
      return false
    } else {
      throw new Error(`Invalid boolean value: ${arg}. Use true/false or 1/0`)
    }
  }

  if (normalizedType === 'string') {
    return arg
  }

  if (normalizedType.startsWith('bytes')) {
    // Handle bytes types
    if (!arg.startsWith('0x')) {
      throw new Error(`Bytes value must start with 0x: ${arg}`)
    }
    return arg
  }

  if (normalizedType.includes('[]')) {
    // Handle arrays - for now, just return as string and let viem handle it
    throw new Error('Array types not yet supported. Please encode manually.')
  }

  // Default: return as string
  return arg
}

/**
 * Determine if function is read-only (view/pure)
 */
function isReadOnlyFunction(functionSig) {
  // This is a simple heuristic - in practice you'd want to query the contract ABI
  const readOnlyPrefixes = [
    'balanceOf',
    'allowance',
    'symbol',
    'name',
    'decimals',
    'totalSupply',
    'get',
  ]
  const functionName = parseFunctionSignature(functionSig).functionName.toLowerCase()

  return readOnlyPrefixes.some((prefix) => functionName.startsWith(prefix.toLowerCase()))
}

/**
 * Format result based on type
 */
function formatResult(result, functionSig) {
  if (typeof result === 'bigint') {
    return result.toString()
  }

  if (typeof result === 'string' || typeof result === 'boolean') {
    return result
  }

  if (Array.isArray(result)) {
    return result.map((item) => (typeof item === 'bigint' ? item.toString() : item))
  }

  return result
}

/**
 * Prompt for user confirmation
 */
async function confirm(message) {
  if (yesFlag || jsonFlag) {
    return true
  }

  process.stdout.write(`${message} (y/N): `)

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const response = data.toString().trim().toLowerCase()
      resolve(response === 'y' || response === 'yes')
    })
  })
}

async function main() {
  try {
    if (helpFlag) {
      showHelp()
      return
    }

    // Check if wallet exists
    if (!exists()) {
      exitWithError('No wallet found. Run setup.js first to generate a wallet.')
    }

    // Parse arguments (exclude flags)
    const filteredArgs = args.filter((arg) => !arg.startsWith('--') && arg !== valueInEth)
    const [chainName, contractAddress, functionSig, ...functionArgs] = filteredArgs

    if (!chainName || !contractAddress || !functionSig) {
      exitWithError('Missing required arguments. Use --help for usage information.')
    }

    // Validate contract address
    if (!isAddress(contractAddress)) {
      exitWithError('Invalid contract address.')
    }

    // Parse function signature
    let parsedFunction
    try {
      parsedFunction = parseFunctionSignature(functionSig)
    } catch (error) {
      exitWithError(error.message)
    }

    // Validate argument count
    if (functionArgs.length !== parsedFunction.paramTypes.length) {
      exitWithError(
        `Expected ${parsedFunction.paramTypes.length} arguments, got ${functionArgs.length}`,
      )
    }

    // Parse arguments
    let parsedArgs
    try {
      parsedArgs = functionArgs.map((arg, i) => parseArgument(arg, parsedFunction.paramTypes[i]))
    } catch (error) {
      exitWithError(`Argument parsing error: ${error.message}`)
    }

    const chain = getChain(chainName)
    const publicClient = createPublicClientWithRetry(chainName)
    const walletClient = getWalletClient(chainName)
    const walletAddress = walletClient.account.address

    // Create ABI for the function
    const abi = parseAbi([
      `function ${functionSig}${parsedFunction.paramTypes.length === 0 ? ' view' : ''}`,
    ])

    const isReadOnly = isReadOnlyFunction(functionSig)
    const value = parseEther(valueInEth)

    if (isReadOnly) {
      // Read-only function call
      try {
        const result = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: parsedFunction.functionName,
          args: parsedArgs,
        })

        const formattedResult = formatResult(result, functionSig)

        if (jsonFlag) {
          console.log(
            JSON.stringify(
              {
                success: true,
                result: formattedResult,
                function: functionSig,
                contract: contractAddress,
                chain: chainName,
              },
              null,
              2,
            ),
          )
        } else {
          console.log(`\n📖 Contract Read Result`)
          console.log(`Contract: ${contractAddress}`)
          console.log(`Function: ${functionSig}`)
          console.log(`Chain: ${chain.name}`)
          console.log(`Result: ${formattedResult}`)
        }
      } catch (error) {
        exitWithError(`Contract read failed: ${error.message}`)
      }
    } else {
      // Write function - requires transaction

      // Estimate gas
      let gasEstimate
      try {
        gasEstimate = await estimateGas(chainName)
        const gasLimit = await estimateGasLimit(publicClient, {
          to: contractAddress,
          data: encodeFunctionData({
            abi,
            functionName: parsedFunction.functionName,
            args: parsedArgs,
          }),
          value,
          account: walletAddress,
        })
        gasEstimate.gasLimit = gasLimit
      } catch (error) {
        exitWithError(`Gas estimation failed: ${error.message}`)
      }

      const estimatedGasCost = gasEstimate.maxFeePerGas * gasEstimate.gasLimit
      const estimatedGasCostEth = formatEther(estimatedGasCost)

      // Show confirmation details
      const confirmationMessage = `
🔧 Contract Call Details:
  Contract: ${contractAddress}
  Function: ${functionSig}
  Arguments: [${functionArgs.join(', ')}]
  Chain: ${chain.name}
  ${value > 0 ? `Value: ${valueInEth} ETH` : ''}
  
⛽ Gas Estimate:
  Gas Limit: ${gasEstimate.gasLimit.toLocaleString()}
  Max Fee: ${formatGwei(gasEstimate.maxFeePerGas)} gwei
  Est. Cost: ${estimatedGasCostEth} ETH
  
💰 Total Cost: ${(parseFloat(valueInEth) + parseFloat(estimatedGasCostEth)).toFixed(6)} ETH

Proceed with transaction?`

      if (!jsonFlag) {
        console.log(confirmationMessage)
      }

      const confirmed = await confirm('')
      if (!confirmed) {
        if (jsonFlag) {
          console.log(JSON.stringify({ success: false, error: 'Transaction cancelled by user' }))
        } else {
          console.log('❌ Transaction cancelled.')
        }
        return
      }

      // Execute transaction
      let txHash
      try {
        txHash = await walletClient.writeContract({
          address: contractAddress,
          abi,
          functionName: parsedFunction.functionName,
          args: parsedArgs,
          value,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
          gas: gasEstimate.gasLimit,
        })
      } catch (error) {
        exitWithError(`Transaction failed: ${error.message}`)
      }

      const explorerUrl = getExplorerTxUrl(chainName, txHash)

      if (jsonFlag) {
        console.log(
          JSON.stringify(
            {
              success: true,
              txHash,
              explorerUrl,
              contract: contractAddress,
              function: functionSig,
              args: functionArgs,
              value: valueInEth,
              chain: chainName,
              gasUsed: {
                maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
                maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas.toString(),
                gasLimit: gasEstimate.gasLimit.toString(),
                estimatedCostEth: estimatedGasCostEth,
              },
            },
            null,
            2,
          ),
        )
      } else {
        console.log('\n✅ Transaction successful!')
        console.log(`Tx Hash: ${txHash}`)
        console.log(`Explorer: ${explorerUrl}`)
        console.log(`\nCalled ${functionSig} on ${contractAddress}`)
        if (value > 0) {
          console.log(`Sent: ${valueInEth} ETH`)
        }
        console.log(`Gas used: ~${estimatedGasCostEth} ETH`)
        console.log('\n💡 Transaction may take a few minutes to confirm.')
      }
    }
  } catch (error) {
    exitWithError(`Unexpected error: ${error.message}`)
  }
}

main()
  .then(() => printUpdateNag())
  .catch((error) => {
    exitWithError(`Unexpected error: ${error.message}`)
  })
