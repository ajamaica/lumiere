#!/usr/bin/env node
/**
 * Deploy a contract to Abstract mainnet
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node deploy-abstract.js <artifact-path> [constructor-args...]
 *
 * Example:
 *   node deploy-abstract.js ./artifacts/MyContract.json "0xarg1" "100"
 */

const { Wallet, Provider, ContractFactory } = require('zksync-ethers')
const fs = require('fs')
const path = require('path')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
const CHAIN_ID = 2741

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log('Usage: node deploy-abstract.js <artifact-path> [constructor-args...]')
    console.log('Example: node deploy-abstract.js ./artifacts/MyContract.json')
    process.exit(1)
  }

  const artifactPath = args[0]
  const constructorArgs = args.slice(1)

  // Load artifact
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}`)
    process.exit(1)
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

  // Check for private key
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY environment variable not set')
    process.exit(1)
  }

  console.log('Connecting to Abstract Mainnet...')
  const provider = new Provider(ABSTRACT_RPC, undefined, { timeout: 60000 })
  const wallet = new Wallet(privateKey, provider)

  // Check balance
  const balance = await provider.getBalance(wallet.address)
  const balanceEth = Number(balance) / 1e18
  console.log(`Wallet: ${wallet.address}`)
  console.log(`Balance: ${balanceEth.toFixed(6)} ETH`)

  if (balanceEth < 0.001) {
    console.error('Warning: Low balance. You may need more ETH for gas.')
  }

  // Deploy
  console.log(`\nDeploying contract...`)
  console.log(`ABI entries: ${artifact.abi.length}`)
  console.log(
    `Constructor args: ${constructorArgs.length > 0 ? constructorArgs.join(', ') : 'none'}`,
  )

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet)
  const contract = await factory.deploy(...constructorArgs)

  console.log('Waiting for deployment...')
  await contract.waitForDeployment()

  const address = await contract.getAddress()

  // CRITICAL: Verify bytecode was actually deployed
  console.log('\nVerifying deployment...')
  const code = await provider.getCode(address)

  if (!code || code === '0x' || code.length <= 2) {
    console.error('\n❌ DEPLOYMENT FAILED!')
    console.error('Transaction succeeded but no bytecode at address.')
    console.error('This can happen if using wrong deployment method for zkSync.')
    console.error("Make sure you're using zksync-ethers and zksolc-compiled artifacts.")
    process.exit(1)
  }

  console.log(`Bytecode verified: ${code.length} chars ✅`)
  console.log(`\n✅ Contract deployed and verified!`)
  console.log(`Address: ${address}`)
  console.log(`Explorer: https://abscan.org/address/${address}`)

  return address
}

main().catch((e) => {
  console.error('Deployment failed:', e.message)
  process.exit(1)
})
