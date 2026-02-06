/**
 * Build EVM (EIP-3009) payment payload for x402 verify/settle.
 * Used for open_bank_account ($3.65 on Base Sepolia).
 */

import { randomBytes } from 'crypto'

import { getChain } from '../chains.js'
import { getAccount, getWalletClient } from '../wallet.js'

// Base Sepolia USDC testnet (common test contract; override via env if needed)
const BASE_SEPOLIA_USDC =
  process.env.BASE_SEPOLIA_USDC || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

/**
 * Build signed EIP-3009 transferWithAuthorization payload for facilitator.
 * @param {import('../x402/types.js').PaymentRequirements} paymentRequirements - amount, payTo, network
 * @returns {Promise<{ scheme: string, network: string, payload: Object }>}
 */
export async function getEvmPaymentPayload(paymentRequirements) {
  const network = paymentRequirements.network || 'eip155:84532'
  const chainName = network === 'eip155:84532' ? 'baseSepolia' : 'base'
  const chain = getChain(chainName)
  const account = getAccount()
  const client = getWalletClient(chainName)
  if (!client) throw new Error(`EVM wallet not available for ${chainName}`)

  const to = (paymentRequirements.payTo || '').trim()
  if (!to || !to.startsWith('0x') || to.length < 40) {
    throw new Error(
      'Payment requirements missing valid payTo address. Set BASE_SEPOLIA_PAYTO in server .env or register a pay_to address at http://localhost:4024/flow.html',
    )
  }
  const value = BigInt(
    typeof paymentRequirements.amount === 'number'
      ? paymentRequirements.amount
      : String(paymentRequirements.amount),
  )
  const validAfter = 0
  const validBefore = Math.floor(Date.now() / 1000) + 3600 // 1h
  const nonce = '0x' + Buffer.from(randomBytes(32)).toString('hex')

  const usdcAddress = chainName === 'baseSepolia' ? BASE_SEPOLIA_USDC : paymentRequirements.asset

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: chain.chainId,
    verifyingContract: usdcAddress,
  }
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  }
  const message = {
    from: account.address,
    to,
    value,
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  }

  const signature = await client.signTypedData({
    account,
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message,
  })

  return {
    x402Version: 2,
    scheme: paymentRequirements.scheme || 'exact',
    network,
    payload: {
      from: account.address,
      to,
      value: value.toString(),
      validAfter,
      validBefore,
      nonce,
      signature,
      contract: usdcAddress,
    },
  }
}
