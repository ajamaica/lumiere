import { describe, expect,it } from 'vitest';

import {
  ApiError,
  ErrorCode,
  InsufficientBalanceError,
  InsufficientGasError,
  InvalidArgumentError,
  MamoError,
  MissingEnvVarError,
  NoStrategyFoundError,
  NotOwnerError,
  StrategyExistsError,
  TransactionFailedError,
} from './errors.js';

describe('MamoError', () => {
  it('should create error with message and code', () => {
    const error = new MamoError('Test error', ErrorCode.UNKNOWN);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.UNKNOWN);
    expect(error.name).toBe('MamoError');
  });

  it('should include details in JSON output', () => {
    const error = new MamoError('Test error', ErrorCode.UNKNOWN, { foo: 'bar' });
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'MamoError',
      code: ErrorCode.UNKNOWN,
      message: 'Test error',
      details: { foo: 'bar' },
    });
  });
});

describe('MissingEnvVarError', () => {
  it('should create error with variable name', () => {
    const error = new MissingEnvVarError('MAMO_WALLET_KEY');

    expect(error.message).toBe('Environment variable MAMO_WALLET_KEY is not set');
    expect(error.code).toBe(ErrorCode.MISSING_ENV_VAR);
    expect(error.name).toBe('MissingEnvVarError');
  });
});

describe('InsufficientBalanceError', () => {
  it('should create error with balance details', () => {
    const error = new InsufficientBalanceError('USDC', 100n, 50n);

    expect(error.message).toContain('Insufficient USDC balance');
    expect(error.tokenSymbol).toBe('USDC');
    expect(error.required).toBe(100n);
    expect(error.available).toBe(50n);
    expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
  });
});

describe('InsufficientGasError', () => {
  it('should create error with ETH balance', () => {
    const error = new InsufficientGasError(1000n);

    expect(error.message).toContain('Insufficient ETH for gas');
    expect(error.ethBalance).toBe(1000n);
    expect(error.code).toBe(ErrorCode.INSUFFICIENT_GAS);
  });
});

describe('NoStrategyFoundError', () => {
  it('should create error with token symbol', () => {
    const error = new NoStrategyFoundError('No strategy found', 'USDC');

    expect(error.message).toBe('No strategy found');
    expect(error.tokenSymbol).toBe('USDC');
    expect(error.code).toBe(ErrorCode.NO_STRATEGY_FOUND);
  });
});

describe('StrategyExistsError', () => {
  it('should create error with strategy details', () => {
    const error = new StrategyExistsError('usdc_stablecoin', '0x123');

    expect(error.message).toContain('usdc_stablecoin');
    expect(error.strategyAddress).toBe('0x123');
    expect(error.code).toBe(ErrorCode.STRATEGY_EXISTS);
  });
});

describe('NotOwnerError', () => {
  it('should create error with owner details', () => {
    const error = new NotOwnerError('0xstrategy', '0xowner');

    expect(error.message).toContain('0xstrategy');
    expect(error.actualOwner).toBe('0xowner');
    expect(error.code).toBe(ErrorCode.NOT_OWNER);
  });
});

describe('TransactionFailedError', () => {
  it('should create error with tx hash', () => {
    const error = new TransactionFailedError('0xhash123');

    expect(error.message).toContain('0xhash123');
    expect(error.txHash).toBe('0xhash123');
    expect(error.code).toBe(ErrorCode.TRANSACTION_FAILED);
  });

  it('should include reason if provided', () => {
    const error = new TransactionFailedError('0xhash123', 'Reverted');

    expect(error.message).toContain('Reverted');
  });
});

describe('ApiError', () => {
  it('should create error with endpoint and status', () => {
    const error = new ApiError('/apy/usdc', 'Not found', 404);

    expect(error.message).toContain('/apy/usdc');
    expect(error.endpoint).toBe('/apy/usdc');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ErrorCode.API_ERROR);
  });
});

describe('InvalidArgumentError', () => {
  it('should create error with message', () => {
    const error = new InvalidArgumentError('Invalid token');

    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe(ErrorCode.INVALID_ARGUMENT);
  });
});
