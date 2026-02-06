import { getTokenMint, WORKING_ENDPOINTS } from './src/lib/endpoints.js'

async function testJupiterSwap() {
  console.log('=== Testing Jupiter Swap ===\n')

  // GET request - get action metadata
  const url = WORKING_ENDPOINTS.jupiter.swapSolUsdc()
  console.log('GET:', url)

  const getRes = await fetch(url)
  const metadata = await getRes.json()
  console.log('Response:', JSON.stringify(metadata, null, 2))

  // POST request - get transaction
  const postUrl = WORKING_ENDPOINTS.jupiter.swap(getTokenMint('SOL'), getTokenMint('USDC'), '0.01')
  console.log('\nPOST:', postUrl)

  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: '6dDEgPPDca64boRu7mhpboQzCPJsZqzHyWvHDbUz9ZVF' }),
  })
  const txData = await postRes.json()
  console.log(
    'Transaction received:',
    txData.transaction ? 'YES (' + txData.transaction.length + ' chars)' : 'NO',
  )

  return true
}

async function testRaydiumSwap() {
  console.log('\n=== Testing Raydium Swap ===\n')

  const url = WORKING_ENDPOINTS.raydium.swapInfo
  console.log('GET:', url)

  const res = await fetch(url)
  const metadata = await res.json()
  console.log('Response:', JSON.stringify(metadata, null, 2))

  return true
}

async function main() {
  try {
    await testJupiterSwap()
    await testRaydiumSwap()
    console.log('\n✅ All tests passed!')
  } catch (e) {
    console.error('❌ Test failed:', e)
  }
}

main()
