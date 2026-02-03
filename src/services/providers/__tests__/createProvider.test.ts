import { EchoChatProvider } from '../../echo/EchoChatProvider'
import { createChatProvider } from '../createProvider'

// Mock heavy providers to avoid importing their dependencies
jest.mock('../MoltChatProvider', () => ({
  MoltChatProvider: jest.fn().mockImplementation(() => ({ type: 'molt-mock' })),
}))
jest.mock('../../ollama/OllamaChatProvider', () => ({
  OllamaChatProvider: jest.fn().mockImplementation(() => ({ type: 'ollama-mock' })),
}))

describe('createChatProvider', () => {
  it('creates an EchoChatProvider for echo type', () => {
    const provider = createChatProvider({
      type: 'echo',
      url: '',
      token: '',
    })
    expect(provider).toBeInstanceOf(EchoChatProvider)
  })

  it('creates a MoltChatProvider for molt type', () => {
    const provider = createChatProvider({
      type: 'molt',
      url: 'wss://example.com',
      token: 'test-token',
    })
    expect(provider).toHaveProperty('type', 'molt-mock')
  })

  it('creates an OllamaChatProvider for ollama type', () => {
    const provider = createChatProvider({
      type: 'ollama',
      url: 'http://localhost:11434',
      token: '',
      model: 'llama3',
    })
    expect(provider).toHaveProperty('type', 'ollama-mock')
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
