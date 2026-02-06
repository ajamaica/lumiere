const { Wormhole } = require('@wormhole-foundation/sdk')
const { UniversalAddress } = require('@wormhole-foundation/sdk-base')

module.exports = {
  async handler(input) {
    const { amount: amt, toAddress, chain = 'Solana', privateKey } = input

    if (!amt || !toAddress || !privateKey) {
      return {
        status: 'failed',
        message: 'Missing required parameters: amount, toAddress, privateKey',
      }
    }

    try {
      const wh = await Wormhole('Testnet', [chain])

      const transferAmount = BigInt(amt * 1_000_000) // USDC has 6 decimals

      const transfer = await wh.tokenBridge().transfer(
        privateKey,
        chain,
        transferAmount,
        'USDC', // Token symbol
        new UniversalAddress(toAddress, 'hex'),
      )

      const txHash = transfer.txHash.toString()

      return {
        transactionHash: txHash,
        status: 'success',
        message: `Transferred ${amt} USD1 to ${toAddress}`,
      }
    } catch (error) {
      return {
        status: 'failed',
        message: error.message || 'Transfer failed',
      }
    }
  },
}
