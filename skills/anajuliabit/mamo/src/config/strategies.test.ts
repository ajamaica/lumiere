import { describe, expect,it } from 'vitest';

import { ErrorCode,MamoError } from '../utils/errors.js';
import {
  getAvailableStrategies,
  getStrategiesForDisplay,
  getStrategy,
  isValidStrategyKey,
  STRATEGIES,
} from './strategies.js';

describe('STRATEGIES', () => {
  it('should have all expected strategies', () => {
    expect(STRATEGIES).toHaveProperty('usdc_stablecoin');
    expect(STRATEGIES).toHaveProperty('cbbtc_lending');
    expect(STRATEGIES).toHaveProperty('mamo_staking');
    expect(STRATEGIES).toHaveProperty('eth_lending');
  });

  it('should have valid strategy configurations', () => {
    expect(STRATEGIES.usdc_stablecoin.token).toBe('usdc');
    expect(STRATEGIES.usdc_stablecoin.label).toBe('USDC Stablecoin');
    expect(STRATEGIES.usdc_stablecoin.factory).toBeDefined();

    expect(STRATEGIES.cbbtc_lending.token).toBe('cbbtc');
    expect(STRATEGIES.cbbtc_lending.factory).toBeDefined();

    // mamo_staking has no factory yet
    expect(STRATEGIES.mamo_staking.token).toBe('mamo');
    expect(STRATEGIES.mamo_staking.factory).toBeNull();

    expect(STRATEGIES.eth_lending.token).toBe('eth');
    expect(STRATEGIES.eth_lending.factory).toBeDefined();
  });
});

describe('getAvailableStrategies', () => {
  it('should return all strategy keys', () => {
    const strategies = getAvailableStrategies();
    expect(strategies).toContain('usdc_stablecoin');
    expect(strategies).toContain('cbbtc_lending');
    expect(strategies).toContain('mamo_staking');
    expect(strategies).toContain('eth_lending');
  });
});

describe('getStrategy', () => {
  it('should return strategy config for valid key', () => {
    const strategy = getStrategy('usdc_stablecoin');
    expect(strategy.token).toBe('usdc');
    expect(strategy.label).toBe('USDC Stablecoin');
  });

  it('should throw for unknown strategy', () => {
    expect(() => getStrategy('unknown')).toThrow(MamoError);
  });

  it('should throw with UNKNOWN_STRATEGY code', () => {
    try {
      getStrategy('unknown');
    } catch (e) {
      expect(e).toBeInstanceOf(MamoError);
      expect((e as MamoError).code).toBe(ErrorCode.UNKNOWN_STRATEGY);
    }
  });
});

describe('isValidStrategyKey', () => {
  it('should return true for valid keys', () => {
    expect(isValidStrategyKey('usdc_stablecoin')).toBe(true);
    expect(isValidStrategyKey('cbbtc_lending')).toBe(true);
    expect(isValidStrategyKey('mamo_staking')).toBe(true);
    expect(isValidStrategyKey('eth_lending')).toBe(true);
  });

  it('should return false for invalid keys', () => {
    expect(isValidStrategyKey('unknown')).toBe(false);
    expect(isValidStrategyKey('')).toBe(false);
    expect(isValidStrategyKey('USDC_STABLECOIN')).toBe(false);
  });
});

describe('getStrategiesForDisplay', () => {
  it('should return strategies with display info', () => {
    const display = getStrategiesForDisplay();

    expect(display.length).toBeGreaterThan(0);

    const usdc = display.find((d) => d.key === 'usdc_stablecoin');
    expect(usdc).toBeDefined();
    expect(usdc?.label).toBe('USDC Stablecoin');
    expect(usdc?.token).toBe('usdc');
  });
});
