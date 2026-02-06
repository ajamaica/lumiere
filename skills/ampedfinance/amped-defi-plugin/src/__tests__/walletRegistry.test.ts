/**
 * Wallet Registry Tests
 */

import { WalletRegistry } from '../wallet/walletRegistry'

// Mock environment
const originalEnv = process.env

describe('WalletRegistry', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.AMPED_OC_WALLETS_JSON
    delete process.env.AMPED_OC_MODE
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Configuration Loading', () => {
    it('should load empty wallets when env not set', () => {
      const registry = new WalletRegistry()
      expect(registry.getWalletCount()).toBe(0)
      expect(registry.getWalletIds()).toEqual([])
    })

    it('should load wallets in execute mode', () => {
      process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
        main: {
          address: '0x1234567890123456789012345678901234567890',
          privateKey: '0xabc123',
        },
        trading: {
          address: '0x0987654321098765432109876543210987654321',
          privateKey: '0xdef456',
        },
      })
      process.env.AMPED_OC_MODE = 'execute'

      const registry = new WalletRegistry()
      expect(registry.getWalletCount()).toBe(2)
      expect(registry.getWalletIds()).toContain('main')
      expect(registry.getWalletIds()).toContain('trading')
      expect(registry.isExecuteMode()).toBe(true)
      expect(registry.isPrepareMode()).toBe(false)
    })

    it('should load wallets in prepare mode', () => {
      process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
        main: {
          address: '0x1234567890123456789012345678901234567890',
        },
      })
      process.env.AMPED_OC_MODE = 'prepare'

      const registry = new WalletRegistry()
      expect(registry.getWalletCount()).toBe(1)
      expect(registry.isPrepareMode()).toBe(true)
      expect(registry.isExecuteMode()).toBe(false)
    })

    it('should handle invalid JSON gracefully', () => {
      process.env.AMPED_OC_WALLETS_JSON = 'invalid json'

      const registry = new WalletRegistry()
      expect(registry.getWalletCount()).toBe(0)
    })
  })

  describe('Wallet Resolution', () => {
    beforeEach(() => {
      process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
        main: {
          address: '0x1234567890123456789012345678901234567890',
          privateKey: '0xabc123',
        },
        nopk: {
          address: '0x0987654321098765432109876543210987654321',
        },
        invalid: {
          address: 'not-an-address',
        },
      })
      process.env.AMPED_OC_MODE = 'execute'
    })

    it('should resolve existing wallet', async () => {
      const registry = new WalletRegistry()
      const wallet = await registry.resolveWallet('main')

      expect(wallet).not.toBeNull()
      expect(wallet?.address).toBe('0x1234567890123456789012345678901234567890')
      expect(wallet?.privateKey).toBe('0xabc123')
      expect(wallet?.mode).toBe('execute')
    })

    it('should return null for non-existent wallet', async () => {
      const registry = new WalletRegistry()
      const wallet = await registry.resolveWallet('nonexistent')

      expect(wallet).toBeNull()
    })

    it('should reject wallet without private key in execute mode', async () => {
      const registry = new WalletRegistry()
      const wallet = await registry.resolveWallet('nopk')

      expect(wallet).toBeNull()
    })

    it('should reject wallet with invalid address', async () => {
      const registry = new WalletRegistry()
      const wallet = await registry.resolveWallet('invalid')

      expect(wallet).toBeNull()
    })
  })

  describe('Mode Detection', () => {
    it('should default to execute mode', () => {
      delete process.env.AMPED_OC_MODE
      const registry = new WalletRegistry()

      expect(registry.getMode()).toBe('execute')
    })

    it('should detect prepare mode', () => {
      process.env.AMPED_OC_MODE = 'prepare'
      const registry = new WalletRegistry()

      expect(registry.getMode()).toBe('prepare')
    })
  })

  describe('Hot Reload', () => {
    it('should reload wallets from environment', () => {
      process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
        wallet1: { address: '0x1234567890123456789012345678901234567890' },
      })

      const registry = new WalletRegistry()
      expect(registry.getWalletCount()).toBe(1)

      process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
        wallet1: { address: '0x1234567890123456789012345678901234567890' },
        wallet2: { address: '0x0987654321098765432109876543210987654321' },
      })

      registry.reload()
      expect(registry.getWalletCount()).toBe(2)
    })
  })
})
