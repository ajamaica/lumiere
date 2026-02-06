#!/usr/bin/env node
/**
 * Generate valid cold wallet keys for facilitator: Aptos and EVM, each for testnet and mainnet.
 * Produces 4 wallets (Aptos testnet, Aptos mainnet, EVM testnet, EVM mainnet). Does NOT save
 * to agent wallet files; prints .env lines and addresses for funding.
 *
 * Usage: node src/generate-facilitator-keys.js [--json]
 * From repo root: cd autonomous && npm run generate-facilitator-keys
 */

const jsonOut = process.argv.includes('--json')

function toHex(key) {
  if (typeof key !== 'string') return key
  return key.startsWith('0x') ? key : '0x' + key
}

async function main() {
  const result = {
    aptos_testnet: null,
    aptos_mainnet: null,
    evm_testnet: null,
    evm_mainnet: null,
  }

  try {
    const { Account } = await import('@aptos-labs/ts-sdk')
    const testnetAccount = Account.generate()
    const mainnetAccount = Account.generate()
    result.aptos_testnet = {
      privateKey: toHex(testnetAccount.privateKey.toString()),
      address: testnetAccount.accountAddress.toString(),
    }
    result.aptos_mainnet = {
      privateKey: toHex(mainnetAccount.privateKey.toString()),
      address: mainnetAccount.accountAddress.toString(),
    }
  } catch (e) {
    if (
      e.code === 'ERR_MODULE_NOT_FOUND' ||
      (e.message && e.message.includes('@aptos-labs/ts-sdk'))
    ) {
      if (jsonOut)
        console.log(
          JSON.stringify({
            error: 'Install @aptos-labs/ts-sdk in autonomous: npm install @aptos-labs/ts-sdk',
          }),
        )
      else console.error('Install Aptos SDK in autonomous first: npm install @aptos-labs/ts-sdk')
    } else {
      if (jsonOut) console.log(JSON.stringify({ error: e.message }))
      else console.error(e.message)
    }
    process.exit(1)
  }

  try {
    const { generatePrivateKey, privateKeyToAccount } = await import('viem/accounts')
    const evmTestnetPk = generatePrivateKey()
    const evmMainnetPk = generatePrivateKey()
    result.evm_testnet = {
      privateKey: toHex(evmTestnetPk),
      address: privateKeyToAccount(evmTestnetPk).address,
    }
    result.evm_mainnet = {
      privateKey: toHex(evmMainnetPk),
      address: privateKeyToAccount(evmMainnetPk).address,
    }
  } catch (e) {
    if (jsonOut) console.log(JSON.stringify({ error: e.message }))
    else console.error(e.message)
    process.exit(1)
  }

  if (jsonOut) {
    console.log(
      JSON.stringify({
        APTOS_TESTNET_PRIVATE_KEY: result.aptos_testnet.privateKey,
        APTOS_TESTNET_ADDRESS: result.aptos_testnet.address,
        APTOS_MAINNET_PRIVATE_KEY: result.aptos_mainnet.privateKey,
        APTOS_MAINNET_ADDRESS: result.aptos_mainnet.address,
        EVM_TESTNET_PRIVATE_KEY: result.evm_testnet.privateKey,
        EVM_TESTNET_ADDRESS: result.evm_testnet.address,
        EVM_MAINNET_PRIVATE_KEY: result.evm_mainnet.privateKey,
        EVM_MAINNET_ADDRESS: result.evm_mainnet.address,
      }),
    )
    return
  }

  console.log('')
  console.log(
    '# Valid facilitator wallets (testnet + mainnet). Add to root .env or Replit Secrets.',
  )
  console.log('# For facilitator: set APTOS_PRIVATE_KEY and EVM_RELAYER_PRIVATE_KEY to the')
  console.log('# testnet or mainnet key depending on APTOS_NETWORK and your EVM chain.')
  console.log('')

  console.log('# --- Aptos testnet (aptos:2) ---')
  console.log('APTOS_TESTNET_PRIVATE_KEY=' + result.aptos_testnet.privateKey)
  console.log(
    '# APTOS_TESTNET_ADDRESS (fund with APT at https://aptos.dev/network/faucet):',
    result.aptos_testnet.address,
  )
  console.log('')

  console.log('# --- Aptos mainnet (aptos:1) ---')
  console.log('APTOS_MAINNET_PRIVATE_KEY=' + result.aptos_mainnet.privateKey)
  console.log('# APTOS_MAINNET_ADDRESS (fund with APT on mainnet):', result.aptos_mainnet.address)
  console.log('')

  console.log('# --- EVM testnet (Base Sepolia eip155:84532) ---')
  console.log('EVM_TESTNET_PRIVATE_KEY=' + result.evm_testnet.privateKey)
  console.log(
    '# EVM_TESTNET_ADDRESS (fund with ETH at Base Sepolia faucet):',
    result.evm_testnet.address,
  )
  console.log('')

  console.log('# --- EVM mainnet (Base eip155:8453) ---')
  console.log('EVM_MAINNET_PRIVATE_KEY=' + result.evm_mainnet.privateKey)
  console.log('# EVM_MAINNET_ADDRESS (fund with ETH on Base):', result.evm_mainnet.address)
  console.log('')

  console.log('# Example: for testnet facilitator use')
  console.log('#   APTOS_PRIVATE_KEY=${APTOS_TESTNET_PRIVATE_KEY}')
  console.log('#   EVM_RELAYER_PRIVATE_KEY=${EVM_TESTNET_PRIVATE_KEY}')
  console.log('# For mainnet use APTOS_MAINNET_PRIVATE_KEY and EVM_MAINNET_PRIVATE_KEY.')
  console.log('')
}

main()
