/**
 * Bridge Tools for Amped DeFi Plugin
 *
 * NOTE: Bridge operations use the swap infrastructure internally.
 * Cross-chain swaps and bridges are functionally equivalent in SODAX -
 * both use the intent-based cross-chain messaging system.
 *
 * Tools:
 * - amped_bridge_discover: Get bridgeable tokens for a route
 * - amped_bridge_quote: Check bridgeability and max amounts  
 * - amped_bridge_execute: Execute bridge (delegates to swap)
 *
 * @module tools/bridge
 */

import { Static, Type } from '@sinclair/typebox';

import { PolicyEngine } from '../policy/policyEngine';
import { getSpokeProvider } from '../providers/spokeProviderFactory';
import { getSodaxClient } from '../sodax/client';
import { AgentTools, BridgeOperation } from '../types';
import { serializeError } from '../utils/errorUtils';
import { resolveToken } from '../utils/tokenResolver';
import { toSodaxChainId } from '../wallet/types';
import { getWalletManager } from '../wallet/walletManager';
import { handleSwapExecute,handleSwapQuote } from './swap';

// ============================================================================
// TypeBox Schemas
// ============================================================================

/**
 * Schema for amped_bridge_discover tool
 * Discover bridgeable tokens for a given source chain, destination chain, and source token
 */
const BridgeDiscoverSchema = Type.Object({
  srcChainId: Type.String({
    description: 'Source chain ID (e.g., "ethereum", "arbitrum")',
  }),
  dstChainId: Type.String({
    description: 'Destination chain ID (e.g., "sonic", "optimism")',
  }),
  srcToken: Type.String({
    description: 'Source token address or symbol',
  }),
});

/**
 * Schema for amped_bridge_quote tool
 * Check if a bridge route is valid and get maximum bridgeable amount
 */
const BridgeQuoteSchema = Type.Object({
  srcChainId: Type.String({
    description: 'Source chain ID',
  }),
  dstChainId: Type.String({
    description: 'Destination chain ID',
  }),
  srcToken: Type.String({
    description: 'Source token address or symbol',
  }),
  dstToken: Type.String({
    description: 'Destination token address or symbol',
  }),
});

/**
 * Schema for amped_bridge_execute tool
 * Execute a bridge operation with full allowance check and approval flow
 */
const BridgeExecuteSchema = Type.Object({
  walletId: Type.String({
    description: 'Unique identifier for the wallet to use',
  }),
  srcChainId: Type.String({
    description: 'Source chain ID',
  }),
  dstChainId: Type.String({
    description: 'Destination chain ID',
  }),
  srcToken: Type.String({
    description: 'Source token address or symbol to bridge from',
  }),
  dstToken: Type.String({
    description: 'Destination token address or symbol to bridge to',
  }),
  amount: Type.String({
    description: 'Amount to bridge in human-readable units (e.g., "100.5")',
  }),
  recipient: Type.Optional(
    Type.String({
      description: 'Recipient address on destination chain (defaults to wallet address)',
    })
  ),
  timeoutMs: Type.Optional(
    Type.Number({
      description: 'Timeout for bridge operation in milliseconds',
      default: 300000, // 5 minutes
    })
  ),
  policyId: Type.Optional(
    Type.String({
      description: 'Optional policy profile ID for custom limits',
    })
  ),
});

// Type inference from schemas
type BridgeDiscoverParams = Static<typeof BridgeDiscoverSchema>;
type BridgeQuoteParams = Static<typeof BridgeQuoteSchema>;
type BridgeExecuteParams = Static<typeof BridgeExecuteSchema>;

// ============================================================================
// Bridge Discover Tool
// ============================================================================

/**
 * Transaction result type for bridge execute
 */
interface TransactionResult {
  spokeTxHash: string;
  hubTxHash?: string;
}

/**
 * Handler for amped_bridge_discover
 * Retrieves tokens that can be bridged from the source chain to destination chain
 *
 * @param params - Discovery parameters (srcChainId, dstChainId, srcToken)
 * @returns List of bridgeable tokens
 */
async function handleBridgeDiscover(
  params: BridgeDiscoverParams
): Promise<{ bridgeableTokens: string[] }> {
  const { srcChainId, dstChainId, srcToken } = params;

    // Resolve token symbol to address
    const srcTokenAddr = await resolveToken(srcChainId, srcToken);

  console.log('[bridge:discover] Discovering bridgeable tokens', {
    srcChainId,
    dstChainId,
    srcToken,
  });

  try {
    const sodax = getSodaxClient();

    // Get bridgeable tokens from SODAX SDK
    // SDK API: getBridgeableTokens(from: SpokeChainId, to: SpokeChainId, token: string)
    const result = sodax.bridge.getBridgeableTokens(
      toSodaxChainId(srcChainId) as any,
      toSodaxChainId(dstChainId) as any,
      srcTokenAddr
    );

    // Handle Result type - SDK returns Result<XToken[], unknown>
    if (!result.ok) {
      throw new Error(`Failed to get bridgeable tokens: ${serializeError((result as any).error) || 'Unknown error'}`);
    }

    const tokens = result.value;
    const bridgeableTokens = tokens.map((t: any) => t.address || t.symbol || String(t));

    console.log('[bridge:discover] Found bridgeable tokens', {
      count: bridgeableTokens.length,
      tokens: bridgeableTokens,
    });

    return { bridgeableTokens };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[bridge:discover] Failed to discover bridgeable tokens', {
      error: errorMessage,
      srcChainId,
      dstChainId,
      srcToken,
    });
    throw new Error(`Failed to discover bridgeable tokens: ${errorMessage}`);
  }
}

// ============================================================================
// Bridge Quote Tool
// ============================================================================

/**
 * Handler for amped_bridge_quote
 * Checks if a bridge route is valid and returns the maximum bridgeable amount
 *
 * @param params - Quote parameters (srcChainId, dstChainId, srcToken, dstToken)
 * @returns Bridgeability status and maximum amount
 */
async function handleBridgeQuote(
  params: BridgeQuoteParams
): Promise<{ isBridgeable: boolean; maxBridgeableAmount: string }> {
  const { srcChainId, dstChainId, srcToken, dstToken } = params;

    // Resolve token symbols to addresses
    const srcTokenAddr = await resolveToken(srcChainId, srcToken);
    const dstTokenAddr = await resolveToken(dstChainId, dstToken);

  console.log('[bridge:quote] Checking bridge quote', {
    srcChainId,
    dstChainId,
    srcToken,
    dstToken,
  });

  try {
    const sodax = getSodaxClient();

    // Create XToken objects for the SDK
    const fromToken = { chainId: toSodaxChainId(srcChainId), address: srcTokenAddr } as any;
    const toToken = { chainId: toSodaxChainId(dstChainId), address: dstTokenAddr } as any;

    // Check if the route is bridgeable using isBridgeable
    // SDK may have different signature - adapting based on available methods
    let isBridgeable = false;
    try {
      // Try to get bridgeable tokens to check if route exists
      const result = sodax.bridge.getBridgeableTokens(
        toSodaxChainId(srcChainId) as any,
        toSodaxChainId(dstChainId) as any,
        srcTokenAddr
      );
      if (result.ok && result.value.length > 0) {
        isBridgeable = result.value.some((t: any) => 
          t.address?.toLowerCase() === dstTokenAddr.toLowerCase() ||
          t === dstTokenAddr
        );
      }
    } catch {
      isBridgeable = false;
    }

    // Get maximum bridgeable amount
    let maxBridgeableAmount = '0';
    if (isBridgeable) {
      try {
        // SDK API: getBridgeableAmount(from: XToken, to: XToken)
        const maxAmountResult = await sodax.bridge.getBridgeableAmount(fromToken, toToken);
        if (maxAmountResult.ok) {
          const val = maxAmountResult.value as any;
          // BridgeLimit may have different property names depending on SDK version
          maxBridgeableAmount = val?.max?.toString() || 
                                val?.maxAmount?.toString() ||
                                val?.limit?.toString() ||
                                val?.toString() || '0';
        }
      } catch (e) {
        console.warn('[bridge:quote] Could not get max bridgeable amount:', e);
      }
    }

    console.log('[bridge:quote] Bridge quote result', {
      isBridgeable,
      maxBridgeableAmount,
    });

    return { isBridgeable, maxBridgeableAmount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[bridge:quote] Failed to get bridge quote', {
      error: errorMessage,
      srcChainId,
      dstChainId,
      srcToken,
      dstToken,
    });
    throw new Error(`Failed to get bridge quote: ${errorMessage}`);
  }
}

// ============================================================================
// Bridge Execute Tool (Delegates to Swap)
// ============================================================================

/**
 * Handler for amped_bridge_execute
 *
 * NOTE: Bridge operations are implemented via swap infrastructure.
 * Cross-chain swaps and bridges are functionally equivalent in SODAX -
 * both use the intent-based cross-chain messaging system.
 *
 * Flow:
 *   1. Get swap quote for the bridge route
 *   2. Execute swap (handles allowance, approval, and execution)
 *
 * @param params - Execution parameters
 * @returns Transaction result with status and tracking links
 */
async function handleBridgeExecute(
  params: BridgeExecuteParams
): Promise<TransactionResult> {
  const {
    walletId,
    srcChainId,
    dstChainId,
    srcToken,
    dstToken,
    amount,
    recipient,
    timeoutMs = 300000,
    policyId,
  } = params;

  console.log('[bridge:execute] Delegating to swap infrastructure', {
    walletId,
    srcChainId,
    dstChainId,
    srcToken,
    dstToken,
    amount,
  });

  try {
    // Step 1: Get a swap quote for this bridge route
    const quoteResult = await handleSwapQuote({
      walletId,
      srcChainId,
      dstChainId,
      srcToken,
      dstToken,
      amount,
      type: 'exact_input',
      slippageBps: 100, // 1% slippage for bridges
      recipient,
    });

    console.log('[bridge:execute] Got swap quote', quoteResult);

    // Step 2: Execute the swap
    const swapResult = await handleSwapExecute({
      walletId,
      quote: {
        srcChainId,
        dstChainId,
        srcToken: String(quoteResult.srcToken),
        dstToken: String(quoteResult.dstToken),
        inputAmount: String(quoteResult.inputAmount),
        outputAmount: String(quoteResult.outputAmount),
        slippageBps: Number(quoteResult.slippageBps),
        deadline: Number(quoteResult.deadline),
        recipient,
      },
      policyId,
      timeoutMs,
    });

    console.log('[bridge:execute] Swap executed', swapResult);

    // Map swap result to bridge result format
    return {
      spokeTxHash: String(swapResult.initiationTx || swapResult.spokeTxHash || ''),
      hubTxHash: swapResult.hubTxHash ? String(swapResult.hubTxHash) : undefined,
      status: String(swapResult.status),
      message: swapResult.message ? String(swapResult.message) : 'Bridge executed via swap infrastructure',
      sodaxScanUrl: swapResult.sodaxScanUrl ? String(swapResult.sodaxScanUrl) : undefined,
    } as TransactionResult;
  } catch (error) {
    const errorMessage = serializeError(error);
    console.error('[bridge:execute] Bridge via swap failed:', errorMessage);
    throw new Error(`Bridge execution failed: ${errorMessage}`);
  }
}

// ============================================================================
// Tool Registration
// ============================================================================

/**
 * Register all bridge tools with the agent tools registry
 *
 * @param agentTools - The agent tools registry
 */
export function registerBridgeTools(agentTools: AgentTools): void {
  // Register bridge discover tool
  agentTools.register({
    name: 'amped_bridge_discover',
    summary: 'Discover bridgeable tokens for a given source chain and token',
    description:
      'Retrieves a list of tokens that can be bridged from the specified source chain ' +
      'to the destination chain, starting from a specific source token. ' +
      'Use this to find valid bridge routes before requesting a quote.',
    schema: BridgeDiscoverSchema,
    handler: handleBridgeDiscover,
  });

  console.log('[bridge] Registered tool: amped_bridge_discover');

  // Register bridge quote tool
  agentTools.register({
    name: 'amped_bridge_quote',
    summary: 'Check bridgeability and get maximum bridgeable amount',
    description:
      'Validates whether a specific bridge route (source chain/token → destination chain/token) ' +
      'is supported and returns the maximum amount that can be bridged. ' +
      'Always call this before executing a bridge to verify the route is valid.',
    schema: BridgeQuoteSchema,
    handler: handleBridgeQuote,
  });

  console.log('[bridge] Registered tool: amped_bridge_quote');

  // Register bridge execute tool
  agentTools.register({
    name: 'amped_bridge_execute',
    summary: 'Execute a cross-chain bridge operation',
    description:
      'Executes a bridge operation that moves tokens from a source chain to a destination chain. ' +
      'This tool handles the complete flow: policy validation, allowance checking, ' +
      'token approval (if needed), and bridge execution. ' +
      'Returns transaction hashes for both the spoke chain and hub chain.',
    schema: BridgeExecuteSchema,
    handler: handleBridgeExecute,
  });

  console.log('[bridge] Registered tool: amped_bridge_execute');
}

// Export schemas for testing and reuse
export { BridgeDiscoverSchema, BridgeExecuteSchema,BridgeQuoteSchema };

// Export handlers
export { handleBridgeDiscover, handleBridgeExecute,handleBridgeQuote };
