/**
 * Aptos chain config: testnet/node URLs, USDC asset, network id.
 * Devnet is used for programmatic faucet (crediting); testnet for demo MCP (mint via web only).
 * Ref: https://aptos.dev/build/apis/faucet-api, https://canteenapp-aptos-x402.notion.site/
 */

export const APTOS_TESTNET_NODE_URL = 'https://fullnode.testnet.aptoslabs.com/v1'
export const APTOS_MAINNET_NODE_URL = 'https://fullnode.mainnet.aptoslabs.com/v1'
export const APTOS_DEVNET_NODE_URL = 'https://fullnode.devnet.aptoslabs.com/v1'

/** Faucet: only devnet (and local) have a public API; testnet = web mint only. */
export const APTOS_FAUCET_TESTNET_PAGE = 'https://aptos.dev/network/faucet'
export const APTOS_FAUCET_DEVNET_URL = 'https://faucet.devnet.aptoslabs.com'

/** USDC asset type on Aptos testnet (resource address). */
export const USDC_ASSET_TESTNET =
  '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832'

export const NETWORK_ID_TESTNET = 'aptos:2'
export const NETWORK_ID_MAINNET = 'aptos:1'
export const NETWORK_ID_DEVNET = 'aptos:3'

export const config = {
  testnet: {
    nodeUrl: APTOS_TESTNET_NODE_URL,
    networkId: NETWORK_ID_TESTNET,
    usdcAsset: USDC_ASSET_TESTNET,
  },
  mainnet: {
    nodeUrl: APTOS_MAINNET_NODE_URL,
    networkId: NETWORK_ID_MAINNET,
    usdcAsset: null, // set per mainnet deployment
  },
  devnet: {
    nodeUrl: APTOS_DEVNET_NODE_URL,
    networkId: NETWORK_ID_DEVNET,
    usdcAsset: null,
    faucetUrl: APTOS_FAUCET_DEVNET_URL,
  },
}

/**
 * @param {'testnet'|'mainnet'|'devnet'} [env] - default testnet
 * @returns {{ nodeUrl: string, networkId: string, usdcAsset: string|null, faucetUrl?: string }}
 */
export function getAptosConfig(env = 'testnet') {
  return config[env] || config.testnet
}
