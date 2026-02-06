#!/usr/bin/env node
/**
 * Print all agent wallet addresses for whitelisting during a demo.
 * Run from agent project: node src/show-agent-addresses.js (or npm run addresses).
 * Package: https://github.com/FinTechTonic/autonomous-agent
 * Then add each address at http://localhost:4024/flow.html (EVM and Aptos rows; optional testnet/mainnet tag).
 */

import { exists as aptosExists, getAllWalletInfos as getAptosAll } from './lib/aptos/wallet.js'
import { exists as evmExists, getAllWalletInfos as getEvmAll } from './lib/wallet.js'

const aptosList = aptosExists() ? getAptosAll() : []
const evmList = evmExists() ? getEvmAll() : []

console.log('\nAgent wallet addresses (whitelist these at http://localhost:4024/flow.html):')
console.log(
  '  Add multiple EVM and Aptos rows as needed; optionally tag each as testnet or mainnet.\n',
)
if (aptosList.length) {
  aptosList.forEach((w, i) => {
    const net = w.network ? ` [${w.network}]` : ''
    console.log(`  Aptos (run_prediction, run_backtest)${net}: ${w.address}`)
  })
} else {
  console.log(
    '  Aptos: none. Run: node src/setup-aptos.js or create_aptos_wallet (optionally network: "testnet"|"mainnet").',
  )
}
if (evmList.length) {
  evmList.forEach((w, i) => {
    const net = w.network ? ` [${w.network}]` : ''
    console.log(`  EVM (link_bank_account)${net}:             ${w.address}`)
  })
} else {
  console.log(
    '  EVM: none. Run: node src/setup.js or create_evm_wallet (optionally network: "testnet"|"mainnet"); or set EVM_PRIVATE_KEY.',
  )
}
console.log('')
