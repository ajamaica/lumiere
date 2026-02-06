/**
 * Amped DeFi Plugin
 * 
 * OpenClaw plugin for DeFi operations (swaps, bridging, money market)
 * via the SODAX SDK.
 */

import { TSchema,Type } from '@sinclair/typebox';

/**
 * OpenClaw Plugin API (defined locally to avoid SDK dependency)
 */
interface OpenClawPluginApi {
  pluginConfig: Record<string, unknown>;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  };
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: TSchema;
    execute: (toolCallId: string, params: unknown) => Promise<{
      content: Array<{ type: 'text'; text: string }>;
      details?: unknown;
    }>;
  }) => void;
  registerService: (service: {
    id: string;
    start: () => void;
    stop: () => Promise<void> | void;
  }) => void;
  on: (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void;
}
import { PolicyEngine } from './policy/policyEngine';
import { getCacheStats } from './providers/spokeProviderFactory';
import { getSodaxClientAsync, resetSodaxClient } from './sodax/client';
import {
  BridgeDiscoverSchema, BridgeExecuteSchema,
BridgeQuoteSchema,   handleBridgeDiscover, handleBridgeExecute,
handleBridgeQuote} from './tools/bridge';
import {
CrossChainPositionsSchema,
handleCrossChainPositions,
handleListWallets,
handleMoneyMarketPositions,   handleMoneyMarketReserves,   handleSupportedChains, handleSupportedTokens,   handleUserIntents, handleWalletAddress,
ListWalletsSchema,
MoneyMarketPositionsSchema,   MoneyMarketReservesSchema,   SupportedChainsSchema, SupportedTokensSchema,   UserIntentsSchema, WalletAddressSchema} from './tools/discovery';
import {
handleMmBorrow, handleMmRepay,
  handleMmSupply, handleMmWithdraw, MmBorrowSchema, MmRepaySchema,
  MmSupplySchema, MmWithdrawSchema} from './tools/moneyMarket';
import {
  handlePortfolioSummary,
  PortfolioSummarySchema} from './tools/portfolio';
// Tool schemas and handlers
import { 
handleSwapCancel,
handleSwapExecute,   handleSwapQuote, handleSwapStatus, SwapCancelSchema,
SwapExecuteSchema,   SwapQuoteSchema, SwapStatusSchema} from './tools/swap';
import {
  AddWalletSchema,   handleAddWallet, handleRemoveWallet, handleRenameWallet, handleSetDefaultWallet,
RemoveWalletSchema, RenameWalletSchema, SetDefaultWalletSchema} from './tools/walletManagement';
import { getWalletManager } from './wallet/walletManager';
import { getWalletRegistry } from './wallet/walletRegistry';

/**
 * Plugin configuration schema (matches openclaw.plugin.json)
 */
const configSchema = Type.Object({
  walletsJson: Type.Optional(Type.String()),
  rpcUrlsJson: Type.Optional(Type.String()),
  mode: Type.Optional(Type.Union([Type.Literal('execute'), Type.Literal('simulate')])),
  dynamicConfig: Type.Optional(Type.Boolean()),
});

/**
 * Apply plugin config to environment
 */
function applyConfig(config: Record<string, unknown>): void {
  if (config.walletsJson && typeof config.walletsJson === 'string') {
    process.env.AMPED_OC_WALLETS_JSON = config.walletsJson;
  }
  if (config.rpcUrlsJson && typeof config.rpcUrlsJson === 'string') {
    process.env.AMPED_OC_RPC_URLS_JSON = config.rpcUrlsJson;
  }
  if (config.mode && typeof config.mode === 'string') {
    process.env.AMPED_OC_MODE = config.mode;
  }
  if (config.dynamicConfig !== undefined) {
    process.env.AMPED_OC_SODAX_DYNAMIC_CONFIG = config.dynamicConfig ? 'true' : 'false';
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): string[] {
  const missing: string[] = [];
  
  if (!process.env.AMPED_OC_WALLETS_JSON) {
    missing.push('AMPED_OC_WALLETS_JSON');
  }
  
  const mode = process.env.AMPED_OC_MODE || 'execute';
  if (mode === 'execute' && !process.env.AMPED_OC_RPC_URLS_JSON) {
    missing.push('AMPED_OC_RPC_URLS_JSON');
  }
  
  return missing;
}


/**
 * Deep-clone an object while converting BigInt values to strings
 * Prevents serialization errors when OpenClaw framework handles the details field
 */
function sanitizeBigInt(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_, v) => 
    typeof v === 'bigint' ? v.toString() : v
  ));
}

/**
 * Helper to wrap a handler for OpenClaw's tool format
 */
function wrapHandler(handler: (params: unknown) => Promise<unknown>) {
  return async (_toolCallId: string, params: unknown) => {
    const result = await handler(params);
    // Sanitize BigInt values in details to prevent framework serialization errors
    const sanitizedResult = sanitizeBigInt(result);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2) }],
      details: sanitizedResult,
    };
  };
}

/**
 * OpenClaw Plugin Definition
 */
export default {
  id: 'amped-defi',
  name: 'Amped DeFi',
  description: 'DeFi operations plugin for swaps, bridging, and money market via SODAX SDK',
  kind: 'tools' as const,
  configSchema,

  register(api: OpenClawPluginApi) {
    // Apply config from OpenClaw
    const config = api.pluginConfig as Record<string, unknown> || {};
    applyConfig(config);
    
    // Check for missing env vars (silent)
    validateEnvironment();

    // Initialize core components (async, non-blocking, silent)
    (async () => {
      try {
        await getSodaxClientAsync();
        getCacheStats();
        new PolicyEngine();
        getWalletManager();
      } catch (_error) {
        // Silent initialization - errors will surface when tools are used
      }
    })();

    // Register Discovery Tools
    api.registerTool({
      name: 'amped_supported_chains',
      description: 'List all blockchain networks supported by the Amped DeFi plugin',
      parameters: SupportedChainsSchema,
      execute: wrapHandler(handleSupportedChains),
    });

    api.registerTool({
      name: 'amped_supported_tokens',
      description: 'List tokens supported on a specific chain for swaps and bridging',
      parameters: SupportedTokensSchema,
      execute: wrapHandler(handleSupportedTokens),
    });

    api.registerTool({
      name: 'amped_wallet_address',
      description: 'Get the wallet address for a specific wallet ID',
      parameters: WalletAddressSchema,
      execute: wrapHandler(handleWalletAddress),
    });

    api.registerTool({
      name: 'amped_money_market_reserves',
      description: 'Get money market reserve info (APY, utilization, liquidity)',
      parameters: MoneyMarketReservesSchema,
      execute: wrapHandler(handleMoneyMarketReserves),
    });

    api.registerTool({
      name: 'amped_money_market_positions',
      description: 'Get user positions in money market on a single chain',
      parameters: MoneyMarketPositionsSchema,
      execute: wrapHandler(handleMoneyMarketPositions),
    });

    api.registerTool({
      name: 'amped_cross_chain_positions',
      description: 'Get aggregated money market positions across all chains',
      parameters: CrossChainPositionsSchema,
      execute: wrapHandler(handleCrossChainPositions),
    });

    api.registerTool({
      name: 'amped_user_intents',
      description: 'Query user intent history from SODAX API',
      parameters: UserIntentsSchema,
      execute: wrapHandler(handleUserIntents),
    });

    api.registerTool({
      name: 'amped_list_wallets',
      description: 'List ALL configured wallets including evm-wallet-skill, Bankr, and env wallets. Shows nicknames, addresses, types, and supported chains. Use this when user asks "what wallets do I have" or "show my wallets".',
      parameters: ListWalletsSchema,
      execute: wrapHandler(handleListWallets),
    });

    api.registerTool({
      name: 'amped_portfolio_summary',
      description: 'Get a comprehensive portfolio summary including wallet balances (native + major tokens) across chains and money market positions. Use when user asks for "portfolio", "balances", or "summary of positions".',
      parameters: PortfolioSummarySchema,
      execute: wrapHandler(handlePortfolioSummary),
    });

    // Register Wallet Management Tools
    api.registerTool({
      name: 'amped_add_wallet',
      description: 'Add a new wallet with a nickname (evm-wallet-skill, bankr, or env)',
      parameters: AddWalletSchema,
      execute: wrapHandler(handleAddWallet),
    });

    api.registerTool({
      name: 'amped_rename_wallet',
      description: 'Rename a wallet to a new nickname',
      parameters: RenameWalletSchema,
      execute: wrapHandler(handleRenameWallet),
    });

    api.registerTool({
      name: 'amped_remove_wallet',
      description: 'Remove a wallet from configuration (does not delete funds)',
      parameters: RemoveWalletSchema,
      execute: wrapHandler(handleRemoveWallet),
    });

    api.registerTool({
      name: 'amped_set_default_wallet',
      description: 'Set which wallet to use by default for operations',
      parameters: SetDefaultWalletSchema,
      execute: wrapHandler(handleSetDefaultWallet),
    });

    // Register Swap Tools
    api.registerTool({
      name: 'amped_swap_quote',
      description: 'Get a quote for swapping tokens (same chain or cross-chain)',
      parameters: SwapQuoteSchema,
      execute: wrapHandler(handleSwapQuote),
    });

    api.registerTool({
      name: 'amped_swap_execute',
      description: 'Execute a token swap using a previously obtained quote',
      parameters: SwapExecuteSchema,
      execute: wrapHandler(handleSwapExecute),
    });

    api.registerTool({
      name: 'amped_swap_status',
      description: 'Check the status of a swap/bridge operation by intent ID',
      parameters: SwapStatusSchema,
      execute: wrapHandler(handleSwapStatus),
    });

    api.registerTool({
      name: 'amped_swap_cancel',
      description: 'Cancel a pending swap/bridge operation',
      parameters: SwapCancelSchema,
      execute: wrapHandler(handleSwapCancel),
    });

    // Register Bridge Tools
    api.registerTool({
      name: 'amped_bridge_discover',
      description: 'Discover available bridge routes between chains',
      parameters: BridgeDiscoverSchema,
      execute: wrapHandler(handleBridgeDiscover),
    });

    api.registerTool({
      name: 'amped_bridge_quote',
      description: 'Get a quote for bridging tokens between chains',
      parameters: BridgeQuoteSchema,
      execute: wrapHandler(handleBridgeQuote),
    });

    api.registerTool({
      name: 'amped_bridge_execute',
      description: 'Execute a bridge transfer using a previously obtained quote',
      parameters: BridgeExecuteSchema,
      execute: wrapHandler(handleBridgeExecute),
    });

    // Register Money Market Tools
    api.registerTool({
      name: 'amped_mm_supply',
      description: 'Supply (deposit) tokens to money market to earn interest',
      parameters: MmSupplySchema,
      execute: wrapHandler(handleMmSupply),
    });

    api.registerTool({
      name: 'amped_mm_withdraw',
      description: 'Withdraw supplied tokens from money market',
      parameters: MmWithdrawSchema,
      execute: wrapHandler(handleMmWithdraw),
    });

    api.registerTool({
      name: 'amped_mm_borrow',
      description: 'Borrow tokens from money market (cross-chain capable)',
      parameters: MmBorrowSchema,
      execute: wrapHandler(handleMmBorrow),
    });

    api.registerTool({
      name: 'amped_mm_repay',
      description: 'Repay borrowed tokens to money market',
      parameters: MmRepaySchema,
      execute: wrapHandler(handleMmRepay),
    });

    // Register cleanup service
    api.registerService({
      id: 'amped-defi',
      start: () => {},
      stop: async () => {
        resetSodaxClient();
      },
    });
  },
};

// Re-export types and utilities for external use
export { PolicyEngine } from './policy/policyEngine';
export type { SpokeProvider } from './providers/spokeProviderFactory';
export { clearProviderCache,getCacheStats, getSpokeProvider } from './providers/spokeProviderFactory';
export { getSodaxClient, getSodaxClientAsync, resetSodaxClient } from './sodax/client';
export * from './types';
export type { IWalletBackend, WalletBackendType,WalletInfo } from './wallet/types';
export { getWalletManager, resetWalletManager,WalletManager } from './wallet/walletManager';
export { getWalletRegistry,WalletRegistry } from './wallet/walletRegistry';
export { EvmSpokeProvider, SonicSpokeProvider } from '@sodax/sdk';

// Legacy exports for backward compatibility
export async function activate() {
  // Deprecated - use default export
}
export async function deactivate() {
  resetSodaxClient();
}
