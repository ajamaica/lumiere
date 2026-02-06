const { ethers } = require('ethers')

async function main() {
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) throw new Error('WALLET_PRIVATE_KEY not set')

  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log('Wallet:', wallet.address)

  // Check current USDC balance
  const usdc = new ethers.Contract(
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    ['function balanceOf(address) view returns (uint256)'],
    provider,
  )
  const balance = await usdc.balanceOf(wallet.address)
  console.log('USDC Balance:', ethers.formatUnits(balance, 6))

  // Bridge the full balance (minus tiny buffer for safety)
  const bridgeAmount = balance - BigInt(100000) // Leave 0.1 USDC buffer
  console.log('Bridging:', ethers.formatUnits(bridgeAmount, 6), 'USDC')

  // Get fresh quote
  const quoteResp = await fetch('https://api.relay.link/quote/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: wallet.address,
      originChainId: 8453,
      destinationChainId: 2741,
      originCurrency: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      destinationCurrency: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1',
      amount: bridgeAmount.toString(),
      recipient: wallet.address,
      tradeType: 'EXACT_INPUT',
    }),
  })

  const quote = await quoteResp.json()

  if (quote.error || !quote.steps) {
    console.error('Quote error:', quote)
    return
  }

  console.log('Expected output:', quote.details?.currencyOut?.amountFormatted, 'USDC')
  console.log('Relay fee:', quote.fees?.relayer?.amountFormatted, 'USDC')

  // Execute each step
  for (const step of quote.steps) {
    console.log(`\nExecuting step: ${step.id} - ${step.description}`)

    for (const item of step.items) {
      const txData = item.data
      console.log('To:', txData.to)

      const tx = await wallet.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value || '0',
        maxFeePerGas: txData.maxFeePerGas,
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
      })

      console.log('TX sent:', tx.hash)
      const receipt = await tx.wait()
      console.log('Confirmed in block:', receipt.blockNumber)
    }
  }

  console.log('\n✅ Bridge complete! USDC should arrive on Abstract shortly.')
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
