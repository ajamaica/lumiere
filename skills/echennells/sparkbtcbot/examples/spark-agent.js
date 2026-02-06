import 'dotenv/config'

import { SparkWallet } from '@buildonspark/spark-sdk'

export class SparkAgent {
  #wallet

  constructor(wallet) {
    this.#wallet = wallet
  }

  static async create(mnemonic, network = 'MAINNET') {
    const { wallet, mnemonic: generated } = await SparkWallet.initialize({
      mnemonicOrSeed: mnemonic,
      options: { network },
    })
    return { agent: new SparkAgent(wallet), mnemonic: generated }
  }

  // --- Identity ---

  async getIdentity() {
    return {
      address: await this.#wallet.getSparkAddress(),
      publicKey: await this.#wallet.getIdentityPublicKey(),
    }
  }

  // --- Balance ---

  async getBalance() {
    const { balance, tokenBalances } = await this.#wallet.getBalance()
    return { sats: balance, tokens: tokenBalances }
  }

  // --- Deposits ---

  async getDepositAddress() {
    return await this.#wallet.getStaticDepositAddress()
  }

  async getSingleUseDepositAddress() {
    return await this.#wallet.getSingleUseDepositAddress()
  }

  // --- Spark Transfers ---

  async transfer(recipientAddress, amountSats) {
    return await this.#wallet.transfer({
      receiverSparkAddress: recipientAddress,
      amountSats,
    })
  }

  async getTransfers(limit = 10, offset = 0) {
    return await this.#wallet.getTransfers(limit, offset)
  }

  // --- Lightning ---

  async createLightningInvoice(amountSats, memo, options = {}) {
    const request = await this.#wallet.createLightningInvoice({
      amountSats,
      memo,
      expirySeconds: options.expirySeconds || 3600,
      includeSparkAddress: options.includeSparkAddress ?? true,
    })
    return request.invoice.encodedInvoice
  }

  async payLightningInvoice(bolt11, maxFeeSats = 10) {
    return await this.#wallet.payLightningInvoice({
      invoice: bolt11,
      maxFeeSats,
      preferSpark: true,
    })
  }

  async estimateLightningFee(bolt11, amountSats) {
    return await this.#wallet.getLightningSendFeeEstimate({
      encodedInvoice: bolt11,
      amountSats,
    })
  }

  // --- Spark Invoices ---

  async createSatsInvoice(amountSats, memo) {
    return await this.#wallet.createSatsInvoice({
      amount: amountSats,
      memo,
    })
  }

  async createTokenInvoice(tokenIdentifier, amount, memo) {
    return await this.#wallet.createTokensInvoice({
      amount,
      tokenIdentifier,
      memo,
    })
  }

  async fulfillInvoice(invoices) {
    return await this.#wallet.fulfillSparkInvoice(invoices)
  }

  // --- Tokens ---

  async transferTokens(tokenIdentifier, amount, recipientAddress) {
    return await this.#wallet.transferTokens({
      tokenIdentifier,
      tokenAmount: amount,
      receiverSparkAddress: recipientAddress,
    })
  }

  async batchTransferTokens(transfers) {
    return await this.#wallet.batchTransferTokens(transfers)
  }

  // --- Withdrawal ---

  async getWithdrawalFeeQuote(amountSats, onchainAddress) {
    return await this.#wallet.getWithdrawalFeeQuote({
      amountSats,
      withdrawalAddress: onchainAddress,
    })
  }

  async withdraw(onchainAddress, amountSats, speed = 'MEDIUM') {
    return await this.#wallet.withdraw({
      onchainAddress,
      exitSpeed: speed,
      amountSats,
    })
  }

  // --- Message Signing ---

  async signMessage(text) {
    const message = new TextEncoder().encode(text)
    return await this.#wallet.signMessageWithIdentityKey(message)
  }

  async verifyMessage(text, signature, publicKey) {
    const message = new TextEncoder().encode(text)
    return await this.#wallet.validateMessageWithIdentityKey(message, signature, publicKey)
  }

  // --- Events ---

  onTransferReceived(callback) {
    this.#wallet.on('transfer:claimed', callback)
  }

  onDepositConfirmed(callback) {
    this.#wallet.on('deposit:confirmed', callback)
  }

  // --- Lifecycle ---

  cleanup() {
    this.#wallet.cleanupConnections()
  }
}

// --- Demo ---

async function main() {
  const network = process.env.SPARK_NETWORK || 'MAINNET'

  if (!process.env.SPARK_MNEMONIC) {
    console.log('No SPARK_MNEMONIC set. Generating new wallet...\n')
  }

  const { agent, mnemonic } = await SparkAgent.create(process.env.SPARK_MNEMONIC, network)

  if (mnemonic) {
    console.log('Generated mnemonic (save securely):', mnemonic, '\n')
  }

  const identity = await agent.getIdentity()
  console.log('=== Agent Identity ===')
  console.log('Spark Address:', identity.address)
  console.log('Public Key:   ', identity.publicKey)

  const { sats, tokens } = await agent.getBalance()
  console.log('\n=== Balance ===')
  console.log('BTC:', sats.toString(), 'sats')

  if (tokens.size > 0) {
    for (const [id, info] of tokens) {
      console.log(`${info.tokenMetadata.tokenTicker}: ${info.balance.toString()}`)
    }
  }

  const depositAddr = await agent.getDepositAddress()
  console.log('\n=== Deposit ===')
  console.log('Send BTC to:', depositAddr)

  console.log('\n=== Lightning Invoice ===')
  const bolt11 = await agent.createLightningInvoice(1000, 'SparkAgent test')
  console.log('BOLT11:', bolt11)

  agent.cleanup()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
