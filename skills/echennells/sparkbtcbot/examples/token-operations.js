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

  // --- Token Balances ---
  console.log('=== Token Balances ===')
  const { balance, tokenBalances } = await wallet.getBalance()
  console.log('BTC:', balance.toString(), 'sats\n')

  if (tokenBalances.size > 0) {
    for (const [id, info] of tokenBalances) {
      const meta = info.tokenMetadata
      console.log(`Token: ${meta.tokenName} (${meta.tokenTicker})`)
      console.log(`  Identifier: ${id}`)
      console.log(`  Balance:    ${info.balance.toString()}`)
      console.log(`  Decimals:   ${meta.decimals}`)
      console.log(`  Max Supply: ${meta.maxSupply.toString()}`)
      console.log()
    }
  } else {
    console.log('No tokens held.\n')
  }

  // --- Transfer Tokens ---
  // Uncomment with real values to send tokens:
  //
  // const txId = await wallet.transferTokens({
  //   tokenIdentifier: "btkn1...",
  //   tokenAmount: 100n,
  //   receiverSparkAddress: "sp1p...",
  // });
  // console.log("Token transfer:", txId);

  // --- Batch Transfer ---
  // Send tokens to multiple recipients in one call:
  //
  // const txIds = await wallet.batchTransferTokens([
  //   { tokenIdentifier: "btkn1...", tokenAmount: 50n, receiverSparkAddress: "sp1p..." },
  //   { tokenIdentifier: "btkn1...", tokenAmount: 50n, receiverSparkAddress: "sp1p..." },
  // ]);
  // console.log("Batch transfers:", txIds);

  // --- Token Invoice ---
  // Request payment in a specific token:
  //
  // const invoice = await wallet.createTokensInvoice({
  //   amount: 100n,
  //   tokenIdentifier: "btkn1...",
  //   memo: "Pay me in tokens",
  // });
  // console.log("Token invoice:", invoice);

  // --- Listen for Incoming Tokens ---
  // wallet.on("transfer:claimed", (transferId, updatedBalance) => {
  //   console.log(`Received transfer ${transferId}`);
  //   console.log("Updated balance:", updatedBalance);
  // });
  // console.log("Listening for incoming transfers... (Ctrl+C to stop)");
  // await new Promise(() => {}); // keep alive

  wallet.cleanupConnections()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
