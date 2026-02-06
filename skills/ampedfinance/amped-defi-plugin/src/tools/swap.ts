/**
 * Swap Tools for Amped DeFi Plugin
 * 
 * Provides OpenClaw tools for cross-chain swap operations using SODAX SDK:
 * - amped_swap_quote: Get exact-in/exact-out quotes
 * - amped_swap_execute: Execute swaps with policy enforcement
 * - amped_swap_status: Poll intent status
 * - amped_swap_cancel: Cancel active intents
 */

import { Static, Type } from '@sinclair/typebox';
// SDK types - using any for now due to beta API changes
import { Intent } from '@sodax/sdk';

import { serializeError } from '../utils/errorUtils';
type QuoteRequest = any;
type SwapQuote = any;
type IntentStatus = any;
import { PolicyEngine } from '../policy/policyEngine';
import { getSpokeProvider } from '../providers/spokeProviderFactory';
import { getSodaxClient } from '../sodax/client';
import type { AgentTools } from '../types';
import { getSodaxApiClient } from '../utils/sodaxApi';
import { toSodaxChainId } from '../wallet/types';
import { getWalletManager } from '../wallet/walletManager';

// ============================================================================
// SODAX API & Explorer Links
// ============================================================================

const SODAX_CANARY_API = 'https://canary-api.sodax.com/v1/be';

// Chain ID to block explorer mapping
const CHAIN_EXPLORERS: Record<string, string> = {
  'ethereum': 'https://etherscan.io/tx/',
  'base': 'https://basescan.org/tx/',
  'arbitrum': 'https://arbiscan.io/tx/',
  'optimism': 'https://optimistic.etherscan.io/tx/',
  'polygon': 'https://polygonscan.com/tx/',
  'sonic': 'https://sonicscan.org/tx/',
  'avalanche': 'https://snowtrace.io/tx/',
  'bsc': 'https://bscscan.com/tx/',
  'solana': 'https://solscan.io/tx/',
};

function getExplorerLink(chainId: string, txHash: string): string | undefined {
  // Normalize chain ID (remove 0x prefix and suffix if present)
  const normalizedChainId = chainId.replace(/^0x[\\da-f]+\\./, '').toLowerCase();
  const explorer = CHAIN_EXPLORERS[normalizedChainId];
  return explorer ? `${explorer}${txHash}` : undefined;
}

async function fetchIntentFromSodax(intentHash: string): Promise<any> {
  try {
    const response = await fetch(`${SODAX_CANARY_API}/intent/${intentHash}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Ensure intent hash is in hex format (0x prefixed)
 */
function toHexIntentHash(hash: unknown): string | undefined {
  if (!hash) return undefined;
  const str = String(hash);
  // Already hex format
  if (str.startsWith('0x')) return str;
  // Convert decimal BigInt string to hex
  try {
    return '0x' + BigInt(str).toString(16);
  } catch {
    return str; // Return as-is if conversion fails
  }
}

function getSodaxScanUrl(txHash: string): string {
  return `https://sodaxscan.com/messages/search?value=${txHash}`;
}

function getSodaxIntentApiUrl(intentHash: string): string {
  return `${SODAX_CANARY_API}/intent/${intentHash}`;
}

// SODAX internal chain ID to block explorer mapping
const SODAX_CHAIN_EXPLORERS: Record<number, string> = {
  1: 'https://solscan.io/tx/',           // Solana
  30: 'https://basescan.org/tx/',        // Base
  146: 'https://sonicscan.org/tx/',      // Sonic (hub)
  42161: 'https://arbiscan.io/tx/',      // Arbitrum
  10: 'https://optimistic.etherscan.io/tx/', // Optimism
  137: 'https://polygonscan.com/tx/',    // Polygon
  56: 'https://bscscan.com/tx/',         // BSC
  43114: 'https://snowtrace.io/tx/',     // Avalanche
};

/**
 * Poll SODAX API until intent is delivered, then return delivery tx explorer link
 */
async function pollForDelivery(
  intentHash: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 3000
): Promise<{ delivered: boolean; deliveryTxHash?: string; deliveryExplorer?: string; dstChainId?: number }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${SODAX_CANARY_API}/intent/${intentHash}`);
      if (!response.ok) {
        await new Promise(r => setTimeout(r, pollIntervalMs));
        continue;
      }
      
      const data: any = await response.json();
      
      // Check if intent is filled (closed)
      if (data.open === false && data.events?.length > 0) {
        const fillEvent = data.events.find((e: any) => e.eventType === 'intent-filled');
        if (fillEvent) {
          const dstChainId = data.intent?.dstChain;
          const explorer = SODAX_CHAIN_EXPLORERS[dstChainId] || '';
          
          return {
            delivered: true,
            deliveryTxHash: fillEvent.txHash,
            deliveryExplorer: explorer ? `${explorer}${fillEvent.txHash}` : undefined,
            dstChainId
          };
        }
      }
      
      await new Promise(r => setTimeout(r, pollIntervalMs));
    } catch {
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  }
  
  return { delivered: false };
}

import { getTokenInfo,resolveToken } from '../utils/tokenResolver';

// ============================================================================
// TypeBox Schemas
// ============================================================================

const SwapTypeSchema = Type.Union([
  Type.Literal('exact_input'),
  Type.Literal('exact_output')
]);

const SwapQuoteRequestSchema = Type.Object({
  walletId: Type.String(),
  srcChainId: Type.String(),
  dstChainId: Type.String(),
  srcToken: Type.String(),
  dstToken: Type.String(),
  amount: Type.String(),
  type: SwapTypeSchema,
  slippageBps: Type.Number({ default: 50, minimum: 0, maximum: 10000 }),
  recipient: Type.Optional(Type.String({
    description: 'Recipient address on destination chain. For cross-chain swaps to Solana, provide a Solana base58 address. Defaults to wallet address if omitted.'
  }))
});

// Result schema for documentation (not used at runtime)
const _SwapQuoteResultSchema = Type.Object({
  inputAmount: Type.String(),
  outputAmount: Type.String(),
  srcToken: Type.String(),
  dstToken: Type.String(),
  srcChainId: Type.String(),
  dstChainId: Type.String(),
  slippageBps: Type.Number(),
  deadline: Type.Number(),
  fees: Type.Object({
    solverFee: Type.String(),
    protocolFee: Type.Optional(Type.String()),
    partnerFee: Type.Optional(Type.String())
  }),
  minOutputAmount: Type.Optional(Type.String()),
  maxInputAmount: Type.Optional(Type.String()),
    recipient: Type.Optional(Type.String())
});
void _SwapQuoteResultSchema; // Suppress unused warning

const SwapExecuteParamsSchema = Type.Object({
  walletId: Type.String(),
  quote: Type.Object({
    srcChainId: Type.String(),
    dstChainId: Type.String(),
    srcToken: Type.String(),
    dstToken: Type.String(),
    inputAmount: Type.String(),
    outputAmount: Type.String(),
    slippageBps: Type.Number(),
    deadline: Type.Number(),
    minOutputAmount: Type.Optional(Type.String()),
    maxInputAmount: Type.Optional(Type.String()),
    recipient: Type.Optional(Type.String())
  }),
  maxSlippageBps: Type.Optional(Type.Number({ minimum: 0, maximum: 10000 })),
  policyId: Type.Optional(Type.String()),
  skipSimulation: Type.Optional(Type.Boolean({ default: false })),
  timeoutMs: Type.Optional(Type.Number({ default: 120000 }))
});

const SwapExecuteResultSchema = Type.Object({
  spokeTxHash: Type.String(),
  hubTxHash: Type.Optional(Type.String()),
  intentHash: Type.Optional(Type.String()),
  status: Type.String(),
  message: Type.Optional(Type.String())
});

const SwapStatusParamsSchema = Type.Object({
  txHash: Type.Optional(Type.String()),
  intentHash: Type.Optional(Type.String())
});

const SwapStatusResultSchema = Type.Object({
  status: Type.String(),
  intentHash: Type.Optional(Type.String()),
  spokeTxHash: Type.Optional(Type.String()),
  hubTxHash: Type.Optional(Type.String()),
  filledAmount: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
  createdAt: Type.Optional(Type.Number()),
  expiresAt: Type.Optional(Type.Number())
});

const SwapCancelParamsSchema = Type.Object({
  walletId: Type.String(),
  intent: Type.Object({
    id: Type.String(),
    srcChainId: Type.String(),
    dstChainId: Type.String(),
    srcToken: Type.String(),
    dstToken: Type.String(),
    amount: Type.String(),
    deadline: Type.Number()
  }),
  srcChainId: Type.String()
});

const SwapCancelResultSchema = Type.Object({
  success: Type.Boolean(),
  txHash: Type.Optional(Type.String()),
  message: Type.String()
});

// ============================================================================
// Type Definitions
// ============================================================================

type SwapQuoteRequest = Static<typeof SwapQuoteRequestSchema>;
type SwapExecuteParams = Static<typeof SwapExecuteParamsSchema>;
type SwapStatusParams = Static<typeof SwapStatusParamsSchema>;
type SwapCancelParams = Static<typeof SwapCancelParamsSchema>;

// ============================================================================
// Swap Quote Tool
// ============================================================================

async function handleSwapQuote(params: SwapQuoteRequest): Promise<Record<string, unknown>> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const sodaxClient = getSodaxClient();
    
    // Resolve token symbols to addresses
    const srcTokenAddr = await resolveToken(params.srcChainId, params.srcToken);
    const dstTokenAddr = await resolveToken(params.dstChainId, params.dstToken);
    
    // Get token info for decimals
    const srcTokenInfo = await getTokenInfo(params.srcChainId, srcTokenAddr);
    const dstTokenInfo = await getTokenInfo(params.dstChainId, dstTokenAddr);
    
    // Get token config to determine decimals for amount conversion
    const configService = (sodaxClient as any).configService;
    const decimals = srcTokenInfo?.decimals ?? 18; // Default to 18 (most EVM tokens) if not found
    
    // Convert human-readable amount to raw amount (bigint)
    const amountFloat = parseFloat(params.amount);
    const rawAmount = BigInt(Math.floor(amountFloat * Math.pow(10, decimals)));
    
    // Build SDK-compatible request with snake_case parameters
    const quoteRequest = {
      token_src: srcTokenAddr,
      token_src_blockchain_id: toSodaxChainId(params.srcChainId),
      token_dst: dstTokenAddr,
      token_dst_blockchain_id: toSodaxChainId(params.dstChainId),
      amount: rawAmount,
      quote_type: params.type
    };
    
    console.log('[swap_quote] SDK request:', JSON.stringify(quoteRequest, (k, v) => typeof v === 'bigint' ? v.toString() : v));

    const quoteResult = await (sodaxClient as any).swaps.getQuote(quoteRequest);
    
    // Handle Result type from SDK
    if (quoteResult.ok === false) {
      const errorMsg = quoteResult.error instanceof Error 
        ? quoteResult.error.message 
        : typeof quoteResult.error === 'string' 
          ? quoteResult.error 
          : JSON.stringify(quoteResult.error, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
      throw new Error(`Quote failed: ${errorMsg}`);
    }
    
    const quote = quoteResult.ok ? quoteResult.value : quoteResult;
    
    console.log('[swap_quote] SDK response:', JSON.stringify(quote, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    
    // Get output token decimals with multiple fallbacks
    // SDK returns quoted_amount as bigint - convert to human-readable string
    let dstDecimals = (quote as any).token_dst_decimals || (quote as any).tokenDstDecimals;
    
    if (!dstDecimals && dstTokenInfo) {
      dstDecimals = dstTokenInfo.decimals;
    }
    
    if (!dstDecimals) {
      // Hardcoded decimals for common stablecoins
      const KNOWN_DECIMALS: Record<string, number> = {
        usdc: 6, USDC: 6, usdt: 6, USDT: 6, sol: 9, SOL: 9,
        dai: 18, DAI: 18, bnusd: 18, bnUSD: 18
      };
      const tokenSymbol = params.dstToken.toUpperCase();
      dstDecimals = KNOWN_DECIMALS[tokenSymbol] || 18;
      console.warn(`[swap_quote] Using fallback decimals (${dstDecimals}) for token ${params.dstToken}`);
    }
    const quotedAmount = quote.quoted_amount || quote.quotedAmount || quote.outputAmount;
    const outputAmountStr = quotedAmount 
      ? (Number(quotedAmount) / Math.pow(10, dstDecimals)).toString()
      : '0';
    
    // Normalize and return quote (SDK uses snake_case, we return camelCase)
    const result = {
      inputAmount: params.amount,
      outputAmount: outputAmountStr,
      srcToken: srcTokenAddr,
      dstToken: dstTokenAddr,
      srcChainId: params.srcChainId,
      dstChainId: params.dstChainId,
      slippageBps: params.slippageBps,
      deadline: quote.deadline || calculateDeadline(300), // 5 min default
      fees: {
        solverFee: quote.solver_fee || quote.fees?.solverFee || '0',
        protocolFee: quote.protocol_fee || quote.fees?.protocolFee,
        partnerFee: quote.partner_fee || quote.fees?.partnerFee
      },
      minOutputAmount: quote.min_output_amount || quote.minOutputAmount,
      maxInputAmount: quote.max_input_amount || quote.maxInputAmount,
      recipient: params.recipient, // Pass through for execute
      // Include raw SDK response for debugging
      _raw: JSON.parse(JSON.stringify(quote, (k, v) => typeof v === 'bigint' ? v.toString() : v))
    };
    
    logStructured({
      requestId,
      opType: 'swap_quote',
      walletId: params.walletId,
      chainIds: [params.srcChainId, params.dstChainId],
      tokenAddresses: [params.srcToken, params.dstToken],
      durationMs: Date.now() - startTime,
      success: true
    });
    
    return result;
  } catch (error) {
    logStructured({
      requestId,
      opType: 'swap_quote',
      walletId: params.walletId,
      chainIds: [params.srcChainId, params.dstChainId],
      durationMs: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new Error(`Failed to get swap quote: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Swap Execute Tool
// ============================================================================

async function handleSwapExecute(params: SwapExecuteParams): Promise<Record<string, unknown>> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // 1. Initialize dependencies
    const policyEngine = new PolicyEngine();
    const walletManager = getWalletManager();
    const sodaxClient = getSodaxClient();
    
    // Resolve token symbols to addresses
    const srcTokenAddr = await resolveToken(params.quote.srcChainId, params.quote.srcToken);
    const dstTokenAddr = await resolveToken(params.quote.dstChainId, params.quote.dstToken);
    
    // Get token info for decimals
    const srcTokenInfo = await getTokenInfo(params.quote.srcChainId, srcTokenAddr);
    const dstTokenInfo = await getTokenInfo(params.quote.dstChainId, dstTokenAddr);
    
    // 2. Resolve wallet
    const wallet = await walletManager.resolve(params.walletId);
    const walletAddress = await wallet.getAddress();
    
    // 3. Policy check
    const policyCheck = await policyEngine.checkSwap({
      walletId: params.walletId,
      srcChainId: params.quote.srcChainId,
      dstChainId: params.quote.dstChainId,
      srcToken: params.quote.srcToken,
      dstToken: params.quote.dstToken,
      inputAmount: params.quote.inputAmount,
      slippageBps: params.maxSlippageBps || params.quote.slippageBps,
      policyId: params.policyId
    });
    
    if (!policyCheck.allowed) {
      throw new Error(`Policy check failed: ${policyCheck.reason}`);
    }
    
    // 4. Get spoke provider for source chain
    const spokeProvider = await getSpokeProvider(
      params.walletId,
      params.quote.srcChainId
    );
    
    // 5. Convert amounts to bigint FIRST (needed for intentParams)
    const srcDecimals = srcTokenInfo?.decimals ?? 18;
    const dstDecimals = dstTokenInfo?.decimals ?? 18;
    const inputAmountRaw = BigInt(Math.floor(parseFloat(params.quote.inputAmount) * Math.pow(10, srcDecimals)));
    const outputAmountRaw = BigInt(Math.floor(parseFloat(params.quote.outputAmount) * Math.pow(10, dstDecimals)));
    
    // Calculate minOutputAmount with slippage
    const slippageBps = params.maxSlippageBps || params.quote.slippageBps || 100;
    const minOutputAmountRaw = outputAmountRaw - (outputAmountRaw * BigInt(slippageBps) / 10000n);
    
    console.log("[swap_execute] Amount conversion:", {
      inputAmount: params.quote.inputAmount,
      inputAmountRaw: inputAmountRaw.toString(),
      outputAmount: params.quote.outputAmount,
      outputAmountRaw: outputAmountRaw.toString(),
      minOutputAmountRaw: minOutputAmountRaw.toString(),
      srcDecimals,
      dstDecimals
    });
    
    // 6. Build intentParams (used for allowance check, approval, and swap)
    const intentParams = {
      srcAddress: walletAddress,
      dstAddress: params.quote.recipient || walletAddress,
      srcChain: toSodaxChainId(params.quote.srcChainId),
      dstChain: toSodaxChainId(params.quote.dstChainId),
      inputToken: srcTokenAddr,
      outputToken: dstTokenAddr,
      inputAmount: inputAmountRaw,
      minOutputAmount: minOutputAmountRaw,
      deadline: BigInt(params.quote.deadline),
      allowPartialFill: false,
      solver: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      data: "0x" as `0x${string}`
    };
    
    // 7. Check allowance using SDK's expected API
    let allowanceValid = false;
    try {
      const allowanceResult = await (sodaxClient as any).swaps.isAllowanceValid({
        intentParams,
        spokeProvider
      });
      allowanceValid = allowanceResult?.ok ? allowanceResult.value : !!allowanceResult;
    } catch (e) {
      console.warn('[swap_execute] Allowance check failed, assuming approval needed:', e);
      allowanceValid = false;
    }
    
    // 8. Approve if needed using SDK's expected API
    if (!allowanceValid) {
      logStructured({
        requestId,
        opType: 'swap_approve',
        walletId: params.walletId,
        chainId: params.quote.srcChainId,
        token: srcTokenAddr,
        message: 'Token approval required'
      });
      
      const approvalResult = await (sodaxClient as any).swaps.approve({
        intentParams,
        spokeProvider
      });
      
      const approvalTx = approvalResult?.ok ? approvalResult.value : approvalResult;
      
      // Wait for approval confirmation if possible
      if ((spokeProvider as any).walletProvider?.waitForTransactionReceipt && approvalTx) {
        await (spokeProvider as any).walletProvider.waitForTransactionReceipt(approvalTx);
      }
      
      logStructured({
        requestId,
        opType: 'swap_approve',
        walletId: params.walletId,
        chainId: params.quote.srcChainId,
        token: srcTokenAddr,
        approvalTx: String(approvalTx),
        success: true
      });
    }
    
    // 9. Execute swap
    const swapResult = await (sodaxClient as any).swaps.swap({
      intentParams,
      spokeProvider,
      skipSimulation: params.skipSimulation || false,
      timeout: params.timeoutMs || 120000
    });
    
    // Handle Result type from SDK
    if (swapResult.ok === false) {
      const errorMsg = swapResult.error instanceof Error 
        ? swapResult.error.message 
        : typeof swapResult.error === 'string' 
          ? swapResult.error 
          : JSON.stringify(swapResult.error, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
      throw new Error(`Swap failed: ${errorMsg}`);
    }
    
    const value = swapResult.ok ? swapResult.value : swapResult;
    
    // SDK may return [response, intent, deliveryInfo] tuple
    const [solverResponse, intent, deliveryInfo] = Array.isArray(value) ? value : [value, undefined, undefined];
    
    // Extract internal tracking info
    const srcTxHash = deliveryInfo?.srcTxHash;
    const intentHash = toHexIntentHash((solverResponse as any)?.intent_hash) || toHexIntentHash(intent?.intentId);
    
    // Poll for delivery confirmation (wait up to 60s)
    let deliveryResult: { delivered: boolean; deliveryExplorer?: string } = { delivered: false };
    if (intentHash) {
      console.log('[swap_execute] Waiting for delivery confirmation...');
      deliveryResult = await pollForDelivery(intentHash, 60000, 3000);
    }
    
    // Build user-friendly result
    const result = {
      status: deliveryResult.delivered ? 'delivered' : 'submitted',
      message: deliveryResult.delivered 
        ? 'Swap completed! Funds delivered to destination.' 
        : 'Swap submitted, awaiting cross-chain delivery...',
      // User-friendly tracking link
      sodaxScanUrl: srcTxHash ? getSodaxScanUrl(srcTxHash) : undefined,
      // Source chain: where user initiated the swap
      // Destination chain: where user RECEIVED funds
      initiationTx: srcTxHash ? getExplorerLink(params.quote.srcChainId, srcTxHash) : undefined,
      receiptTx: deliveryResult.deliveryExplorer,
    };
    
    logStructured({
      requestId,
      opType: 'swap_execute',
      walletId: params.walletId,
      chainIds: [params.quote.srcChainId, params.quote.dstChainId],
      tokenAddresses: [params.quote.srcToken, params.quote.dstToken],
      durationMs: Date.now() - startTime,
      success: true
    });
    
    return result;
  } catch (error) {
    logStructured({
      requestId,
      opType: 'swap_execute',
      walletId: params.walletId,
      chainIds: [params.quote.srcChainId, params.quote.dstChainId],
      durationMs: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new Error(`Swap execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Swap Status Tool
// ============================================================================


async function handleSwapStatus(params: SwapStatusParams): Promise<Record<string, unknown>> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    if (!params.txHash && !params.intentHash) {
      throw new Error('Either txHash or intentHash must be provided');
    }
    
    // Use our SodaxApiClient for Backend API access (not SDK)
    const sodaxApi = getSodaxApiClient();
    
    let intentData: any = null;
    
    // Try intentHash first (most reliable)
    if (params.intentHash) {
      try {
        intentData = await sodaxApi.getIntentByHash(params.intentHash);
      } catch (err) {
        console.warn(`[swap_status] getIntentByHash failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    // If intentHash lookup failed or wasn't provided, try txHash
    // Note: txHash should be from the HUB chain (Sonic), not spoke chain
    if (!intentData && params.txHash) {
      try {
        intentData = await sodaxApi.getIntentByTxHash(params.txHash);
      } catch (err) {
        // txHash lookup failed - provide helpful error message
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Unable to find intent for txHash: ${params.txHash}. ` +
          `Note: The txHash must be from the HUB chain (Sonic), not the spoke chain. ` +
          `If you have a spoke chain txHash (Base, Arbitrum, etc.), use amped_user_intents to find the intent first. ` +
          `Error: ${errorMsg}`
        );
      }
    }
    
    if (!intentData) {
      throw new Error('Unable to retrieve swap status. Provide a valid intentHash or hub chain txHash.');
    }
    
    // Extract intent details
    const intentHash = intentData.intentHash;
    const hubTxHash = intentData.txHash;  // This is the hub chain tx that created the intent
    const isOpen = intentData.open;
    const intent = intentData.intent;
    
    // Determine status from intent state
    let status = 'unknown';
    if (intentData.open === true) {
      status = 'pending';
    } else if (intentData.open === false) {
      // Check events to determine if filled or cancelled/expired
      const filledEvent = intentData.events?.find((e: any) => e.eventType === 'intent-filled');
      const cancelledEvent = intentData.events?.find((e: any) => 
        e.eventType === 'intent-cancelled' || e.eventType === 'intent-expired'
      );
      if (filledEvent) {
        status = 'filled';
      } else if (cancelledEvent) {
        status = cancelledEvent.eventType === 'intent-cancelled' ? 'cancelled' : 'expired';
      } else {
        status = 'closed';
      }
    }
    
    // Extract fulfillment details if available
    const filledEvent = intentData.events?.find((e: any) => e.eventType === 'intent-filled');
    const fulfillmentTxHash = filledEvent?.txHash;
    const receivedOutput = filledEvent?.intentState?.receivedOutput;
    
    // Build result
    const result: Record<string, unknown> = {
      status,
      intentHash,
      hubTxHash,  // Hub chain tx that created the intent
      spokeTxHash: params.txHash !== hubTxHash ? params.txHash : undefined,  // Original spoke tx if different
      open: isOpen,
      // Intent details
      srcChain: intent?.srcChain,
      dstChain: intent?.dstChain,
      inputToken: intent?.inputToken,
      outputToken: intent?.outputToken,
      inputAmount: intent?.inputAmount,
      minOutputAmount: intent?.minOutputAmount,
      receivedOutput: receivedOutput,
      deadline: intent?.deadline ? new Date(parseInt(intent.deadline) * 1000).toISOString() : undefined,
      createdAt: intentData.createdAt,
      // Fulfillment details
      fulfillmentTxHash,
      fulfillmentChain: intent?.dstChain,
      // Tracking links
      sodaxScanUrl: `https://sodaxscan.com/intents/${intentHash}`,
    };
    
    logStructured({
      requestId,
      opType: 'swap_status',
      intentHash,
      txHash: params.txHash,
      status,
      durationMs: Date.now() - startTime,
      success: true
    });
    
    return result;
  } catch (error) {
    logStructured({
      requestId,
      opType: 'swap_status',
      intentHash: params.intentHash,
      txHash: params.txHash,
      durationMs: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new Error(`Failed to get swap status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Swap Cancel Tool
// ============================================================================

async function handleSwapCancel(params: SwapCancelParams): Promise<Record<string, unknown>> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const walletManager = getWalletManager();
    const sodaxClient = getSodaxClient();
    
    // Resolve token symbols to addresses
    const srcTokenAddr = await resolveToken(params.intent.srcChainId, params.intent.srcToken);
    const dstTokenAddr = await resolveToken(params.intent.dstChainId, params.intent.dstToken);
    
    // Get token info for decimals
    const srcTokenInfo = await getTokenInfo(params.intent.srcChainId, srcTokenAddr);
    const dstTokenInfo = await getTokenInfo(params.intent.dstChainId, dstTokenAddr);
    
    // Resolve wallet (validates it exists)
    await walletManager.resolve(params.walletId);
    
    // Get spoke provider for source chain
    const spokeProvider = await getSpokeProvider(
      params.walletId,
      params.srcChainId
    );
    
    // Construct intent object for cancellation
    const intent = {
      id: params.intent.id,
      srcChainId: params.intent.srcChainId,
      dstChainId: params.intent.dstChainId,
      srcToken: params.intent.srcToken,
      dstToken: params.intent.dstToken,
      amount: params.intent.amount,
      deadline: BigInt(params.intent.deadline),
      createdAt: Date.now(),
      status: 'pending'
    } as unknown as Intent;
    
    // Cancel the intent - SDK expects (intent, spokeProvider)
    const cancelResult = await (sodaxClient as any).swaps.cancelIntent(intent, spokeProvider);
    
    // Handle Result type
    if (cancelResult.ok === false) {
      throw new Error(`Cancel failed: ${serializeError(cancelResult.error)}`);
    }
    
    const cancelTx = cancelResult.ok ? cancelResult.value : cancelResult;
    const cancelTxHash = typeof cancelTx === 'string' ? cancelTx : String(cancelTx);
    
    // Wait for cancellation confirmation if possible
    // SDK may expose waitForTransactionReceipt on the underlying wallet provider
    if ((spokeProvider as any).walletProvider?.waitForTransactionReceipt) {
      await (spokeProvider as any).walletProvider.waitForTransactionReceipt(cancelTxHash);
    }
    
    const result = {
      success: true,
      txHash: cancelTxHash,
      message: 'Intent cancelled successfully'
    };
    
    logStructured({
      requestId,
      opType: 'swap_cancel',
      walletId: params.walletId,
      chainId: params.srcChainId,
      intentId: params.intent.id,
      txHash: cancelTxHash,
      durationMs: Date.now() - startTime,
      success: true
    });
    
    return result;
  } catch (error) {
    logStructured({
      requestId,
      opType: 'swap_cancel',
      walletId: params.walletId,
      chainId: params.srcChainId,
      intentId: params.intent.id,
      durationMs: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new Error(`Failed to cancel swap: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function calculateDeadline(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

interface LogEntry {
  requestId: string;
  opType: string;
  walletId?: string;
  chainId?: string;
  chainIds?: string[];
  token?: string;
  tokenAddresses?: string[];
  intentHash?: string;
  txHash?: string;
  spokeTxHash?: string;
  hubTxHash?: string;
  approvalTx?: string;
  status?: string;
  durationMs?: number;
  success?: boolean;
  error?: string;
  message?: string;
  intentId?: string;
}

function logStructured(entry: LogEntry): void {
  // Structured JSON logging for observability
  // Use replacer to handle BigInt serialization
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
    component: 'amped-defi-swap'
  }, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

// ============================================================================
// Tool Registration
// ============================================================================

export function registerSwapTools(agentTools: AgentTools): void {
  // Register swap quote tool
  agentTools.register({
    name: 'amped_swap_quote',
    summary: 'Get a swap quote for exact-in or exact-out swaps across chains',
    description: 'Retrieves a quote for swapping tokens across chains using the SODAX swap protocol. ' +
      'Supports both exact input (specify input amount, get output estimate) and ' +
      'exact output (specify desired output, get required input) modes.',
    schema: SwapQuoteRequestSchema,
    handler: handleSwapQuote
  });
  
  // Register swap execute tool
  agentTools.register({
    name: 'amped_swap_execute',
    summary: 'Execute a swap with policy enforcement and allowance handling',
    description: 'Executes a swap using a previously obtained quote. ' +
      'Performs policy checks, validates allowances, approves tokens if needed, ' +
      'and executes the swap transaction. Returns transaction hashes and intent status.',
    schema: SwapExecuteParamsSchema,
    handler: handleSwapExecute
  });
  
  // Register swap status tool
  agentTools.register({
    name: 'amped_swap_status',
    summary: 'Check the status of a swap intent or transaction',
    description: 'Polls the status of a swap by intent hash or transaction hash. ' +
      'Returns current status, fill amount, error details if failed, and timing information.',
    schema: SwapStatusParamsSchema,
    handler: handleSwapStatus
  });
  
  // Register swap cancel tool
  agentTools.register({
    name: 'amped_swap_cancel',
    summary: 'Cancel an active swap intent',
    description: 'Cancels a pending swap intent on the source chain. ' +
      'Requires the intent details and source chain ID. Returns cancellation transaction hash.',
    schema: SwapCancelParamsSchema,
    handler: handleSwapCancel
  });
}

// Silence unused variable warnings for result schemas (used for documentation)
void SwapExecuteResultSchema;
void SwapStatusResultSchema;
void SwapCancelResultSchema;

// Export schemas with consistent naming
export {
  SwapCancelParamsSchema as SwapCancelSchema,
  SwapExecuteParamsSchema as SwapExecuteSchema,
  SwapQuoteRequestSchema as SwapQuoteSchema,
  SwapStatusParamsSchema as SwapStatusSchema,
};

// Export handlers
export {
  handleSwapCancel,
  handleSwapExecute,
  handleSwapQuote,
  handleSwapStatus,
};
