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
jest.mock('../../claude/ClaudeChatProvider', () => ({
  ClaudeChatProvider: jest.fn().mockImplementation(() => ({ type: 'claude-mock' })),
}))
jest.mock('../../openai/OpenAIChatProvider', () => ({
  OpenAIChatProvider: jest.fn().mockImplementation(() => ({ type: 'openai-mock' })),
}))
jest.mock('../../openrouter/OpenRouterChatProvider', () => ({
  OpenRouterChatProvider: jest.fn().mockImplementation(() => ({ type: 'openrouter-mock' })),
}))
jest.mock('../../emergent/EmergentChatProvider', () => ({
  EmergentChatProvider: jest.fn().mockImplementation(() => ({ type: 'emergent-mock' })),
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

  it('creates a CachedChatProvider wrapping claude for claude type', () => {
    const provider = createChatProvider({
      type: 'claude',
      url: 'https://api.anthropic.com',
      token: 'test-key',
    })
    expect(provider).toBeInstanceOf(CachedChatProvider)
  })

  it('creates a CachedChatProvider wrapping openai for openai type', () => {
    const provider = createChatProvider({
      type: 'openai',
      url: 'https://api.openai.com',
      token: 'test-key',
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
