import { AppleChatProvider } from '../apple-intelligence/AppleChatProvider'
import { ClaudeChatProvider } from '../claude/ClaudeChatProvider'
import { EchoChatProvider } from '../echo/EchoChatProvider'
import { GeminiChatProvider } from '../gemini/GeminiChatProvider'
import { GeminiNanoChatProvider } from '../gemini-nano/GeminiNanoChatProvider'
import { KimiChatProvider } from '../kimi/KimiChatProvider'
import { OllamaChatProvider } from '../ollama/OllamaChatProvider'
import { OpenAIChatProvider } from '../openai/OpenAIChatProvider'
import { OpenRouterChatProvider } from '../openrouter/OpenRouterChatProvider'
import { CachedChatProvider } from './CachedChatProvider'
import { MoltChatProvider } from './MoltChatProvider'
import { ChatProvider, ProviderConfig } from './types'

/**
 * Factory function that creates the appropriate ChatProvider
 * based on the provider type in the config.
 *
 * Every provider is automatically wrapped with {@link CachedChatProvider}
 * so that chat messages are persisted locally via AsyncStorage and
 * available offline.
 */
export function createChatProvider(config: ProviderConfig): ChatProvider {
  let inner: ChatProvider

  switch (config.type) {
    case 'molt':
      inner = new MoltChatProvider(config)
      break
    case 'ollama':
      inner = new OllamaChatProvider(config)
      break
    case 'echo':
      inner = new EchoChatProvider(config)
      break
    case 'apple':
      inner = new AppleChatProvider(config)
      break
    case 'claude':
      inner = new ClaudeChatProvider(config)
      break
    case 'openai':
      inner = new OpenAIChatProvider(config)
      break
    case 'openai-compatible':
      inner = new OpenAIChatProvider(config)
      break
    case 'openrouter':
      inner = new OpenRouterChatProvider(config)
      break
    case 'gemini-nano':
      inner = new GeminiNanoChatProvider(config)
      break
    case 'gemini':
      inner = new GeminiChatProvider(config)
      break
    case 'kimi':
      inner = new KimiChatProvider(config)
      break
    default:
      throw new Error(`Unknown provider type: ${(config as ProviderConfig).type}`)
  }

  return new CachedChatProvider(inner, config.serverId)
}
