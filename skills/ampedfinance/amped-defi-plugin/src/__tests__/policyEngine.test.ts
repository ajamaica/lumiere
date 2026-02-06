/**
 * Policy Engine Tests
 */

import { PolicyCheckResult,PolicyEngine } from '../policy/policyEngine';

// Mock environment variables
const originalEnv = process.env;

describe('PolicyEngine', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AMPED_OC_LIMITS_JSON;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration Loading', () => {
    it('should load empty config when env not set', () => {
      const engine = new PolicyEngine();
      const config = engine.getConfig();
      expect(config).toEqual({});
    });

    it('should load default policy config', () => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: {
          maxSlippageBps: 100,
          allowedChains: ['ethereum', 'arbitrum'],
        },
      });

      const engine = new PolicyEngine();
      const config = engine.getConfig();
      expect(config.maxSlippageBps).toBe(100);
      expect(config.allowedChains).toEqual(['ethereum', 'arbitrum']);
    });

    it('should load specific policy by ID', () => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: { maxSlippageBps: 100 },
        aggressive: { maxSlippageBps: 300 },
        conservative: { maxSlippageBps: 50 },
      });

      const engine = new PolicyEngine('aggressive');
      const config = engine.getConfig();
      expect(config.maxSlippageBps).toBe(300);
    });

    it('should fallback to default when policy ID not found', () => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: { maxSlippageBps: 100 },
      });

      const engine = new PolicyEngine('nonexistent');
      const config = engine.getConfig();
      expect(config.maxSlippageBps).toBe(100);
    });

    it('should handle invalid JSON gracefully', () => {
      process.env.AMPED_OC_LIMITS_JSON = 'invalid json';

      const engine = new PolicyEngine();
      const config = engine.getConfig();
      expect(config).toEqual({});
    });
  });

  describe('Bridge Policy Checks', () => {
    beforeEach(() => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: {
          allowedChains: ['ethereum', 'arbitrum', 'sonic'],
          allowedTokensByChain: {
            ethereum: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
          },
          maxBridgeAmountToken: {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 10000,
          },
          blockedRecipients: ['0x0000000000000000000000000000000000000000'],
        },
      });
    });

    it('should allow valid bridge operation', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000',
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject disallowed source chain', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'polygon',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Chain not allowed');
    });

    it('should reject disallowed destination chain', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'polygon',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        amount: '1000',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Chain not allowed');
    });

    it('should reject disallowed token', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xInvalidToken',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Token not allowed');
    });

    it('should reject amount exceeding limit', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '15000',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
      expect(result.details).toEqual({ maxAllowed: 10000, requested: 15000 });
    });

    it('should reject blocked recipient', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkBridge({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000',
        recipient: '0x0000000000000000000000000000000000000000',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Recipient is blocked');
    });
  });

  describe('Swap Policy Checks', () => {
    beforeEach(() => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: {
          allowedChains: ['ethereum', 'arbitrum'],
          maxSlippageBps: 100,
          maxSwapInputToken: {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 50000,
          },
        },
      });
    });

    it('should allow valid swap', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkSwap({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        inputAmount: '1000',
        slippageBps: 50,
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject excessive slippage', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkSwap({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        inputAmount: '1000',
        slippageBps: 150,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Slippage');
      expect(result.details).toEqual({ maxAllowed: 100, requested: 150 });
    });

    it('should reject swap exceeding token limit', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkSwap({
        walletId: 'test',
        srcChainId: 'ethereum',
        dstChainId: 'arbitrum',
        srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dstToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        inputAmount: '60000',
        slippageBps: 50,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });
  });

  describe('Money Market Policy Checks', () => {
    beforeEach(() => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: {
          allowedChains: ['ethereum', 'sonic'],
          allowedTokensByChain: {
            ethereum: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
            sonic: ['0x29219dd400f2bf60e5a23d13be72b486d4038894'],
          },
          maxBorrowUsd: 50000,
          maxBorrowToken: {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 30000,
          },
        },
      });
    });

    it('should allow valid supply', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkMoneyMarket({
        walletId: 'test',
        chainId: 'ethereum',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000',
        operation: 'supply',
      });

      expect(result.allowed).toBe(true);
    });

    it('should allow valid borrow within limits', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkMoneyMarket({
        walletId: 'test',
        chainId: 'ethereum',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '20000',
        amountUsd: 20000,
        operation: 'borrow',
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject borrow exceeding USD limit', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkMoneyMarket({
        walletId: 'test',
        chainId: 'ethereum',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Use allowed token
        amount: '60000',
        amountUsd: 60000,
        operation: 'borrow',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should reject borrow exceeding token limit', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkMoneyMarket({
        walletId: 'test',
        chainId: 'ethereum',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '35000',
        amountUsd: 35000,
        operation: 'borrow',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should check cross-chain destination', async () => {
      const engine = new PolicyEngine();
      const result = await engine.checkMoneyMarket({
        walletId: 'test',
        chainId: 'ethereum',
        dstChainId: 'polygon',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000',
        operation: 'supply',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Chain not allowed');
    });
  });

  describe('getAvailablePolicies', () => {
    it('should return empty array when no config', () => {
      const engine = new PolicyEngine();
      expect(engine.getAvailablePolicies()).toEqual([]);
    });

    it('should return policy IDs', () => {
      process.env.AMPED_OC_LIMITS_JSON = JSON.stringify({
        default: {},
        aggressive: {},
        conservative: {},
      });

      const engine = new PolicyEngine();
      const policies = engine.getAvailablePolicies();
      expect(policies).toContain('default');
      expect(policies).toContain('aggressive');
      expect(policies).toContain('conservative');
      expect(policies).toHaveLength(3);
    });
  });
});
