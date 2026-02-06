/**
 * Error Handling Utilities Tests
 */

import {
  AmpedDefiError,
  createPolicyError,
  createTransactionError,
  createWalletError,
  ErrorCode,
  ErrorSeverity,
  getRetryDelay,
  isRetryableError,
  logError,
  wrapError,
} from '../utils/errors';

describe('Error Utilities', () => {
  describe('AmpedDefiError', () => {
    it('should create error with all properties', () => {
      const error = new AmpedDefiError(
        ErrorCode.POLICY_SLIPPAGE_EXCEEDED,
        'Slippage too high',
        {
          severity: ErrorSeverity.WARNING,
          remediation: 'Increase slippage tolerance',
          details: { current: 100, limit: 50 },
          context: { operation: 'swap', walletId: 'test' },
        }
      );

      expect(error.code).toBe(ErrorCode.POLICY_SLIPPAGE_EXCEEDED);
      expect(error.message).toBe('Slippage too high');
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.remediation).toBe('Increase slippage tolerance');
      expect(error.details).toEqual({ current: 100, limit: 50 });
      expect(error.context).toEqual({ operation: 'swap', walletId: 'test' });
      expect(error.name).toBe('AmpedDefiError');
    });

    it('should default severity to ERROR', () => {
      const error = new AmpedDefiError(
        ErrorCode.UNKNOWN_ERROR,
        'Something went wrong'
      );

      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AmpedDefiError(
        ErrorCode.WALLET_NOT_FOUND,
        'Wallet not found',
        { remediation: 'Check configuration' }
      );

      const json = error.toJSON();
      expect(json.code).toBe(ErrorCode.WALLET_NOT_FOUND);
      expect(json.message).toBe('Wallet not found');
      expect(json.remediation).toBe('Check configuration');
    });

    it('should generate user-friendly message', () => {
      const error = new AmpedDefiError(
        ErrorCode.TRANSACTION_FAILED,
        'Transaction failed',
        { remediation: 'Try again later' }
      );

      const userMsg = error.toUserMessage();
      expect(userMsg).toContain('[TRANSACTION_FAILED] Transaction failed');
      expect(userMsg).toContain('Suggestion: Try again later');
    });
  });

  describe('Error Factory Functions', () => {
    it('should create policy error with remediation', () => {
      const error = createPolicyError(
        ErrorCode.POLICY_SLIPPAGE_EXCEEDED,
        'Slippage exceeds limit',
        { current: 150, limit: 100 }
      );

      expect(error.code).toBe(ErrorCode.POLICY_SLIPPAGE_EXCEEDED);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.remediation).toContain('150');
      expect(error.remediation).toContain('100');
      expect(error.remediation).toContain('exceeds limit');
    });

    it('should create wallet error with context', () => {
      const cause = new Error('Original error');
      const error = createWalletError(
        ErrorCode.WALLET_NOT_FOUND,
        'my-wallet',
        cause,
        { operation: 'borrow' }
      );

      expect(error.code).toBe(ErrorCode.WALLET_NOT_FOUND);
      expect(error.message).toContain('my-wallet');
      expect(error.context).toEqual({ operation: 'borrow', walletId: 'my-wallet' });
      expect(error.cause).toBe(cause);
    });

    it('should create transaction error with txHash', () => {
      const error = createTransactionError(
        ErrorCode.TRANSACTION_TIMEOUT,
        'Transaction timed out',
        '0xabc123'
      );

      expect(error.code).toBe(ErrorCode.TRANSACTION_TIMEOUT);
      expect(error.details).toEqual({ txHash: '0xabc123' });
      expect(error.context).toEqual({ txHash: '0xabc123' });
    });
  });

  describe('wrapError', () => {
    it('should return AmpedDefiError as-is', () => {
      const original = new AmpedDefiError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'SDK not ready'
      );
      const wrapped = wrapError(original);

      expect(wrapped).toBe(original);
    });

    it('should wrap standard Error and infer code', () => {
      const original = new Error('Insufficient balance for transaction');
      const wrapped = wrapError(original);

      expect(wrapped).toBeInstanceOf(AmpedDefiError);
      expect(wrapped.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(wrapped.message).toBe('Insufficient balance for transaction');
    });

    it('should use fallback code when unable to infer', () => {
      const original = new Error('Some random error');
      const wrapped = wrapError(original, ErrorCode.UNKNOWN_ERROR);

      expect(wrapped.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it('should wrap non-error values', () => {
      const wrapped = wrapError('string error');

      expect(wrapped).toBeInstanceOf(AmpedDefiError);
      expect(wrapped.message).toBe('string error');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable error codes', () => {
      const timeoutError = new AmpedDefiError(
        ErrorCode.TRANSACTION_TIMEOUT,
        'Timeout'
      );
      expect(isRetryableError(timeoutError)).toBe(true);

      const rpcError = new AmpedDefiError(
        ErrorCode.RPC_URL_NOT_CONFIGURED,
        'RPC error'
      );
      expect(isRetryableError(rpcError)).toBe(true);
    });

    it('should identify non-retryable error codes', () => {
      const policyError = new AmpedDefiError(
        ErrorCode.POLICY_SLIPPAGE_EXCEEDED,
        'Slippage'
      );
      expect(isRetryableError(policyError)).toBe(false);
    });

    it('should check message patterns for generic errors', () => {
      const networkError = new Error('Network connection failed');
      expect(isRetryableError(networkError)).toBe(true);

      const randomError = new Error('Something broke');
      expect(isRetryableError(randomError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(getRetryDelay(0)).toBe(1000);
      expect(getRetryDelay(1)).toBe(2000);
      expect(getRetryDelay(2)).toBe(4000);
      expect(getRetryDelay(3)).toBe(8000);
    });

    it('should cap at 30 seconds', () => {
      expect(getRetryDelay(10)).toBe(30000);
      expect(getRetryDelay(20)).toBe(30000);
    });

    it('should use custom base delay', () => {
      expect(getRetryDelay(0, 500)).toBe(500);
      expect(getRetryDelay(1, 500)).toBe(1000);
    });
  });

  describe('logError', () => {
    it('should log structured error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new AmpedDefiError(
        ErrorCode.TRANSACTION_FAILED,
        'Transaction failed'
      );

      logError(error, { operation: 'swap', walletId: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logged.component).toBe('amped-defi');
      expect(logged.code).toBe(ErrorCode.TRANSACTION_FAILED);
      expect(logged.level).toBe('error');

      consoleSpy.mockRestore();
    });

    it('should handle standard errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Standard error');
      logError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logged.code).toBe(ErrorCode.UNKNOWN_ERROR);

      consoleSpy.mockRestore();
    });
  });
});
