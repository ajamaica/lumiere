import 'dotenv/config'

import { SparkWallet } from '@buildonspark/spark-sdk'

const network = process.env.SPARK_NETWORK || 'MAINNET'

async function main() {
  let wallet
  let mnemonic

  if (process.env.SPARK_MNEMONIC) {
    console.log('Importing existing wallet from SPARK_MNEMONIC...\n')
    const result = await SparkWallet.initialize({
      mnemonicOrSeed: process.env.SPARK_MNEMONIC,
      options: { network },
    })
    wallet = result.wallet
  } else {
    console.log('No SPARK_MNEMONIC found. Generating new wallet...\n')
    const result = await SparkWallet.initialize({
      options: { network },
    })
    wallet = result.wallet
    mnemonic = result.mnemonic
  }

  const address = await wallet.getSparkAddress()
  const identityKey = await wallet.getIdentityPublicKey()

  console.log('=== Spark Wallet ===')
  console.log('Network:      ', network)
  console.log('Spark Address:', address)
  console.log('Identity Key: ', identityKey)

  if (mnemonic) {
    console.log('\n=== SAVE THIS MNEMONIC SECURELY ===')
    console.log(mnemonic)
    console.log('\n=== Add to .env ===')
    console.log(`SPARK_MNEMONIC=${mnemonic}`)
    console.log(`SPARK_NETWORK=${network}`)
  }

  wallet.cleanupConnections()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
