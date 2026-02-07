import { CachedChatProvider } from '../CachedChatProvider'
import { createChatProvider } from '../createProvider'

// Mock heavy providers to avoid importing their dependencies
jest.mock('../MoltChatProvider', () => ({
  MoltChatProvider: jest.fn().mockImplementation(() => ({ type: 'molt-mock' })),
}))
jest.mock('../../ollama/OllamaChatProvider', () => ({
  OllamaChatProvider: jest.fn().mockImplementation(() => ({ type: 'ollama-mock' })),
}))
jest.mock('../../apple-intelligence/AppleChatProvider', () => ({
  AppleChatProvider: jest.fn().mockImplementation(() => ({ type: 'apple-mock' })),
}))

describe('createChatProvider', () => {
  it('wraps every provider with CachedChatProvider', () => {
    const provider = createChatProvider({
      type: 'echo',
      url: '',
      token: '',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping echo for echo type', () => {
    const provider = createChatProvider({
      type: 'echo',
      url: '',
      token: '',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
    expect(provider.capabilities.chat).toBe(true)
  })

  it('creates a CachedChatProvider wrapping molt for molt type', () => {
    const provider = createChatProvider({
      type: 'molt',
      url: 'wss://example.com',
      token: 'test-token',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping ollama for ollama type', () => {
    const provider = createChatProvider({
      type: 'ollama',
      url: 'http://localhost:11434',
      token: '',
      model: 'llama3',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping apple for apple type', () => {
    const provider = createChatProvider({
      type: 'apple',
      url: 'apple://on-device',
      token: '',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping openrouter for openrouter type', () => {
    const provider = createChatProvider({
      type: 'openrouter',
      url: 'https://openrouter.ai/api',
      token: 'test-key',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping gemini for gemini type', () => {
    const provider = createChatProvider({
      type: 'gemini',
      url: 'https://generativelanguage.googleapis.com',
      token: 'test-key',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('throws for unknown provider type', () => {
    expect(() =>
      createChatProvider({
        type: 'unknown' as never,
        url: '',
        token: '',
      }),
    ).toThrow('Unknown provider type')
  })
})
