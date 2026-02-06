/**
 * SODAX API Client
 * 
 * Provides access to SODAX backend API endpoints for querying intents,
 * user history, and other off-chain data.
 */

import { AmpedDefiError,ErrorCode } from './errors';

const DEFAULT_BASE_URL = 'https://canary-api.sodax.com';
const API_VERSION = 'v1';

export interface SodaxApiConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface IntentState {
  exists: boolean;
  remainingInput: string;
  receivedOutput: string;
  pendingPayment: boolean;
}

export interface IntentEvent {
  eventType: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  intentState: IntentState;
}

export interface IntentDetails {
  intentId: string;
  creator: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  minOutputAmount: string;
  deadline: string;
  allowPartialFill: boolean;
  srcChain: number;
  dstChain: number;
  srcAddress: string;
  dstAddress: string;
  solver: string;
  data: string;
}

export interface UserIntent {
  intentHash: string;
  txHash: string;
  logIndex: number;
  chainId: number;
  blockNumber: number;
  open: boolean;
  intent: IntentDetails;
  events: IntentEvent[];
  createdAt: string;
}

export interface UserIntentFilters {
  open?: boolean;
  srcChain?: number;
  dstChain?: number;
  inputToken?: string;
  outputToken?: string;
}

export class SodaxApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(config: SodaxApiConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.SODAX_API_URL || DEFAULT_BASE_URL;
    this.apiKey = config.apiKey || process.env.SODAX_API_KEY;
    this.timeoutMs = config.timeoutMs || 30000;
  }

  /**
   * Get intent by intentHash
   * Most reliable lookup method - works for all intents
   */
  async getIntentByHash(intentHash: string): Promise<UserIntent | null> {
    const normalizedHash = intentHash.startsWith('0x') ? intentHash : `0x${intentHash}`;
    const url = `${this.baseUrl}/${API_VERSION}/be/intent/${normalizedHash}`;

    console.log('[sodaxApi] Fetching intent by hash:', { intentHash: normalizedHash });

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new AmpedDefiError(
          ErrorCode.UNKNOWN_ERROR,
          `SODAX API error: ${response.status} ${errorText}`
        );
      }

      return await response.json() as UserIntent;
    } catch (error) {
      if (error instanceof AmpedDefiError) throw error;
      throw new AmpedDefiError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to fetch intent by hash: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get intent by transaction hash
   * NOTE: This expects the HUB chain (Sonic) transaction hash, NOT spoke chain tx
   */
  async getIntentByTxHash(txHash: string): Promise<UserIntent | null> {
    const normalizedHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    const url = `${this.baseUrl}/${API_VERSION}/be/intent/tx/${normalizedHash}`;

    console.log('[sodaxApi] Fetching intent by txHash:', { txHash: normalizedHash });

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new AmpedDefiError(
          ErrorCode.UNKNOWN_ERROR,
          `SODAX API error: ${response.status} ${errorText}`
        );
      }

      return await response.json() as UserIntent;
    } catch (error) {
      if (error instanceof AmpedDefiError) throw error;
      throw new AmpedDefiError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to fetch intent by txHash: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getUserIntents(
    userAddress: string,
    pagination: PaginationParams = {},
    filters?: UserIntentFilters
  ): Promise<PaginatedResponse<UserIntent>> {
    if (!this.isValidAddress(userAddress)) {
      throw new AmpedDefiError(
        ErrorCode.WALLET_INVALID_ADDRESS,
        `Invalid user address: ${userAddress}`
      );
    }

    const normalizedAddress = userAddress.toLowerCase();
    const queryParams = new URLSearchParams();
    
    if (pagination.offset !== undefined) {
      queryParams.set('offset', pagination.offset.toString());
    }
    if (pagination.limit !== undefined) {
      queryParams.set('limit', pagination.limit.toString());
    }

    if (filters) {
      if (filters.open !== undefined) queryParams.set('open', filters.open.toString());
      if (filters.srcChain !== undefined) queryParams.set('srcChain', filters.srcChain.toString());
      if (filters.dstChain !== undefined) queryParams.set('dstChain', filters.dstChain.toString());
      if (filters.inputToken) queryParams.set('inputToken', filters.inputToken.toLowerCase());
      if (filters.outputToken) queryParams.set('outputToken', filters.outputToken.toLowerCase());
    }

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/${API_VERSION}/be/intent/user/${normalizedAddress}${queryString ? `?${queryString}` : ''}`;

    console.log('[sodaxApi] Fetching user intents:', { userAddress: normalizedAddress });

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AmpedDefiError(
          ErrorCode.UNKNOWN_ERROR,
          `SODAX API error: ${response.status} ${errorText}`
        );
      }

      return await response.json() as PaginatedResponse<UserIntent>;
    } catch (error) {
      if (error instanceof AmpedDefiError) throw error;
      throw new AmpedDefiError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to fetch user intents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getOpenIntents(
    userAddress: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<UserIntent>> {
    return this.getUserIntents(userAddress, pagination, { open: true });
  }

  async getIntentHistory(
    userAddress: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<UserIntent>> {
    return this.getUserIntents(userAddress, pagination, { open: false });
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
      return await fetch(url, { signal: controller.signal, headers });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

let apiClient: SodaxApiClient | null = null;

export function getSodaxApiClient(config?: SodaxApiConfig): SodaxApiClient {
  if (!apiClient) {
    apiClient = new SodaxApiClient(config);
  }
  return apiClient;
}

export function resetSodaxApiClient(): void {
  apiClient = null;
}
