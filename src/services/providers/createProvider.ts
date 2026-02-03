import { EchoChatProvider } from '../echo/EchoChatProvider'
import { OllamaChatProvider } from '../ollama/OllamaChatProvider'
import { MoltChatProvider } from './MoltChatProvider'
import { ChatProvider, ProviderConfig } from './types'

/**
 * Factory function that creates the appropriate ChatProvider
 * based on the provider type in the config.
 */
export function createChatProvider(config: ProviderConfig): ChatProvider {
  switch (config.type) {
    case 'molt':
      return new MoltChatProvider(config)
    case 'ollama':
      return new OllamaChatProvider(config)
    case 'echo':
      return new EchoChatProvider(config)
    default:
      throw new Error(`Unknown provider type: ${(config as ProviderConfig).type}`)
  }
}
