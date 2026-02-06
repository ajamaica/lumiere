/**
 * Protocol-Specific Handlers
 * Direct Solana Actions integration for DeFi protocols
 *
 * Uses direct protocol action endpoints per the Solana Actions spec:
 * - GET to action URL → metadata + available actions
 * - POST with account → transaction to sign
 */

import type { Connection } from '@solana/web3.js'

import type { Market, MarketType, Position, ProtocolId } from '../types/index.js'
import { ActionsClient, PROTOCOL_ACTIONS, TRUSTED_HOSTS } from './actions.js'
import { BlinksExecutor } from './blinks.js'

/**
 * Known action endpoints for major DeFi protocols
 * These are direct URLs that implement the Solana Actions specification
 * All endpoints via Dialect Standard Blinks Library (SBL)
 *
 * Status: ✅ = Tested working, ⚠️ = Needs specific params, 🔒 = Cloudflare (needs browser UA)
 */
export const PROTOCOL_ACTION_ENDPOINTS: Record<
  string,
  {
    displayName: string
    category: string
    website: string
    status: 'working' | 'partial' | 'blocked' | 'unknown' | 'broken'
    actions: Record<string, string>
    trustedHosts: string[]
    notes?: string
  }
> = {
  // ✅ CONFIRMED WORKING - Dialect SBL endpoints
  kamino: {
    displayName: 'Kamino Finance',
    category: 'lending-yield',
    website: 'https://kamino.finance',
    status: 'working',
    actions: {
      // Kamino Lend (yield vaults)
      'lend-deposit': 'https://kamino.dial.to/api/v0/lend/{vaultId}/deposit',
      'lend-withdraw': 'https://kamino.dial.to/api/v0/lend/{vaultId}/withdraw',
      // Kamino Lending (borrow/lend) - requires market + reserve addresses
      'lending-deposit': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/deposit',
      'lending-withdraw':
        'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/withdraw',
      'lending-claim':
        'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/claim-rewards',
      // Kamino Multiply (loop)
      'multiply-setup': 'https://kamino.dial.to/api/v0/multiply/{marketAddress}/setup',
      'multiply-deposit': 'https://kamino.dial.to/api/v0/multiply/{marketAddress}/deposit',
      'multiply-withdraw': 'https://kamino.dial.to/api/v0/multiply/{marketAddress}/withdraw',
      // Kamino Leverage
      'leverage-setup': 'https://kamino.dial.to/api/v0/leverage/{marketAddress}/setup',
      'leverage-open': 'https://kamino.dial.to/api/v0/leverage/{marketAddress}/openPosition',
      'leverage-close': 'https://kamino.dial.to/api/v0/leverage/{marketAddress}/closePosition',
      // Kamino LP (liquidity)
      'liquidity-deposit': 'https://kamino.dial.to/api/v0/liquidity/{vaultAddress}/deposit',
      'liquidity-withdraw': 'https://kamino.dial.to/api/v0/liquidity/{vaultAddress}/withdraw',
      // Kamino Farms
      'farms-claim': 'https://kamino.dial.to/api/v0/farms/{farmAddress}/claim-rewards',
    },
    trustedHosts: ['kamino.dial.to', 'app.kamino.finance'],
    notes: 'Full Dialect SBL coverage. Params: vaultId, market, reserve as pubkey addresses.',
  },

  marginfi: {
    displayName: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    status: 'working',
    actions: {
      // MarginFi Lend - uses token symbol (SOL, USDC, etc.)
      'lend-deposit': 'https://marginfi.dial.to/api/v0/lend/{tokenSymbol}/deposit',
      'lend-withdraw': 'https://marginfi.dial.to/api/v0/lend/{tokenSymbol}/withdraw',
    },
    trustedHosts: ['marginfi.dial.to', 'app.marginfi.com'],
    notes: 'Use token symbols: SOL, USDC, USDT, etc. Query params: amount or percentage.',
  },

  lulo: {
    displayName: 'Lulo',
    category: 'yield',
    website: 'https://lulo.fi',
    status: 'working',
    actions: {
      // Lulo Deposits - token + type (protected/regular)
      deposit: 'https://lulo.dial.to/api/v0/deposit/{token}/{type}',
      withdraw: 'https://lulo.dial.to/api/v0/withdraw/{token}/{type}',
      'withdraw-complete': 'https://lulo.dial.to/api/v0/withdraw/{token}/regular/complete',
    },
    trustedHosts: ['lulo.dial.to', 'app.lulo.fi', 'classic.lulo.fi'],
    notes: 'Token: USDC only for deposits. Type: protected or regular.',
  },

  orca: {
    displayName: 'Orca',
    category: 'amm',
    website: 'https://orca.so',
    status: 'working',
    actions: {
      // Orca Whirlpools - uses token mint addresses
      'open-position': 'https://orca.dial.to/api/v0/pools/{tokenA}/{tokenB}/open-position',
      'add-liquidity':
        'https://orca.dial.to/api/v0/pools/positions/{positionAddress}/add-liquidity',
      'remove-liquidity':
        'https://orca.dial.to/api/v0/pools/positions/{positionAddress}/remove-liquidity',
      'close-position':
        'https://orca.dial.to/api/v0/pools/positions/{positionAddress}/close-position',
    },
    trustedHosts: ['orca.dial.to', 'orca.so'],
    notes:
      'Use full token mint addresses (e.g., So11111111111111111111111111111111111111112 for SOL).',
  },

  meteora: {
    displayName: 'Meteora',
    category: 'amm',
    website: 'https://meteora.ag',
    status: 'working',
    actions: {
      // Meteora DLMM - requires pool pubkey
      'dlmm-add': 'https://meteora.dial.to/api/v0/dlmm/{dlmmPool}/add-liquidity',
      'dlmm-remove': 'https://meteora.dial.to/api/v0/dlmm/{dlmmPool}/remove-liquidity',
      // Meteora Bonding Curve (token launch)
      'launch-token': 'https://meteora.dial.to/api/v0/bonding-curve/launch-token',
    },
    trustedHosts: ['meteora.dial.to', 'app.meteora.ag'],
    notes: 'DLMM needs pool address. Launch token requires name, symbol, description, imageUri.',
  },

  jupiter: {
    displayName: 'Jupiter',
    category: 'swap-lending',
    website: 'https://jup.ag',
    status: 'working',
    actions: {
      // Jupiter Swap - via worker.jup.ag (routes from jup.ag/actions.json)
      swap: 'https://worker.jup.ag/blinks/swap/{inputToken}-{outputToken}',
      'swap-amount': 'https://worker.jup.ag/blinks/swap/{inputMint}/{outputMint}/{amount}',
    },
    trustedHosts: ['worker.jup.ag', 'jup.ag', 'jupiter.dial.to'],
    notes: 'Metadata: use symbols (SOL-USDC). Transaction: use mint addresses.',
  },

  raydium: {
    displayName: 'Raydium',
    category: 'amm',
    website: 'https://raydium.io',
    status: 'working',
    actions: {
      // Raydium Swap - via share.raydium.io
      'swap-info': 'https://share.raydium.io/dialect/actions/swap/info',
      'swap-tx': 'https://share.raydium.io/dialect/actions/swap/tx',
    },
    trustedHosts: ['share.raydium.io', 'raydium.io'],
    notes: 'Swap info for metadata. Swap tx with outputMint + amount query params.',
  },

  sanctum: {
    displayName: 'Sanctum',
    category: 'staking',
    website: 'https://sanctum.so',
    status: 'working',
    actions: {
      // Sanctum LST trading - routes from app.sanctum.so/actions.json
      trade: 'https://sanctum.dial.to/trade/{inputToken}-{outputToken}',
      'trade-amount': 'https://sanctum.dial.to/trade/{inputToken}-{outputToken}/{amount}',
    },
    trustedHosts: ['sanctum.dial.to', 'app.sanctum.so'],
    notes: 'Needs browser User-Agent. Tokens: SOL, INF, etc. Cloudflare protected.',
  },

  drift: {
    displayName: 'Drift Protocol',
    category: 'perps',
    website: 'https://drift.trade',
    status: 'partial',
    actions: {
      deposit: 'https://app.drift.trade/api/blinks/deposit',
      elections: 'https://app.drift.trade/api/blinks/elections',
    },
    trustedHosts: ['app.drift.trade', 'drift.dial.to'],
    notes: 'Routes via app.drift.trade/actions.json.',
  },

  tensor: {
    displayName: 'Tensor',
    category: 'nft',
    website: 'https://tensor.trade',
    status: 'working',
    actions: {
      'buy-floor': 'https://tensor.dial.to/buy-floor/{collection}',
      bid: 'https://tensor.dial.to/bid/{item}',
    },
    trustedHosts: ['tensor.dial.to', 'tensor.trade'],
    notes: 'Routes via tensor.trade/actions.json. Needs collection/item params.',
  },

  jito: {
    displayName: 'Jito',
    category: 'staking',
    website: 'https://jito.network',
    status: 'working',
    actions: {
      stake: 'https://jito.dial.to/stake',
      'stake-percentage': 'https://jito.dial.to/stake/percentage/{pct}',
      'stake-amount': 'https://jito.dial.to/stake/amount/{amount}',
    },
    trustedHosts: ['jito.dial.to', 'jito.network'],
    notes: 'Working. Returns 4 actions: 25%, 50%, 100%, custom amount.',
  },

  helius: {
    displayName: 'Helius',
    category: 'staking',
    website: 'https://helius.dev',
    status: 'working',
    actions: {
      stake: 'https://helius.dial.to/stake',
      'stake-amount': 'https://helius.dial.to/stake/{amount}',
    },
    trustedHosts: ['helius.dial.to'],
    notes: 'Working at /stake. Returns 4 actions: 1, 5, 10 SOL, custom amount.',
  },

  defituna: {
    displayName: 'DeFiTuna',
    category: 'lending',
    website: 'https://defituna.com',
    status: 'working',
    actions: {
      deposit: 'https://defituna.dial.to/api/v0/deposit',
      withdraw: 'https://defituna.dial.to/api/v0/withdraw',
    },
    trustedHosts: ['defituna.dial.to'],
    notes: 'Dialect SBL endpoint.',
  },

  deficarrot: {
    displayName: 'DeFiCarrot',
    category: 'yield',
    website: 'https://deficarrot.com',
    status: 'working',
    actions: {
      deposit: 'https://deficarrot.dial.to/api/v0/deposit',
      withdraw: 'https://deficarrot.dial.to/api/v0/withdraw',
    },
    trustedHosts: ['deficarrot.dial.to'],
    notes: 'Dialect SBL endpoint.',
  },

  save: {
    displayName: 'Save Protocol',
    category: 'yield',
    website: 'https://save.finance',
    status: 'working',
    actions: {
      deposit: 'https://save.dial.to/api/v0/deposit',
      withdraw: 'https://save.dial.to/api/v0/withdraw',
    },
    trustedHosts: ['save.dial.to'],
    notes: 'Dialect SBL endpoint.',
  },

  magiceden: {
    displayName: 'Magic Eden',
    category: 'nft',
    website: 'https://magiceden.io',
    status: 'partial',
    actions: {
      buy: 'https://api-mainnet.magiceden.dev/v2/actions/buy/{item}',
    },
    trustedHosts: ['api-mainnet.magiceden.dev', 'magiceden.dev'],
    notes: 'Needs specific item parameters.',
  },
}

/**
 * Protocol metadata for all supported protocols
 */
export const PROTOCOLS: Record<
  ProtocolId,
  {
    name: string
    displayName: string
    category: string
    website: string
    marketTypes: MarketType[]
    actions: string[]
    blinksSupported: boolean
    marketsApiSupported: boolean
    positionsApiSupported: boolean
    directActionsAvailable: boolean
  }
> = {
  kamino: {
    name: 'kamino',
    displayName: 'Kamino Finance',
    category: 'lending-yield',
    website: 'https://kamino.finance',
    marketTypes: ['yield', 'lending', 'loop'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay', 'multiply', 'leverage'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  marginfi: {
    name: 'marginfi',
    displayName: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    marketTypes: ['lending'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  jupiter: {
    name: 'jupiter',
    displayName: 'Jupiter',
    category: 'swap-lending',
    website: 'https://jup.ag',
    marketTypes: ['yield', 'lending'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay', 'swap'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  raydium: {
    name: 'raydium',
    displayName: 'Raydium',
    category: 'amm',
    website: 'https://raydium.io',
    marketTypes: [],
    actions: ['swap', 'add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  orca: {
    name: 'orca',
    displayName: 'Orca',
    category: 'amm',
    website: 'https://orca.so',
    marketTypes: [],
    actions: ['swap', 'add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  meteora: {
    name: 'meteora',
    displayName: 'Meteora',
    category: 'amm',
    website: 'https://meteora.ag',
    marketTypes: [],
    actions: ['add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  drift: {
    name: 'drift',
    displayName: 'Drift Protocol',
    category: 'perps',
    website: 'https://drift.trade',
    marketTypes: ['perpetual'],
    actions: ['vault-deposit', 'vault-withdraw'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  lulo: {
    name: 'lulo',
    displayName: 'Lulo',
    category: 'yield',
    website: 'https://lulo.fi',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  save: {
    name: 'save',
    displayName: 'Save Protocol',
    category: 'yield',
    website: 'https://save.finance',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: false,
  },
  defituna: {
    name: 'defituna',
    displayName: 'DeFiTuna',
    category: 'lending',
    website: 'https://defituna.com',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  deficarrot: {
    name: 'deficarrot',
    displayName: 'DeFiCarrot',
    category: 'yield',
    website: 'https://deficarrot.com',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  dflow: {
    name: 'dflow',
    displayName: 'DFlow',
    category: 'prediction',
    website: 'https://dflow.net',
    marketTypes: ['prediction'],
    actions: ['bet', 'claim'],
    blinksSupported: false,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: false,
  },
}

/**
 * Protocol handler base class
 */
export class ProtocolHandler {
  protected actionsClient: ActionsClient
  protected blinks: BlinksExecutor
  protected protocolId: ProtocolId

  constructor(protocolId: ProtocolId, actionsClient: ActionsClient, blinks: BlinksExecutor) {
    this.protocolId = protocolId
    this.actionsClient = actionsClient
    this.blinks = blinks
  }

  /**
   * Get protocol metadata
   */
  getMetadata() {
    return PROTOCOLS[this.protocolId]
  }

  /**
   * Get direct action endpoints for this protocol
   */
  getActionEndpoints(): Record<string, string> | undefined {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS[this.protocolId]
    return endpoints?.actions
  }

  /**
   * Build an action URL with parameters
   */
  buildActionUrl(actionKey: string, params: Record<string, string>): string | undefined {
    const endpoints = this.getActionEndpoints()
    if (!endpoints || !endpoints[actionKey]) return undefined

    let url = endpoints[actionKey]

    // Replace template parameters like {vault}, {market}, {reserve}
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`{${key}}`, value)
    }

    return url
  }

  /**
   * Get transaction for an action
   */
  async getActionTransaction(
    actionKey: string,
    walletAddress: string,
    templateParams: Record<string, string>,
    queryParams?: Record<string, string | number>,
  ): Promise<{ transaction: string; message?: string }> {
    const url = this.buildActionUrl(actionKey, templateParams)
    if (!url) {
      throw new Error(`Action '${actionKey}' not found for protocol '${this.protocolId}'`)
    }

    return this.actionsClient.postAction(url, walletAddress, queryParams)
  }
}

// ============================================
// Protocol-Specific Handlers
// ============================================

/**
 * Kamino Handler - Lend, Borrow, Multiply, Leverage
 */
export class KaminoHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('kamino', actionsClient, blinks)
  }

  async getDepositTransaction(vault: string, walletAddress: string, amount: string) {
    return this.getActionTransaction('lend-deposit', walletAddress, { vault }, { amount })
  }

  async getWithdrawTransaction(vault: string, walletAddress: string, amount: string) {
    return this.getActionTransaction('lend-withdraw', walletAddress, { vault }, { amount })
  }

  async getBorrowTransaction(
    market: string,
    reserve: string,
    walletAddress: string,
    amount: string,
  ) {
    return this.getActionTransaction(
      'lending-borrow',
      walletAddress,
      { market, reserve },
      { amount },
    )
  }

  async getRepayTransaction(
    market: string,
    reserve: string,
    walletAddress: string,
    amount: string,
  ) {
    return this.getActionTransaction(
      'lending-repay',
      walletAddress,
      { market, reserve },
      { amount },
    )
  }
}

/**
 * MarginFi Handler
 */
export class MarginFiHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('marginfi', actionsClient, blinks)
  }
}

/**
 * Jupiter Handler - Swap + Earn
 */
export class JupiterHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('jupiter', actionsClient, blinks)
  }

  async getSwapTransaction(
    walletAddress: string,
    inputMint: string,
    outputMint: string,
    amount: string,
  ) {
    const url = this.buildActionUrl('swap', {})
    if (!url) throw new Error('Swap action not found')

    return this.actionsClient.postAction(url, walletAddress, {
      inputMint,
      outputMint,
      amount,
    })
  }
}

/**
 * Lulo Handler - Protected + Boosted Deposits
 */
export class LuloHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks)
  }

  async getDepositTransaction(walletAddress: string, token: string, amount: string) {
    return this.getActionTransaction('deposit', walletAddress, {}, { token, amount })
  }

  async getWithdrawTransaction(walletAddress: string, token: string, amount: string) {
    return this.getActionTransaction('withdraw', walletAddress, {}, { token, amount })
  }
}

/**
 * Drift Handler - Strategy Vaults
 */
export class DriftHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('drift', actionsClient, blinks)
  }
}

/**
 * Sanctum Handler - LST Staking
 */
export class SanctumHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks) // Using lulo as placeholder ProtocolId
  }

  async getStakeTransaction(
    walletAddress: string,
    inputMint: string,
    outputMint: string,
    amount: string,
  ) {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS['sanctum']
    if (!endpoints) throw new Error('Sanctum endpoints not found')

    return this.actionsClient.postAction(endpoints.actions.stake, walletAddress, {
      inputMint,
      outputMint,
      amount,
    })
  }
}

/**
 * Jito Handler - JitoSOL Staking
 */
export class JitoHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks) // Using lulo as placeholder ProtocolId
  }

  async getStakeTransaction(walletAddress: string, amount: string) {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS['jito']
    if (!endpoints) throw new Error('Jito endpoints not found')

    return this.actionsClient.postAction(endpoints.actions.stake, walletAddress, {
      amount,
    })
  }
}

/**
 * Create all protocol handlers
 */
export function createProtocolHandlers(connection: Connection): Record<string, ProtocolHandler> {
  const actionsClient = new ActionsClient()
  const blinks = new BlinksExecutor(connection)

  return {
    kamino: new KaminoHandler(actionsClient, blinks),
    marginfi: new MarginFiHandler(actionsClient, blinks),
    jupiter: new JupiterHandler(actionsClient, blinks),
    raydium: new ProtocolHandler('raydium', actionsClient, blinks),
    orca: new ProtocolHandler('orca', actionsClient, blinks),
    meteora: new ProtocolHandler('meteora', actionsClient, blinks),
    drift: new DriftHandler(actionsClient, blinks),
    lulo: new LuloHandler(actionsClient, blinks),
    save: new ProtocolHandler('save', actionsClient, blinks),
    defituna: new ProtocolHandler('defituna', actionsClient, blinks),
    deficarrot: new ProtocolHandler('deficarrot', actionsClient, blinks),
    dflow: new ProtocolHandler('dflow', actionsClient, blinks),
  }
}

export default PROTOCOLS
