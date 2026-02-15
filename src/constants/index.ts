/**
 * Default session key used for chat conversations.
 * This value is used when no custom session key has been configured.
 * It follows the format: agent:<agentId>:<sessionName>
 */
export const DEFAULT_SESSION_KEY = 'agent:main:main'

/**
 * Default OpenClaw WebSocket server URL.
 * Used as the pre-populated URL when setting up an OpenClaw/Molt provider.
 */
export const DEFAULT_OPENCLAW_URL = 'wss://fierce-marlin-b41b.lumiere.bot'

/**
 * Default model identifiers for various AI providers.
 */
export const DEFAULT_MODELS = {
  /** Default Claude model for Claudie API provider */
  CLAUDE: 'claude-sonnet-4-5',
  /** Default Ollama model for local inference */
  OLLAMA: 'llama3.2',
  /** Default OpenAI model */
  OPENAI: 'gpt-4o',
  /** Default OpenAI-compatible model */
  OPENAI_COMPATIBLE: 'gpt-4o',
  /** Default OpenRouter model */
  OPENROUTER: 'openai/gpt-4o',
  /** Default Gemini model */
  GEMINI: 'gemini-2.0-flash',
  /** Default Kimi (Moonshot AI) model */
  KIMI: 'moonshot-v1-8k',
} as const

/**
 * API configuration constants.
 */
export const API_CONFIG = {
  /** Anthropic API version header value */
  ANTHROPIC_VERSION: '2023-06-01',
  /** Default max tokens for Claude API responses */
  CLAUDE_MAX_TOKENS: 8192,
  /** Default max tokens for OpenAI API responses */
  OPENAI_MAX_TOKENS: 4096,
  /** Default max tokens for OpenRouter API responses */
  OPENROUTER_MAX_TOKENS: 4096,
  /** Default max tokens for Gemini API responses */
  GEMINI_MAX_TOKENS: 8192,
  /** Default max tokens for Kimi API responses */
  KIMI_MAX_TOKENS: 4096,
} as const

/**
 * Cache configuration constants.
 */
export const CACHE_CONFIG = {
  /** Maximum number of messages cached per session */
  MAX_CACHED_MESSAGES: 200,
  /** AsyncStorage key prefix for cached chat messages */
  CACHE_KEY_PREFIX: 'chat_cache:',
  /** AsyncStorage key prefix for tracking known session keys per server */
  SESSION_INDEX_PREFIX: 'session_index:',
} as const
