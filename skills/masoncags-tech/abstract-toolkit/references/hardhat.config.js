/**
 * Hardhat config for Abstract mainnet deployment
 *
 * Setup:
 *   npm install --save-dev @matterlabs/hardhat-zksync zksync-ethers ethers hardhat
 *
 * Usage:
 *   npx hardhat compile --network abstractMainnet
 *   npx hardhat run scripts/deploy.js --network abstractMainnet
 */

require('@matterlabs/hardhat-zksync')

module.exports = {
  zksolc: {
    // Uses zksolc from npm - no manual download needed
    version: 'latest',
    settings: {},
  },
  solidity: {
    version: '0.8.24',
  },
  networks: {
    abstractMainnet: {
      url: 'https://api.mainnet.abs.xyz',
      ethNetwork: 'mainnet',
      zksync: true,
      chainId: 2741,
      // Load from environment variable
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
    },
    abstractTestnet: {
      url: 'https://api.testnet.abs.xyz',
      ethNetwork: 'sepolia',
      zksync: true,
      chainId: 11124,
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
    },
  },
  defaultNetwork: 'abstractMainnet',
}
