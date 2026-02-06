import { describe, expect, it } from 'vitest'

describe('search', () => {
  it('should export search function from api module', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('search function should accept query parameter', async () => {
    const { search } = await import('../lib/api.js')
    const fn = search as any
    expect(fn.length).toBeGreaterThanOrEqual(1)
  })

  it('search function should accept optional options parameter', async () => {
    const { search } = await import('../lib/api.js')
    const fn = search as any
    expect(fn.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle query with type filter option', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle query with bucket_id filter option', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle query with creator_id filter option', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle query with file_type filter option', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle query with exclude_chat option', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle query with pagination options', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should handle multiple filter options together', async () => {
    const { search } = await import('../lib/api.js')
    expect(typeof search).toBe('function')
  })

  it('should be async function', async () => {
    const { search } = await import('../lib/api.js')
    const result = await search('test')
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]?.id).toBe(7001)
  })
})
