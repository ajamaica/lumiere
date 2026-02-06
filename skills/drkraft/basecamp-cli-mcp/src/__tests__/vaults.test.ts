import { describe, expect, it } from 'vitest'

import * as api from '../lib/api.js'

describe('Vaults API Functions', () => {
  describe('Function exports', () => {
    it('should export getVault function', () => {
      expect(typeof api.getVault).toBe('function')
    })

    it('should export listVaults function', () => {
      expect(typeof api.listVaults).toBe('function')
    })

    it('should export createVault function', () => {
      expect(typeof api.createVault).toBe('function')
    })

    it('should export updateVault function', () => {
      expect(typeof api.updateVault).toBe('function')
    })
  })

  describe('Function signatures', () => {
    it('getVault should accept projectId and vaultId', () => {
      const fn = api.getVault
      expect(fn.length).toBe(2)
    })

    it('listVaults should accept projectId and optional parentVaultId', () => {
      const fn = api.listVaults
      expect(fn.length).toBe(2)
    })

    it('createVault should accept projectId, parentVaultId, and title', () => {
      const fn = api.createVault
      expect(fn.length).toBe(3)
    })

    it('updateVault should accept projectId, vaultId, and title', () => {
      const fn = api.updateVault
      expect(fn.length).toBe(3)
    })
  })

  describe('Function return types', () => {
    it('getVault should return a Promise', async () => {
      const result = await api.getVault(1, 1)
      expect(result.id).toBe(1)
    })

    it('listVaults should return a Promise', async () => {
      const result = await api.listVaults(1)
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]?.id).toBe(1)
    })

    it('createVault should return a Promise', async () => {
      const result = await api.createVault(1, 1, 'Test Vault')
      expect(result.title).toBe('Test Vault')
    })

    it('updateVault should return a Promise', async () => {
      const result = await api.updateVault(1, 1, 'Updated Vault')
      expect(result.title).toBe('Updated Vault')
    })
  })
})
