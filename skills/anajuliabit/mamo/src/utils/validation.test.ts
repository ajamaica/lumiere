import { describe, expect,it } from 'vitest';

import { InvalidArgumentError } from './errors.js';
import {
  isWithdrawAll,
  requireNonEmpty,
  validateAddress,
  validateAmount,
  validatePrivateKey,
  validateRpcUrl,
  validateStrategyType,
  validateToken,
} from './validation.js';

describe('validateAddress', () => {
  it('should accept valid Ethereum address', () => {
    const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    expect(validateAddress(address)).toBe(address);
  });

  it('should reject empty string', () => {
    expect(() => validateAddress('')).toThrow(InvalidArgumentError);
  });

  it('should reject invalid address', () => {
    expect(() => validateAddress('0xinvalid')).toThrow(InvalidArgumentError);
  });

  it('should use custom field name in error', () => {
    expect(() => validateAddress('', 'wallet')).toThrow('wallet is required');
  });
});

describe('validateAmount', () => {
  it('should parse valid amount', () => {
    const result = validateAmount('100', 6);
    expect(result).toBe(100000000n);
  });

  it('should handle decimal amounts', () => {
    const result = validateAmount('1.5', 18);
    expect(result).toBe(1500000000000000000n);
  });

  it('should return sentinel for "all"', () => {
    const result = validateAmount('all', 6);
    expect(result).toBe(-1n);
  });

  it('should reject empty amount', () => {
    expect(() => validateAmount('', 6)).toThrow(InvalidArgumentError);
  });

  it('should reject zero amount', () => {
    expect(() => validateAmount('0', 6)).toThrow('must be greater than 0');
  });

  it('should reject negative amount', () => {
    expect(() => validateAmount('-10', 6)).toThrow(InvalidArgumentError);
  });
});

describe('isWithdrawAll', () => {
  it('should return true for "all"', () => {
    expect(isWithdrawAll('all')).toBe(true);
  });

  it('should return true for "ALL"', () => {
    expect(isWithdrawAll('ALL')).toBe(true);
  });

  it('should return false for numeric string', () => {
    expect(isWithdrawAll('100')).toBe(false);
  });
});

describe('validateToken', () => {
  it('should resolve token by key', () => {
    const result = validateToken('usdc');
    expect(result.key).toBe('usdc');
    expect(result.symbol).toBe('USDC');
  });

  it('should resolve token by symbol', () => {
    const result = validateToken('USDC');
    expect(result.key).toBe('usdc');
    expect(result.symbol).toBe('USDC');
  });

  it('should reject empty token', () => {
    expect(() => validateToken('')).toThrow(InvalidArgumentError);
  });
});

describe('validateStrategyType', () => {
  it('should accept valid strategy type', () => {
    expect(validateStrategyType('usdc_stablecoin')).toBe('usdc_stablecoin');
  });

  it('should reject empty strategy type', () => {
    expect(() => validateStrategyType('')).toThrow(InvalidArgumentError);
  });

  it('should reject unknown strategy type', () => {
    expect(() => validateStrategyType('invalid_strategy')).toThrow(InvalidArgumentError);
  });
});

describe('validatePrivateKey', () => {
  const validKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  it('should accept valid hex key with prefix', () => {
    expect(validatePrivateKey(validKey)).toBe(validKey);
  });

  it('should add 0x prefix if missing', () => {
    const keyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    expect(validatePrivateKey(keyWithoutPrefix)).toBe(`0x${keyWithoutPrefix}`);
  });

  it('should reject empty key', () => {
    expect(() => validatePrivateKey('')).toThrow(InvalidArgumentError);
  });

  it('should reject invalid format', () => {
    expect(() => validatePrivateKey('0x123')).toThrow('Invalid private key format');
  });
});

describe('validateRpcUrl', () => {
  it('should accept valid HTTP URL', () => {
    const url = 'https://mainnet.base.org';
    expect(validateRpcUrl(url)).toBe(url);
  });

  it('should accept valid WSS URL', () => {
    const url = 'wss://mainnet.base.org';
    expect(validateRpcUrl(url)).toBe(url);
  });

  it('should reject empty URL', () => {
    expect(() => validateRpcUrl('')).toThrow(InvalidArgumentError);
  });

  it('should reject invalid URL', () => {
    expect(() => validateRpcUrl('not-a-url')).toThrow('Invalid RPC URL');
  });
});

describe('requireNonEmpty', () => {
  it('should return trimmed value', () => {
    expect(requireNonEmpty('  hello  ', 'field')).toBe('hello');
  });

  it('should reject empty string', () => {
    expect(() => requireNonEmpty('', 'field')).toThrow('field is required');
  });

  it('should reject whitespace-only string', () => {
    expect(() => requireNonEmpty('   ', 'field')).toThrow('field is required');
  });

  it('should reject undefined', () => {
    expect(() => requireNonEmpty(undefined, 'field')).toThrow('field is required');
  });
});
