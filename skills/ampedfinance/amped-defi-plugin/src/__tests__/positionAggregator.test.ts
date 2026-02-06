/**
 * Position Aggregator Tests
 */

import {
  CrossChainPositionView,
  formatHealthFactor,
  getHealthFactorStatus,
  getPositionRecommendation,
  TokenPosition,
} from '../utils/positionAggregator';

// Mock dependencies
jest.mock('../sodax/client');
jest.mock('../providers/spokeProviderFactory');
jest.mock('../wallet/walletRegistry');

describe('Position Aggregator Utilities', () => {
  describe('formatHealthFactor', () => {
    it('should format finite health factors', () => {
      expect(formatHealthFactor(1.5)).toBe('1.50');
      expect(formatHealthFactor(2.345)).toBe('2.35');
      expect(formatHealthFactor(0.95)).toBe('0.95');
    });

    it('should format infinity', () => {
      expect(formatHealthFactor(Infinity)).toBe('∞');
    });

    it('should handle null', () => {
      expect(formatHealthFactor(null)).toBe('N/A');
    });
  });

  describe('getHealthFactorStatus', () => {
    it('should return critical for HF < 1.1', () => {
      expect(getHealthFactorStatus(1.0)).toEqual({ status: 'critical', color: 'red' });
      expect(getHealthFactorStatus(1.05)).toEqual({ status: 'critical', color: 'red' });
    });

    it('should return danger for HF 1.1-1.5', () => {
      expect(getHealthFactorStatus(1.2)).toEqual({ status: 'danger', color: 'orange' });
      expect(getHealthFactorStatus(1.49)).toEqual({ status: 'danger', color: 'orange' });
    });

    it('should return caution for HF 1.5-2', () => {
      expect(getHealthFactorStatus(1.6)).toEqual({ status: 'caution', color: 'yellow' });
      expect(getHealthFactorStatus(1.9)).toEqual({ status: 'caution', color: 'yellow' });
    });

    it('should return healthy for HF >= 2', () => {
      expect(getHealthFactorStatus(2.0)).toEqual({ status: 'healthy', color: 'green' });
      expect(getHealthFactorStatus(5.0)).toEqual({ status: 'healthy', color: 'green' });
      expect(getHealthFactorStatus(Infinity)).toEqual({ status: 'healthy', color: 'green' });
    });

    it('should return healthy for null', () => {
      expect(getHealthFactorStatus(null)).toEqual({ status: 'healthy', color: 'green' });
    });
  });

  describe('getPositionRecommendation', () => {
    it('should warn about low health factor', () => {
      const view = createMockView({
        healthFactor: 1.3,
        availableBorrowUsd: 0,
        utilizationRate: 60,
        netApy: 0.02,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.some(r => r.includes('Health factor is low'))).toBe(true);
    });

    it('should suggest available borrowing power', () => {
      const view = createMockView({
        healthFactor: 2.5,
        availableBorrowUsd: 5000,
        utilizationRate: 40,
        netApy: 0.02,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.some(r => r.includes('borrowing power'))).toBe(true);
    });

    it('should warn about high utilization', () => {
      const view = createMockView({
        healthFactor: 1.8,
        availableBorrowUsd: 100,
        utilizationRate: 85,
        netApy: 0.02,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.some(r => r.includes('High collateral utilization'))).toBe(true);
    });

    it('should warn about negative net APY', () => {
      const view = createMockView({
        healthFactor: 2.0,
        availableBorrowUsd: 100,
        utilizationRate: 50,
        netApy: -0.01,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.some(r => r.includes('borrowing costs exceed'))).toBe(true);
    });

    it('should mention cross-chain positions', () => {
      const view = createMockView({
        healthFactor: 2.0,
        availableBorrowUsd: 100,
        utilizationRate: 50,
        netApy: 0.02,
        chainCount: 3,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.some(r => r.includes('chains'))).toBe(true);
    });

    it('should return empty array for healthy position', () => {
      const view = createMockView({
        healthFactor: 2.5,
        availableBorrowUsd: 100,
        utilizationRate: 50,
        netApy: 0.05,
        chainCount: 1,
      });

      const recommendations = getPositionRecommendation(view);
      expect(recommendations.length).toBe(0);
    });
  });
});

// Helper function to create mock views
function createMockView(params: {
  healthFactor: number;
  availableBorrowUsd: number;
  utilizationRate: number;
  netApy: number;
  chainCount?: number;
}): CrossChainPositionView {
  const chainSummaries = Array(params.chainCount || 1).fill(null).map((_, i) => ({
    chainId: `chain${i}`,
    supplyUsd: 10000,
    borrowUsd: 5000,
    netWorthUsd: 5000,
    healthFactor: params.healthFactor,
    positionCount: 2,
  }));

  return {
    walletId: 'test',
    address: '0x123',
    timestamp: new Date().toISOString(),
    summary: {
      totalSupplyUsd: chainSummaries.reduce((s, c) => s + c.supplyUsd, 0),
      totalBorrowUsd: chainSummaries.reduce((s, c) => s + c.borrowUsd, 0),
      netWorthUsd: chainSummaries.reduce((s, c) => s + c.netWorthUsd, 0),
      availableBorrowUsd: params.availableBorrowUsd,
      healthFactor: params.healthFactor,
      liquidationRisk: params.healthFactor < 1.5 ? 'medium' : 'none',
      weightedSupplyApy: 0.05,
      weightedBorrowApy: 0.03,
      netApy: params.netApy,
    },
    chainSummaries,
    positions: [],
    collateralUtilization: {
      totalCollateralUsd: 10000,
      usedCollateralUsd: params.utilizationRate * 100,
      availableCollateralUsd: 10000 - params.utilizationRate * 100,
      utilizationRate: params.utilizationRate,
    },
    riskMetrics: {
      maxLtv: 0.8,
      currentLtv: 0.5,
      bufferUntilLiquidation: 30,
      safeMaxBorrowUsd: 8000,
    },
  };
}

describe('Position Calculations', () => {
  const mockPositions: TokenPosition[] = [
    {
      chainId: 'ethereum',
      token: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      supply: {
        balance: '10000',
        balanceUsd: '10000',
        balanceRaw: '10000000000',
        apy: 0.05,
        isCollateral: true,
      },
      borrow: {
        balance: '0',
        balanceUsd: '0',
        balanceRaw: '0',
        apy: 0,
      },
      loanToValue: 0.8,
      liquidationThreshold: 0.85,
    },
    {
      chainId: 'ethereum',
      token: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
      },
      supply: {
        balance: '0',
        balanceUsd: '0',
        balanceRaw: '0',
        apy: 0,
        isCollateral: false,
      },
      borrow: {
        balance: '2',
        balanceUsd: '5000',
        balanceRaw: '2000000000000000000',
        apy: 0.03,
      },
      loanToValue: 0.75,
      liquidationThreshold: 0.8,
    },
  ];

  it('should calculate total supply correctly', () => {
    const totalSupply = mockPositions.reduce(
      (sum, p) => sum + parseFloat(p.supply.balanceUsd || '0'),
      0
    );
    expect(totalSupply).toBe(10000);
  });

  it('should calculate total borrow correctly', () => {
    const totalBorrow = mockPositions.reduce(
      (sum, p) => sum + parseFloat(p.borrow.balanceUsd || '0'),
      0
    );
    expect(totalBorrow).toBe(5000);
  });

  it('should identify collateral assets', () => {
    const collateralPositions = mockPositions.filter(p => p.supply.isCollateral);
    expect(collateralPositions).toHaveLength(1);
    expect(collateralPositions[0].token.symbol).toBe('USDC');
  });

  it('should calculate weighted APY correctly', () => {
    const totalSupply = 10000;
    const weightedSupplyApy = mockPositions.reduce(
      (sum, p) => sum + parseFloat(p.supply.balanceUsd || '0') * p.supply.apy,
      0
    ) / totalSupply;
    
    expect(weightedSupplyApy).toBe(0.05);
  });
});
