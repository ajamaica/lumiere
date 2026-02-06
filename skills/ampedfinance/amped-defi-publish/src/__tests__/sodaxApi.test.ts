/**
 * SODAX API Client Tests
 */

import { AmpedDefiError, ErrorCode } from '../utils/errors';
import { getSodaxApiClient, resetSodaxApiClient,SodaxApiClient } from '../utils/sodaxApi';

// Mock fetch
global.fetch = jest.fn();

describe('SodaxApiClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetSodaxApiClient();
  });

  describe('Configuration', () => {
    it('should use default base URL', () => {
      const client = new SodaxApiClient();
      expect(client).toBeDefined();
    });

    it('should use custom base URL', () => {
      const client = new SodaxApiClient({ baseUrl: 'https://custom.api.com' });
      expect(client).toBeDefined();
    });

    it('should use environment variable for base URL', () => {
      process.env.SODAX_API_URL = 'https://env.api.com';
      const client = new SodaxApiClient();
      expect(client).toBeDefined();
      delete process.env.SODAX_API_URL;
    });
  });

  describe('Address Validation', () => {
    it('should reject invalid addresses', async () => {
      const client = new SodaxApiClient();
      
      await expect(client.getUserIntents('invalid-address'))
        .rejects
        .toThrow(AmpedDefiError);
    });

    it('should accept valid addresses', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        offset: 0,
        limit: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SodaxApiClient();
      const result = await client.getUserIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825');
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('API Requests', () => {
    it('should fetch user intents with default pagination', async () => {
      const mockResponse = {
        items: [
          {
            intentHash: '0xabc',
            txHash: '0xdef',
            chainId: 146,
            open: true,
            intent: {
              inputToken: '0xinput',
              outputToken: '0xoutput',
              inputAmount: '1000',
            },
            events: [],
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
        offset: 0,
        limit: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SodaxApiClient();
      const result = await client.getUserIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/be/intent/user/0xf48cd107faaa95de81afc2436e0a044196e21825'),
        expect.any(Object)
      );
    });

    it('should apply pagination parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 100, offset: 10, limit: 20 }),
      });

      const client = new SodaxApiClient();
      await client.getUserIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825', {
        offset: 10,
        limit: 20,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=10'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
    });

    it('should apply filters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0, offset: 0, limit: 50 }),
      });

      const client = new SodaxApiClient();
      await client.getUserIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825', {}, {
        open: true,
        srcChain: 1,
        inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('open=true');
      expect(callUrl).toContain('srcChain=1');
      expect(callUrl).toContain('inputToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const client = new SodaxApiClient();
      
      await expect(client.getUserIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825'))
        .rejects
        .toThrow(AmpedDefiError);
    });
  });

  describe('Convenience Methods', () => {
    it('should get open intents', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0, offset: 0, limit: 50 }),
      });

      const client = new SodaxApiClient();
      await client.getOpenIntents('0xf48Cd107FaaA95DE81afC2436e0A044196E21825');

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('open=true');
    });

    it('should get intent history (closed)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0, offset: 0, limit: 50 }),
      });

      const client = new SodaxApiClient();
      await client.getIntentHistory('0xf48Cd107FaaA95DE81afC2436e0A044196E21825');

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('open=false');
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const client1 = getSodaxApiClient();
      const client2 = getSodaxApiClient();
      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getSodaxApiClient();
      resetSodaxApiClient();
      const client2 = getSodaxApiClient();
      expect(client1).not.toBe(client2);
    });
  });
});
