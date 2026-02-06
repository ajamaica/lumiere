#!/usr/bin/env node
/**
 * Register an Aptos agent address on-chain so it can receive tokens.
 * On Aptos, an account must exist before it can receive; the first transfer
 * (or a zero/minimal transfer) creates it. Use this when tokens are "sent"
 * (e.g. from the testnet faucet) but don't arrive at the agent address.
 *
 * Requires a sender with APT on the same network (testnet by default).
 * Set REGISTER_SENDER_PRIVATE_KEY in env (hex, with or without 0x).
 * Or omit to use the agent's own wallet (it must already have some APT).
 *
 * Usage: node src/register-aptos-agent.js [agent_address]
 *   agent_address: Aptos address to register (default: default agent wallet)
 * Env: REGISTER_SENDER_PRIVATE_KEY (optional), APTOS_NETWORK=testnet|mainnet|devnet
 */

import { getAptosConfig } from './lib/aptos/config.js'
import { getWalletInfo, load } from './lib/aptos/wallet.js'

const MIN_OCTAS = 1 // minimal amount so account is created and receives something

function parseArgs() {
  const args = process.argv.slice(2)
  const address = args[0]?.trim()
  return { address }
}

async function main() {
  const { address: argAddress } = parseArgs()
  const network = (process.env.APTOS_NETWORK || 'testnet').toLowerCase()
  const cfg = getAptosConfig(network)

  let recipientAddress = argAddress
  if (!recipientAddress) {
    const info = getWalletInfo()
    if (!info?.address) {
      console.error(
        'No agent address provided and no Aptos wallet found. Run: node src/setup-aptos.js',
      )
      process.exit(1)
    }
    recipientAddress = info.address
    console.log('Using default agent address from wallet:', recipientAddress)
  }

  const senderKey = (process.env.REGISTER_SENDER_PRIVATE_KEY || '').trim()
  let senderWallet = null
  if (senderKey && senderKey.length >= 64) {
    const { Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk')
    const pk = new Ed25519PrivateKey(senderKey.startsWith('0x') ? senderKey : '0x' + senderKey)
    const account = Account.fromPrivateKey({ privateKey: pk, legacy: false })
    senderWallet = {
      address: account.accountAddress.toString(),
      privateKey: senderKey.startsWith('0x') ? senderKey : '0x' + senderKey,
    }
  } else {
    const w = load()
    if (!w?.privateKey) {
      console.error(
        'Set REGISTER_SENDER_PRIVATE_KEY (hex key with APT on ' +
          network +
          ') or ensure agent wallet has APT.',
      )
      process.exit(1)
    }
    senderWallet = w
  }

  const { Aptos, AptosConfig, Network, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk')
  const net =
    network === 'mainnet'
      ? Network.MAINNET
      : network === 'devnet'
        ? Network.DEVNET
        : Network.TESTNET
  const aptosConfig = new AptosConfig({ fullnode: cfg.nodeUrl, network: net })
  const aptos = new Aptos(aptosConfig)
  const privateKey = new Ed25519PrivateKey(senderWallet.privateKey)
  const account = Account.fromPrivateKey({ privateKey, legacy: false })

  console.log('Registering agent address on', network + ':', recipientAddress)
  console.log('Sender:', senderWallet.address)
  try {
    const builder = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      withFeePayer: false,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [recipientAddress, BigInt(MIN_OCTAS)],
      },
    })
    const signed = await aptos.transaction.sign({ signer: account, transaction: builder })
    const pending = await aptos.transaction.submit.simple({ transaction: signed })
    await aptos.waitForTransaction({ transactionHash: pending.hash })
    console.log('Done. Agent account is registered. Tx:', pending.hash)
    console.log('You can now fund this address via the faucet or other transfers.')
  } catch (e) {
    console.error('Registration failed:', e.message)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
