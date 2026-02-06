/**
 * Circle Adapter Tests
 */

import { 
  disburseLoan,
  getPoolWallet,
  getTransactionStatus,
  getWalletBalance,
  isCircleConfigured,
  isCircleError,
  isTransferSuccess,
  receiveRepayment} from '../adapters/circle';

describe('CircleAdapter', () => {
  // Note: These tests run with Circle potentially configured
  // Some tests may behave differently if config file exists

  describe('isCircleConfigured', () => {
    it('should report configuration status', () => {
      // Just check it returns a boolean
      const result = isCircleConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getPoolWallet', () => {
    it('should return wallet info', async () => {
      const wallet = await getPoolWallet();
      
      expect(wallet).toBeDefined();
      expect(wallet).toHaveProperty('id');
      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('chain');
      expect(wallet).toHaveProperty('usdcBalance');
    });

    it('should have valid Ethereum address format', async () => {
      const wallet = await getPoolWallet();
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });
  });

  describe('getWalletBalance', () => {
    it('should return balance as number', async () => {
      const balance = await getWalletBalance('test-wallet-id');
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disburseLoan', () => {
    it('should return transfer result', async () => {
      const result = await disburseLoan(
        '0x1234567890123456789012345678901234567890',
        100
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      // If successful, should have transactionId
      if (result.success) {
        expect(result).toHaveProperty('transactionId');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });

  describe('receiveRepayment', () => {
    it('should return transfer result for repayment', async () => {
      const result = await receiveRepayment(
        'mock-wallet-123',
        '0x1234567890123456789012345678901234567890',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5b4e0',
        50
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      // If successful, should have transactionId
      if (result.success) {
        expect(result).toHaveProperty('transactionId');
        // Transaction ID should indicate repayment
        expect(result.transactionId).toContain('repay');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('should handle zero amount repayment', async () => {
      const result = await receiveRepayment(
        'mock-wallet-123',
        '0x1234567890123456789012345678901234567890',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5b4e0',
        0
      );

      expect(result).toHaveProperty('success');
    });

    it('should handle large amount repayment', async () => {
      const result = await receiveRepayment(
        'mock-wallet-123',
        '0x1234567890123456789012345678901234567890',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5b4e0',
        10000
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('getTransactionStatus', () => {
    it('should return status or null', async () => {
      const status = await getTransactionStatus('mock-tx-123');
      
      // Either returns status object or null
      expect(status === null || (status && 'state' in status)).toBe(true);
    });
  });

  describe('Type Guards', () => {
    describe('isCircleError', () => {
      it('should return true for CircleError', () => {
        const error: any = { success: false, error: 'Test error' };
        expect(isCircleError(error)).toBe(true);
      });

      it('should return false for successful result', () => {
        const success: any = { success: true, transactionId: '123' };
        expect(isCircleError(success)).toBe(false);
      });
    });

    describe('isTransferSuccess', () => {
      it('should return true for successful transfer', () => {
        const transfer: any = { success: true, transactionId: '123' };
        expect(isTransferSuccess(transfer)).toBe(true);
      });

      it('should return false for failed transfer', () => {
        const failed: any = { success: false, error: 'Failed' };
        expect(isTransferSuccess(failed)).toBe(false);
      });
    });
  });
});
