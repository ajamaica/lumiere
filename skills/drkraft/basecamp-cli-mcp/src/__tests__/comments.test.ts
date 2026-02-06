import { describe, expect, it } from 'vitest'

import * as api from '../lib/api.js'

describe('Comments API Functions', () => {
  describe('Function exports', () => {
    it('should export listComments function', () => {
      expect(typeof api.listComments).toBe('function')
    })

    it('should export getComment function', () => {
      expect(typeof api.getComment).toBe('function')
    })

    it('should export createComment function', () => {
      expect(typeof api.createComment).toBe('function')
    })

    it('should export updateComment function', () => {
      expect(typeof api.updateComment).toBe('function')
    })

    it('should export deleteComment function', () => {
      expect(typeof api.deleteComment).toBe('function')
    })
  })

  describe('Function signatures', () => {
    it('listComments should accept projectId and recordingId', () => {
      const fn = api.listComments
      expect(fn.length).toBe(2)
    })

    it('getComment should accept projectId and commentId', () => {
      const fn = api.getComment
      expect(fn.length).toBe(2)
    })

    it('createComment should accept projectId, recordingId, and content', () => {
      const fn = api.createComment
      expect(fn.length).toBe(3)
    })

    it('updateComment should accept projectId, commentId, and content', () => {
      const fn = api.updateComment
      expect(fn.length).toBe(3)
    })

    it('deleteComment should accept projectId and commentId', () => {
      const fn = api.deleteComment
      expect(fn.length).toBe(2)
    })
  })

  describe('Function return types', () => {
    it('listComments should return a Promise', async () => {
      const result = await api.listComments(1, 1)
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]?.id).toBe(1)
    })

    it('getComment should return a Promise', async () => {
      const result = await api.getComment(1, 1)
      expect(result.id).toBe(1)
    })

    it('createComment should return a Promise', async () => {
      const result = await api.createComment(1, 1, 'test')
      expect(result.id).toBe(2)
    })

    it('updateComment should return a Promise', async () => {
      const result = await api.updateComment(1, 1, 'test')
      expect(result.id).toBe(1)
    })

    it('deleteComment should return a Promise', async () => {
      await expect(api.deleteComment(1, 1)).resolves.toBeUndefined()
    })
  })
})
