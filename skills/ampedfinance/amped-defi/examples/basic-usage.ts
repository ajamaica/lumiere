/**
 * Basic Usage Examples for Amped DeFi Plugin
 */

import { activate, deactivate } from '../src/index'

// Mock agent tools for demonstration
const mockAgentTools = {
  register: (tool: { name: string; summary: string; schema: unknown; handler: Function }) => {
    console.log(`Registered: ${tool.name}`)
  },
}

async function main() {
  console.log('=== Amped DeFi Plugin Examples ===\n')

  // Initialize plugin
  console.log('1. Initializing plugin...')
  await activate(mockAgentTools as any)
  console.log()

  // Example workflows
  await demonstrateCrossChainPositionView()
  await demonstrateSwapWorkflow()
  await demonstrateCrossChainBorrow()

  // Cleanup
  console.log('\n5. Deactivating plugin...')
  await deactivate()
}

async function demonstrateCrossChainPositionView() {
  console.log('2. Cross-Chain Position View Example')
  console.log('   Tool: amped_cross_chain_positions')
  console.log('   Purpose: Get unified portfolio view across all chains')
  console.log('   Parameters: { walletId: "main" }')
  console.log('   Returns:')
  console.log('   - Total supply/borrow across all chains')
  console.log('   - Health factor and liquidation risk')
  console.log('   - Available borrowing power')
  console.log('   - Weighted APYs and net yield')
  console.log('   - Per-chain breakdowns')
  console.log('   - Risk metrics and recommendations')
  console.log()
}

async function demonstrateSwapWorkflow() {
  console.log('3. Swap Workflow Example')
  console.log('   Step 1: Get Quote')
  console.log('   Tool: amped_swap_quote')
  console.log('   Parameters: {')
  console.log('     walletId: "main",')
  console.log('     srcChainId: "ethereum",')
  console.log('     dstChainId: "arbitrum",')
  console.log('     srcToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC')
  console.log('     dstToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDT')
  console.log('     amount: "1000",')
  console.log('     type: "exact_input",')
  console.log('     slippageBps: 100')
  console.log('   }')
  console.log()
  console.log('   Step 2: Execute Swap')
  console.log('   Tool: amped_swap_execute')
  console.log('   Parameters: { walletId, quote, maxSlippageBps: 100 }')
  console.log()
}

async function demonstrateCrossChainBorrow() {
  console.log('4. Cross-Chain Money Market Borrow Example')
  console.log('   Feature: Supply on Chain A, Borrow to Chain B')
  console.log()
  console.log('   Step 1: Supply on Ethereum')
  console.log('   Tool: amped_mm_supply')
  console.log('   Parameters: {')
  console.log('     walletId: "main",')
  console.log('     chainId: "ethereum",')
  console.log('     token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC')
  console.log('     amount: "50000",')
  console.log('     useAsCollateral: true')
  console.log('   }')
  console.log()
  console.log('   Step 2: Borrow to Arbitrum (Cross-Chain!)')
  console.log('   Tool: amped_mm_borrow')
  console.log('   Parameters: {')
  console.log('     walletId: "main",')
  console.log('     chainId: "ethereum",        // Collateral source')
  console.log('     dstChainId: "arbitrum",     // Borrowed tokens destination')
  console.log('     token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDT')
  console.log('     amount: "20000",')
  console.log('     interestRateMode: 2         // Variable rate')
  console.log('   }')
  console.log()
  console.log('   Result: User receives 20k USDT on Arbitrum while collateral stays on Ethereum!')
  console.log()
}

// Run examples
main().catch(console.error)
