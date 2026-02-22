import { toHttpUrl, toWebSocketUrl } from '../url'

describe('toWebSocketUrl', () => {
  it('keeps wss:// URLs as-is', () => {
    expect(toWebSocketUrl('wss://gateway.example.com')).toBe('wss://gateway.example.com')
  })

  it('keeps ws:// URLs as-is', () => {
    expect(toWebSocketUrl('ws://localhost:8080')).toBe('ws://localhost:8080')
  })

  it('converts https:// to wss://', () => {
    expect(toWebSocketUrl('https://gateway.example.com')).toBe('wss://gateway.example.com')
  })

  it('converts http:// to ws://', () => {
    expect(toWebSocketUrl('http://localhost:8080')).toBe('ws://localhost:8080')
  })

  it('prepends wss:// to bare hostnames', () => {
    expect(toWebSocketUrl('gateway.example.com')).toBe('wss://gateway.example.com')
  })

  it('preserves path and port', () => {
    expect(toWebSocketUrl('https://example.com:9090/ws')).toBe('wss://example.com:9090/ws')
  })
})

describe('toHttpUrl', () => {
  it('keeps https:// URLs as-is', () => {
    expect(toHttpUrl('https://gateway.example.com')).toBe('https://gateway.example.com')
  })

  it('keeps http:// URLs as-is', () => {
    expect(toHttpUrl('http://localhost:8080')).toBe('http://localhost:8080')
  })

  it('converts wss:// to https://', () => {
    expect(toHttpUrl('wss://gateway.example.com')).toBe('https://gateway.example.com')
  })

  it('converts ws:// to http://', () => {
    expect(toHttpUrl('ws://localhost:8080')).toBe('http://localhost:8080')
  })

  it('prepends https:// to bare hostnames', () => {
    expect(toHttpUrl('gateway.example.com')).toBe('https://gateway.example.com')
  })

  it('preserves path and port', () => {
    expect(toHttpUrl('wss://example.com:9090/api')).toBe('https://example.com:9090/api')
  })
})
