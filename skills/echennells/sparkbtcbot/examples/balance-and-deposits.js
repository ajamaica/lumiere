import 'dotenv/config'

import { SparkWallet } from '@buildonspark/spark-sdk'

if (!process.env.SPARK_MNEMONIC) {
  console.error('SPARK_MNEMONIC not set. Run wallet-setup.js first.')
  process.exit(1)
}

const network = process.env.SPARK_NETWORK || 'MAINNET'

async function main() {
  const { wallet } = await SparkWallet.initialize({
    mnemonicOrSeed: process.env.SPARK_MNEMONIC,
    options: { network },
  })

  // Check BTC balance
  const { balance, tokenBalances } = await wallet.getBalance()
  console.log('=== Balance ===')
  console.log('BTC:', balance.toString(), 'sats')

  // Check token balances
  if (tokenBalances.size > 0) {
    console.log('\n=== Tokens ===')
    for (const [id, info] of tokenBalances) {
      const meta = info.tokenMetadata
      console.log(`${meta.tokenName} (${meta.tokenTicker}): ${info.balance.toString()}`)
    }
  } else {
    console.log('\nNo token balances.')
  }

  // Generate deposit addresses
  console.log('\n=== Deposit Addresses ===')

  const staticAddr = await wallet.getStaticDepositAddress()
  console.log('Static (reusable):', staticAddr)

  const singleAddr = await wallet.getSingleUseDepositAddress()
  console.log('Single-use:       ', singleAddr)

  console.log('\nSend BTC to either address. Deposits need 3 L1 confirmations.')
  console.log('After confirmation, claim with:')
  console.log('  wallet.claimStaticDeposit({ transactionId: "txid", ... })')

  // List recent transfers
  const { transfers } = await wallet.getTransfers(5, 0)
  if (transfers.length > 0) {
    console.log('\n=== Recent Transfers ===')
    for (const tx of transfers) {
      console.log(`  ${tx.id}: ${tx.totalValue} sats [${tx.status}]`)
    }
  } else {
    console.log('\nNo transfers yet.')
  }

  wallet.cleanupConnections()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
