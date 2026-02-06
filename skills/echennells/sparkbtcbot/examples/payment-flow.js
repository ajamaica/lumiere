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

  const { balance } = await wallet.getBalance()
  console.log('Current balance:', balance.toString(), 'sats\n')

  // --- Lightning Invoice (Receive) ---
  console.log('=== Create Lightning Invoice ===')
  const invoiceRequest = await wallet.createLightningInvoice({
    amountSats: 1000,
    memo: 'Test payment - 1000 sats',
    expirySeconds: 3600,
  })
  console.log('BOLT11:', invoiceRequest.invoice.encodedInvoice)
  console.log('Pay this invoice from any Lightning wallet.\n')

  // --- Lightning Invoice with Spark fallback ---
  console.log('=== Lightning Invoice (with Spark address) ===')
  const sparkInvoice = await wallet.createLightningInvoice({
    amountSats: 500,
    memo: 'Spark-preferred payment',
    expirySeconds: 3600,
    includeSparkAddress: true,
  })
  console.log('BOLT11:', sparkInvoice.invoice.encodedInvoice)
  console.log('Spark-aware payers will route via Spark (free, instant).\n')

  // --- Spark Native Invoice ---
  console.log('=== Create Spark Invoice ===')
  const satsInvoice = await wallet.createSatsInvoice({
    amount: 1000,
    memo: 'Spark native invoice',
  })
  console.log('Spark Invoice:', satsInvoice)
  console.log('Pay this with any Spark wallet.\n')

  // --- Fee Estimation (for paying a Lightning invoice) ---
  // Uncomment with a real BOLT11 invoice to test:
  //
  // const fee = await wallet.getLightningSendFeeEstimate({
  //   encodedInvoice: "lnbc...",
  //   amountSats: 1000,
  // });
  // console.log("Estimated Lightning fee:", fee, "sats");

  // --- Pay Lightning Invoice ---
  // Uncomment with a real BOLT11 invoice to send:
  //
  // const payment = await wallet.payLightningInvoice({
  //   invoice: "lnbc...",
  //   maxFeeSats: 10,
  //   preferSpark: true,
  // });
  // console.log("Payment sent:", payment);

  // --- Spark-to-Spark Transfer ---
  // Uncomment with a real Spark address to send:
  //
  // const transfer = await wallet.transfer({
  //   receiverSparkAddress: "sp1p...",
  //   amountSats: 100,
  // });
  // console.log("Transfer:", transfer.id);

  wallet.cleanupConnections()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
