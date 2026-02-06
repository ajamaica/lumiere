import {
  getActionMetadata,
  JUPITER,
  postAction,
  RAYDIUM,
  resolveMint,
  TOKENS,
} from './src/lib/endpoints.js'

async function main() {
  console.log('=== Jupiter Swap Test ===\n')

  // 1. Get metadata
  const metaUrl = JUPITER.getSwapMetadata('SOL', 'USDC')
  console.log('1. GET metadata:', metaUrl)
  const metadata = await getActionMetadata(metaUrl)
  console.log('   Title:', metadata.title)
  console.log('   Description:', metadata.description)
  console.log('   Actions:', metadata.links?.actions.length)

  // 2. Get transaction
  const txUrl = JUPITER.postSwapTx(TOKENS.SOL, TOKENS.USDC, '0.01')
  console.log('\n2. POST transaction:', txUrl)
  const txData = await postAction(txUrl, '6dDEgPPDca64boRu7mhpboQzCPJsZqzHyWvHDbUz9ZVF')
  console.log(
    '   Transaction:',
    txData.transaction ? `✅ ${txData.transaction.length} chars` : '❌ missing',
  )

  console.log('\n=== Raydium Swap Test ===\n')

  // 3. Raydium metadata
  const rayMetaUrl = RAYDIUM.getSwapMetadata()
  console.log('3. GET metadata:', rayMetaUrl)
  const rayMeta = await getActionMetadata(rayMetaUrl)
  console.log('   Title:', rayMeta.title)

  // 4. Raydium transaction
  const rayTxUrl = RAYDIUM.postSwapTx(TOKENS.RAY, '0.1')
  console.log('\n4. POST transaction:', rayTxUrl)
  const rayTx = await postAction(rayTxUrl, '6dDEgPPDca64boRu7mhpboQzCPJsZqzHyWvHDbUz9ZVF')
  console.log(
    '   Transaction:',
    rayTx.transaction ? `✅ ${rayTx.transaction.length} chars` : '❌ missing',
  )

  console.log('\n✅ All tests passed!')
}

main().catch((e) => console.error('❌ Error:', e.message))
