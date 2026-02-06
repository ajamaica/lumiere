import { describe, expect, it } from 'vitest'

import * as api from '../lib/api.js'

describe('Uploads API Functions', () => {
  describe('Function exports', () => {
    it('should export listUploads function', () => {
      expect(typeof api.listUploads).toBe('function')
    })

    it('should export getUpload function', () => {
      expect(typeof api.getUpload).toBe('function')
    })

    it('should export createUpload function', () => {
      expect(typeof api.createUpload).toBe('function')
    })

    it('should export updateUpload function', () => {
      expect(typeof api.updateUpload).toBe('function')
    })
  })

  describe('Function signatures', () => {
    it('listUploads should accept projectId and vaultId', () => {
      const fn = api.listUploads
      expect(fn.length).toBe(2)
    })

    it('getUpload should accept projectId and uploadId', () => {
      const fn = api.getUpload
      expect(fn.length).toBe(2)
    })

    it('createUpload should accept projectId, vaultId, attachable_sgid, and optional options', () => {
      const fn = api.createUpload
      expect(fn.length).toBe(4)
    })

    it('updateUpload should accept projectId, uploadId, and updates', () => {
      const fn = api.updateUpload
      expect(fn.length).toBe(3)
    })
  })

  describe('Function return types', () => {
    it('listUploads should return a Promise', async () => {
      const result = await api.listUploads(1, 1)
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]?.id).toBe(1)
    })

    it('getUpload should return a Promise', async () => {
      const result = await api.getUpload(1, 1)
      expect(result.id).toBe(1)
    })

    it('createUpload should return a Promise', async () => {
      const result = await api.createUpload(1, 1, 'test-sgid')
      expect(result.id).toBe(2)
    })

    it('updateUpload should return a Promise', async () => {
      const result = await api.updateUpload(1, 1, { description: 'Updated' })
      expect(result.id).toBe(1)
    })
  })
})
