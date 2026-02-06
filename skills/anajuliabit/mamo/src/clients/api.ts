import type { Address } from 'viem';

import { API_ACCOUNT, API_INDEXER } from '../config/constants.js';
import type { AccountData,ApyResponse } from '../types/index.js';
import { ApiError } from '../utils/errors.js';

/**
 * Mamo API client for interacting with the Mamo backend services
 */
export class MamoApiClient {
  private readonly accountApiUrl: string;
  private readonly indexerApiUrl: string;

  constructor(
    accountApiUrl: string = API_ACCOUNT,
    indexerApiUrl: string = API_INDEXER
  ) {
    this.accountApiUrl = accountApiUrl;
    this.indexerApiUrl = indexerApiUrl;
  }

  /**
   * Onboard an account with SIWE authentication
   */
  async onboardAccount(
    message: string,
    signature: string,
    account: Address
  ): Promise<unknown> {
    const endpoint = '/onboard-account';

    try {
      const response = await fetch(`${this.accountApiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          account,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new ApiError(
          endpoint,
          text || `Status ${response.status}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        endpoint,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get account data from the indexer
   */
  async getAccountData(address: Address): Promise<AccountData | null> {
    const endpoint = `/account/${address}`;

    try {
      const response = await fetch(`${this.indexerApiUrl}${endpoint}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        const text = await response.text();
        throw new ApiError(
          endpoint,
          text || `Status ${response.status}`,
          response.status
        );
      }

      return response.json() as Promise<AccountData>;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Return null on network errors - API may not be available
      return null;
    }
  }

  /**
   * Get APY data for a strategy type
   */
  async getApy(strategyType: string): Promise<ApyResponse | null> {
    const endpoint = `/apy/${strategyType}`;

    try {
      const response = await fetch(`${this.indexerApiUrl}${endpoint}`);

      if (!response.ok) {
        const text = await response.text();
        throw new ApiError(
          endpoint,
          text || `Status ${response.status}`,
          response.status
        );
      }

      return response.json() as Promise<ApyResponse>;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        endpoint,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Check if the API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.indexerApiUrl, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Default singleton instance
let defaultClient: MamoApiClient | null = null;

/**
 * Get the default API client instance
 */
export function getApiClient(): MamoApiClient {
  if (!defaultClient) {
    defaultClient = new MamoApiClient();
  }
  return defaultClient;
}

/**
 * Set a custom API client (useful for testing)
 */
export function setApiClient(client: MamoApiClient): void {
  defaultClient = client;
}

/**
 * Fetch APY for a strategy type
 */
export async function fetchApy(strategyType: string): Promise<ApyResponse | null> {
  return getApiClient().getApy(strategyType);
}

/**
 * Fetch account data
 */
export async function fetchAccountData(address: Address): Promise<AccountData | null> {
  return getApiClient().getAccountData(address);
}
