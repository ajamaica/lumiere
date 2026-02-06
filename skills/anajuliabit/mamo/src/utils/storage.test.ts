import { existsSync, mkdirSync, readFileSync, rmSync,writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Address, Hash } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the homedir to use a temp directory
const testDir = join(tmpdir(), `mamo-test-${Date.now()}`);

vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: () => testDir,
  };
});

// Now import the storage module after the mock
const storage = await import('./storage.js');

describe('Storage utilities', () => {
  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getConfigDir', () => {
    it('should create config directory if it does not exist', () => {
      const configDir = storage.getConfigDir();
      expect(existsSync(configDir)).toBe(true);
      expect(configDir).toContain('.config/mamo');
    });
  });

  describe('Local strategies storage', () => {
    const testWallet = '0x1234567890123456789012345678901234567890' as Address;
    const testStrategy = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;
    const testTxHash = '0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeefffff' as Hash;

    it('should save and load local strategies', () => {
      storage.addLocalStrategy(testWallet, 'usdc_stablecoin', testStrategy, testTxHash);

      const strategies = storage.getLocalStrategiesForWallet(testWallet);
      expect(strategies).toHaveProperty('usdc_stablecoin');
      expect(strategies.usdc_stablecoin?.address).toBe(testStrategy);
      expect(strategies.usdc_stablecoin?.txHash).toBe(testTxHash);
    });

    it('should get specific local strategy', () => {
      storage.addLocalStrategy(testWallet, 'cbbtc_lending', testStrategy, testTxHash);

      const strategy = storage.getLocalStrategy(testWallet, 'cbbtc_lending');
      expect(strategy).not.toBeNull();
      expect(strategy?.address).toBe(testStrategy);
    });

    it('should return null for non-existent strategy', () => {
      const strategy = storage.getLocalStrategy(testWallet, 'non_existent');
      expect(strategy).toBeNull();
    });

    it('should check if strategy exists', () => {
      storage.addLocalStrategy(testWallet, 'eth_lending', testStrategy, testTxHash);

      expect(storage.hasLocalStrategy(testWallet, 'eth_lending')).toBe(true);
      expect(storage.hasLocalStrategy(testWallet, 'mamo_staking')).toBe(false);
    });

    it('should get all strategy addresses', () => {
      const strategy1 = '0x1111111111111111111111111111111111111111' as Address;
      const strategy2 = '0x2222222222222222222222222222222222222222' as Address;

      storage.addLocalStrategy(testWallet, 'usdc_stablecoin', strategy1, testTxHash);
      storage.addLocalStrategy(testWallet, 'cbbtc_lending', strategy2, testTxHash);

      const addresses = storage.getLocalStrategyAddresses(testWallet);
      expect(addresses).toContain(strategy1);
      expect(addresses).toContain(strategy2);
      expect(addresses.length).toBe(2);
    });

    it('should remove a strategy', () => {
      storage.addLocalStrategy(testWallet, 'usdc_stablecoin', testStrategy, testTxHash);
      expect(storage.hasLocalStrategy(testWallet, 'usdc_stablecoin')).toBe(true);

      const removed = storage.removeLocalStrategy(testWallet, 'usdc_stablecoin');
      expect(removed).toBe(true);
      expect(storage.hasLocalStrategy(testWallet, 'usdc_stablecoin')).toBe(false);
    });

    it('should return false when removing non-existent strategy', () => {
      const removed = storage.removeLocalStrategy(testWallet, 'non_existent');
      expect(removed).toBe(false);
    });

    it('should clear all strategies for a wallet', () => {
      storage.addLocalStrategy(testWallet, 'usdc_stablecoin', testStrategy, testTxHash);
      storage.addLocalStrategy(testWallet, 'cbbtc_lending', testStrategy, testTxHash);

      storage.clearLocalStrategies(testWallet);

      const addresses = storage.getLocalStrategyAddresses(testWallet);
      expect(addresses.length).toBe(0);
    });

    it('should handle lowercase wallet addresses', () => {
      const upperWallet = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address;
      const lowerWallet = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;

      storage.addLocalStrategy(upperWallet, 'usdc_stablecoin', testStrategy, testTxHash);

      // Should find with lowercase
      const strategy = storage.getLocalStrategy(lowerWallet, 'usdc_stablecoin');
      expect(strategy).not.toBeNull();
    });
  });
});
