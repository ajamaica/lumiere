/**
 * Default session key used for chat conversations.
 * This value is used when no custom session key has been configured.
 * It follows the format: agent:<agentId>:<sessionName>
 */
export const DEFAULT_SESSION_KEY = 'agent:main:main'

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
 * HTTP request configuration constants.
 */
export const HTTP_CONFIG = {
  /** Default timeout for connection-check requests (ms) */
  CONNECT_TIMEOUT_MS: 15_000,
  /** Default timeout for streaming message requests (ms) — 5 minutes */
  STREAM_TIMEOUT_MS: 300_000,
  /** Maximum number of retries for transient failures during connect/health checks */
  MAX_RETRIES: 2,
  /** Base delay between retries (ms). Actual delay uses exponential backoff. */
  RETRY_BASE_DELAY_MS: 1_000,
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
  /** Time-to-live for cached sessions with no activity (ms) — 30 days */
  SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000,
} as const
