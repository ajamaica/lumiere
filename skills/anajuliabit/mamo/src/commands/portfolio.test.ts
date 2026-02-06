import type { Address } from 'viem';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the blockchain client
vi.mock('../clients/blockchain.js', () => ({
  getClients: vi.fn(),
  getAllStrategies: vi.fn(),
  getWalletBalances: vi.fn(),
  getStrategyDetails: vi.fn(),
}));

// Mock the prices client
vi.mock('../clients/prices.js', () => ({
  getMultipleTokenPrices: vi.fn(),
  calculateUsdValue: vi.fn(),
  formatUsdValue: vi.fn(),
}));

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  header: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  divider: vi.fn(),
  Colors: {
    reset: '',
    bold: '',
    dim: '',
    green: '',
    yellow: '',
    cyan: '',
  },
  isJsonMode: vi.fn(() => true),
  json: vi.fn(),
}));

import {
  getAllStrategies,
  getClients,
  getStrategyDetails,
  getWalletBalances,
} from '../clients/blockchain.js';
import {
  calculateUsdValue,
  formatUsdValue,
  getMultipleTokenPrices,
} from '../clients/prices.js';
import { getPortfolio } from './portfolio.js';

describe('portfolio command', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockPublicClient = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (getClients as ReturnType<typeof vi.fn>).mockReturnValue({
      publicClient: mockPublicClient,
      account: { address: mockAddress },
    });

    (getWalletBalances as ReturnType<typeof vi.fn>).mockResolvedValue({
      eth: BigInt('1000000000000000000'), // 1 ETH
      tokens: {
        usdc: BigInt('100000000'), // 100 USDC
        cbbtc: BigInt('10000000'), // 0.1 cbBTC
        mamo: BigInt('1000000000000000000'), // 1 MAMO
        eth: BigInt('1000000000000000000'),
      },
    });

    (getAllStrategies as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (getMultipleTokenPrices as ReturnType<typeof vi.fn>).mockResolvedValue({
      eth: 2500,
      usdc: 1,
      cbbtc: 60000,
      mamo: 0, // No price available
    });

    (calculateUsdValue as ReturnType<typeof vi.fn>).mockImplementation(
      (amount: bigint, decimals: number, price: number) => {
        if (amount === 0n || price === 0) return 0;
        return Number(amount) / Math.pow(10, decimals) * price;
      }
    );

    (formatUsdValue as ReturnType<typeof vi.fn>).mockImplementation(
      (value: number) => `$${value.toFixed(2)}`
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPortfolio', () => {
    it('should return portfolio with wallet holdings', async () => {
      const result = await getPortfolio({});

      expect(result.success).toBe(true);
      expect(result.wallet.address).toBe(mockAddress);
      expect(result.wallet.holdings).toHaveLength(4); // ETH, USDC, cbBTC, MAMO
    });

    it('should calculate total wallet value in USD', async () => {
      const result = await getPortfolio({});

      // Should have a non-zero total
      expect(result.wallet.totalValueUsd).toBeGreaterThan(0);
    });

    it('should handle strategies with holdings', async () => {
      const strategyAddress = '0x9876543210987654321098765432109876543210' as Address;

      (getAllStrategies as ReturnType<typeof vi.fn>).mockResolvedValue([strategyAddress]);

      (getStrategyDetails as ReturnType<typeof vi.fn>).mockResolvedValue({
        address: strategyAddress,
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        typeId: 1n,
        balance: BigInt('50000000'), // 50 USDC
      });

      const result = await getPortfolio({});

      expect(result.strategies.holdings).toHaveLength(1);
      expect(result.strategies.holdings[0].tokenSymbol).toBe('USDC');
    });

    it('should calculate combined total value', async () => {
      const result = await getPortfolio({});

      // Combined should equal wallet + strategies
      expect(result.combined.totalValueUsd).toBe(
        result.wallet.totalValueUsd + result.strategies.totalValueUsd
      );
    });

    it('should indicate when prices are available', async () => {
      const result = await getPortfolio({});

      expect(result.pricesAvailable).toBe(true);
    });

    it('should indicate when prices are not available', async () => {
      (getMultipleTokenPrices as ReturnType<typeof vi.fn>).mockResolvedValue({
        eth: 0,
        usdc: 0,
        cbbtc: 0,
        mamo: 0,
      });

      const result = await getPortfolio({});

      expect(result.pricesAvailable).toBe(false);
    });

    it('should handle empty strategies list', async () => {
      (getAllStrategies as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getPortfolio({});

      expect(result.strategies.holdings).toHaveLength(0);
      expect(result.strategies.totalValueUsd).toBe(0);
    });

    it('should handle strategy details fetch failure gracefully', async () => {
      const strategyAddress = '0x9876543210987654321098765432109876543210' as Address;

      (getAllStrategies as ReturnType<typeof vi.fn>).mockResolvedValue([strategyAddress]);
      (getStrategyDetails as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getPortfolio({});

      // Should not crash and should have empty strategy holdings
      expect(result.success).toBe(true);
      expect(result.strategies.holdings).toHaveLength(0);
    });
  });
});
