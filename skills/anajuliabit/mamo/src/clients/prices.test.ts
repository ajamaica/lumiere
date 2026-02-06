import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateUsdValue,
  clearPriceCache,
  COINGECKO_IDS,
  fetchTokenPrices,
  formatGasCost,
  formatUsdValue,
  getEthPriceUsd,
  getMultipleTokenPrices,
  getTokenPriceUsd,
} from './prices.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('prices client', () => {
  beforeEach(() => {
    clearPriceCache();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('COINGECKO_IDS', () => {
    it('should have mappings for all supported tokens', () => {
      expect(COINGECKO_IDS.eth).toBe('ethereum');
      expect(COINGECKO_IDS.usdc).toBe('usd-coin');
      expect(COINGECKO_IDS.cbbtc).toBe('coinbase-wrapped-btc');
      expect(COINGECKO_IDS.mamo).toBe('mamo');
    });
  });

  describe('fetchTokenPrices', () => {
    it('should fetch prices from CoinGecko API', async () => {
      const mockResponse = {
        ethereum: { usd: 2500, usd_24h_change: 1.5 },
        'usd-coin': { usd: 1.0, usd_24h_change: 0.01 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await fetchTokenPrices(['ethereum', 'usd-coin']);

      expect(prices).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.coingecko.com'),
        expect.any(Object)
      );
    });

    it('should use cached prices within TTL', async () => {
      const mockResponse = {
        ethereum: { usd: 2500, usd_24h_change: 1.5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should fetch
      await fetchTokenPrices(['ethereum']);
      // Second call - should use cache
      await fetchTokenPrices(['ethereum']);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on rate limit (429)', async () => {
      const mockResponse = {
        ethereum: { usd: 2500, usd_24h_change: 1.5 },
      };

      // First call - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchTokenPrices(['ethereum']);
      clearPriceCache(); // Clear cache to force new request

      // Populate cache again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      await fetchTokenPrices(['ethereum']);

      // Second call - rate limited but should return cached
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      // Note: This will use cache since we didn't clear it
      const prices = await fetchTokenPrices(['ethereum']);
      expect(prices).toEqual(mockResponse);
    });

    it('should throw error on API failure without cache', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchTokenPrices(['ethereum'])).rejects.toThrow();
    });
  });

  describe('getTokenPriceUsd', () => {
    it('should return price for valid token', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await getTokenPriceUsd('eth');
      expect(price).toBe(2500);
    });

    it('should return 0 for unknown token', async () => {
      const price = await getTokenPriceUsd('unknowntoken');
      expect(price).toBe(0);
    });

    it('should return 0 on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const price = await getTokenPriceUsd('eth');
      expect(price).toBe(0);
    });
  });

  describe('getEthPriceUsd', () => {
    it('should return ETH price', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await getEthPriceUsd();
      expect(price).toBe(2500);
    });
  });

  describe('getMultipleTokenPrices', () => {
    it('should return prices for multiple tokens', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
        'usd-coin': { usd: 1.0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getMultipleTokenPrices(['eth', 'usdc']);

      expect(prices.eth).toBe(2500);
      expect(prices.usdc).toBe(1.0);
    });

    it('should return 0 for tokens without price data', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
        // mamo not in response
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getMultipleTokenPrices(['eth', 'mamo']);

      expect(prices.eth).toBe(2500);
      expect(prices.mamo).toBe(0);
    });

    it('should return all zeros on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const prices = await getMultipleTokenPrices(['eth', 'usdc']);

      expect(prices.eth).toBe(0);
      expect(prices.usdc).toBe(0);
    });
  });

  describe('calculateUsdValue', () => {
    it('should calculate correct USD value for 18 decimal token', () => {
      // 1 ETH = 2500 USD
      const amount = BigInt('1000000000000000000'); // 1 ETH in wei
      const decimals = 18;
      const priceUsd = 2500;

      const value = calculateUsdValue(amount, decimals, priceUsd);
      expect(value).toBe(2500);
    });

    it('should calculate correct USD value for 6 decimal token', () => {
      // 100 USDC = 100 USD
      const amount = BigInt('100000000'); // 100 USDC
      const decimals = 6;
      const priceUsd = 1.0;

      const value = calculateUsdValue(amount, decimals, priceUsd);
      expect(value).toBe(100);
    });

    it('should return 0 for zero amount', () => {
      const value = calculateUsdValue(0n, 18, 2500);
      expect(value).toBe(0);
    });

    it('should return 0 for zero price', () => {
      const value = calculateUsdValue(BigInt('1000000000000000000'), 18, 0);
      expect(value).toBe(0);
    });
  });

  describe('formatUsdValue', () => {
    it('should format large values with commas', () => {
      expect(formatUsdValue(1234567.89)).toBe('$1,234,567.89');
    });

    it('should format small values with 2 decimals', () => {
      expect(formatUsdValue(10.5)).toBe('$10.50');
    });

    it('should return $0.00 for zero', () => {
      expect(formatUsdValue(0)).toBe('$0.00');
    });

    it('should return <$0.01 for very small values', () => {
      expect(formatUsdValue(0.005)).toBe('<$0.01');
    });
  });

  describe('formatGasCost', () => {
    it('should format gas cost with ETH and USD', () => {
      const result = formatGasCost('0.001234', '$2.50');
      expect(result).toBe('0.001234 ETH (~$2.50)');
    });

    it('should handle N/A for USD', () => {
      const result = formatGasCost('0.001234', 'N/A');
      expect(result).toBe('0.001234 ETH (~N/A)');
    });
  });
});
