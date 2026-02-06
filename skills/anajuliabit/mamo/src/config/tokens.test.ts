import { describe, expect,it } from 'vitest';

import { ErrorCode,MamoError } from '../utils/errors.js';
import { getAvailableTokens, isValidTokenKey,resolveToken, TOKENS } from './tokens.js';

describe('TOKENS', () => {
  it('should have all expected tokens', () => {
    expect(TOKENS).toHaveProperty('usdc');
    expect(TOKENS).toHaveProperty('cbbtc');
    expect(TOKENS).toHaveProperty('mamo');
    expect(TOKENS).toHaveProperty('eth');
  });

  it('should have valid token configurations', () => {
    expect(TOKENS.usdc.symbol).toBe('USDC');
    expect(TOKENS.usdc.decimals).toBe(6);
    expect(TOKENS.usdc.address).toBeDefined();

    expect(TOKENS.cbbtc.symbol).toBe('cbBTC');
    expect(TOKENS.cbbtc.decimals).toBe(8);

    expect(TOKENS.mamo.symbol).toBe('MAMO');
    expect(TOKENS.mamo.decimals).toBe(18);

    expect(TOKENS.eth.symbol).toBe('ETH');
    expect(TOKENS.eth.decimals).toBe(18);
    expect(TOKENS.eth.address).toBeNull();
  });
});

describe('getAvailableTokens', () => {
  it('should return all token symbols', () => {
    const tokens = getAvailableTokens();
    expect(tokens).toContain('USDC');
    expect(tokens).toContain('cbBTC');
    expect(tokens).toContain('MAMO');
    expect(tokens).toContain('ETH');
  });
});

describe('resolveToken', () => {
  it('should resolve by key', () => {
    const token = resolveToken('usdc');
    expect(token.key).toBe('usdc');
    expect(token.symbol).toBe('USDC');
    expect(token.decimals).toBe(6);
  });

  it('should resolve by symbol (case-insensitive)', () => {
    const token = resolveToken('USDC');
    expect(token.key).toBe('usdc');
  });

  it('should resolve mixed case', () => {
    const token = resolveToken('Usdc');
    expect(token.key).toBe('usdc');
  });

  it('should throw for unknown token', () => {
    expect(() => resolveToken('unknown')).toThrow(MamoError);
  });

  it('should throw with UNKNOWN_TOKEN code', () => {
    try {
      resolveToken('unknown');
    } catch (e) {
      expect(e).toBeInstanceOf(MamoError);
      expect((e as MamoError).code).toBe(ErrorCode.UNKNOWN_TOKEN);
    }
  });
});

describe('isValidTokenKey', () => {
  it('should return true for valid keys', () => {
    expect(isValidTokenKey('usdc')).toBe(true);
    expect(isValidTokenKey('cbbtc')).toBe(true);
    expect(isValidTokenKey('mamo')).toBe(true);
    expect(isValidTokenKey('eth')).toBe(true);
  });

  it('should return false for invalid keys', () => {
    expect(isValidTokenKey('unknown')).toBe(false);
    expect(isValidTokenKey('USDC')).toBe(false);
    expect(isValidTokenKey('')).toBe(false);
  });
});
