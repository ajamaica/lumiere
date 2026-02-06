/**
 * AlephChat
 *
 * Main chat client that combines all components:
 * - AlephSemanticCore for semantic processing
 * - LMStudioClient or VertexAIClient for LLM inference
 * - PromptEnhancer for context injection
 * - ResponseProcessor for learning extraction
 */

// Import SemanticBackend from @aleph-ai/tinyaleph npm package
const tinyaleph = require('@aleph-ai/tinyaleph')
const SemanticBackend =
  tinyaleph.SemanticBackend ||
  class SemanticBackend {
    constructor(options = {}) {
      this.dimension = options.dimension || 16
    }
    textToOrderedState(text) {
      return { state: new Map() }
    }
  }
const { LMStudioClient } = require('./lmstudio')
const { VertexAIClient } = require('./vertex-ai')
const { AlephSemanticCore } = require('./core')
const { PromptEnhancer } = require('./enhancer')
const { ResponseProcessor } = require('./processor')
const { OPENAI_TOOLS } = require('./tools')

/**
 * Create an LLM client based on provider
 * @param {Object} options - Configuration options
 * @returns {LMStudioClient|VertexAIClient}
 */
function createLLMClient(options = {}) {
  const provider = options.provider || 'lmstudio'

  switch (provider.toLowerCase()) {
    case 'vertex':
    case 'vertexai':
    case 'vertex-ai':
    case 'google':
    case 'gemini':
      console.log('[AlephChat] Using Vertex AI provider')
      return new VertexAIClient({
        projectId: options.projectId || process.env.GOOGLE_CLOUD_PROJECT,
        location: options.location || process.env.GOOGLE_CLOUD_LOCATION || 'global',
        model: options.model || 'gemini-3-pro-preview',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens || 32768,
        timeout: options.timeout || 120000,
      })

    case 'lmstudio':
    case 'openai':
    case 'local':
    default:
      console.log('[AlephChat] Using LMStudio provider')
      return new LMStudioClient({
        baseUrl: options.lmstudioUrl || options.baseUrl || 'http://localhost:1234/v1',
        model: options.model || 'local-model',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens || 32768,
        timeout: options.timeout || 120000,
      })
  }
}

class AlephChat {
  /**
   * Create an AlephChat instance
   * @param {Object} options - Configuration options
   * @param {string} options.provider - LLM provider: 'lmstudio', 'vertex', 'google', 'gemini'
   * @param {string} options.model - Model name (provider-specific)
   * @param {string} options.projectId - Google Cloud project ID (for Vertex AI)
   * @param {string} options.location - Google Cloud region (for Vertex AI)
   * @param {string} options.lmstudioUrl - LMStudio API URL (for LMStudio)
   */
  constructor(options = {}) {
    // Initialize backend
    this.dimension = options.dimension || 16
    this.backend = new SemanticBackend({ dimension: this.dimension })

    // Store provider info
    this.provider = options.provider || 'lmstudio'

    // Initialize LLM client based on provider
    this.llm = createLLMClient(options)

    // Initialize semantic core
    this.core = new AlephSemanticCore(this.backend, {
      dataPath: options.dataPath || './data',
      dimension: this.dimension,
      learningRate: options.learningRate || 0.1,
    })

    // Initialize enhancer and processor
    this.enhancer = new PromptEnhancer(this.core, {
      systemPrompt: options.systemPrompt,
      includeStyle: options.includeStyle !== false,
      includeTopics: options.includeTopics !== false,
      includeConcepts: options.includeConcepts !== false,
    })

    this.processor = new ResponseProcessor(this.core, {
      coherenceThreshold: options.coherenceThreshold || 0.6,
      learnFromResponses: options.learnFromResponses !== false,
    })

    // State
    this.isConnected = false
    this.modelName = null
    this.sessionStart = Date.now()
    this.exchangeCount = 0

    // Tools
    this.tools = OPENAI_TOOLS
    this.useTools = options.useTools !== false

    // Callbacks for UI integration
    this.callbacks = {
      onNewWord: options.onNewWord || null,
      onTopicChange: options.onTopicChange || null,
      onCoherence: options.onCoherence || null,
      onStream: options.onStream || null,
      onToolCall: options.onToolCall || null,
    }
  }

  /**
   * Connect to LMStudio
   * @returns {Promise<boolean>}
   */
  async connect() {
    this.isConnected = await this.llm.isConnected()
    if (this.isConnected) {
      this.modelName = await this.llm.getCurrentModel()
    }
    return this.isConnected
  }

  /**
   * Send a message and get a response
   * @param {string} userMessage - User's message
   * @param {Object} options - Options
   * @returns {Promise<Object>} Response with metadata
   */
  async chat(userMessage, options = {}) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) {
        return {
          success: false,
          error: 'Not connected to LMStudio. Is it running?',
          response: null,
        }
      }
    }

    // Pre-process user input
    const inputResult = this.core.processUserInput(userMessage)

    // Notify about new words
    if (inputResult.newWords.length > 0 && this.callbacks.onNewWord) {
      for (const word of inputResult.newWords) {
        this.callbacks.onNewWord(word)
      }
    }

    // Notify about topic changes
    if (inputResult.topicUpdate.isNewTopic && this.callbacks.onTopicChange) {
      this.callbacks.onTopicChange(inputResult.topicUpdate)
    }

    // Enhance prompt with context
    const enhanced =
      options.autoEnhance !== false
        ? this.enhancer.autoEnhance(userMessage)
        : this.enhancer.enhance(userMessage)

    try {
      let response

      if (options.stream && this.callbacks.onStream) {
        // Streaming mode
        response = ''
        for await (const chunk of this.llm.streamChat(enhanced.messages)) {
          response += chunk
          this.callbacks.onStream(chunk)
        }
      } else {
        // Regular mode
        const result = await this.llm.chat(enhanced.messages)
        response = result.content
      }

      // Process response
      const processed = this.processor.process(response, userMessage)

      // Notify about coherence
      if (this.callbacks.onCoherence) {
        this.callbacks.onCoherence(processed.coherence)
      }

      this.exchangeCount++

      return {
        success: true,
        response,
        metadata: {
          coherence: processed.coherence,
          quality: processed.quality,
          newWords: [...inputResult.newWords, ...processed.newWords],
          concepts: processed.concepts,
          warnings: processed.warnings,
          contextUsed: enhanced.context.memoryUsed,
          taskType: enhanced.taskType || null,
          topics: inputResult.topicUpdate.topics,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: null,
      }
    }
  }

  /**
   * Stream a chat response
   * @param {string} userMessage - User's message
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Options including tools and conversationHistory
   * @returns {AsyncGenerator<string|Object>}
   */
  async *streamChat(userMessage, onChunk = null, options = {}) {
    console.log('[AlephChat.streamChat] Called with message:', userMessage?.substring(0, 50))
    console.log('[AlephChat.streamChat] isConnected:', this.isConnected)

    if (!this.isConnected) {
      console.log('[AlephChat.streamChat] Not connected, reconnecting...')
      await this.connect()
      console.log('[AlephChat.streamChat] Reconnection result:', this.isConnected)
    }

    // Check if this is a tool continuation (empty user message with tool results in history)
    const isToolContinuation =
      !userMessage && options.conversationHistory?.some((m) => m.role === 'tool')

    let messages

    if (isToolContinuation) {
      // For tool continuation, use the conversation history directly with system prompt
      console.log('[AlephChat.streamChat] Tool continuation mode')
      const systemPrompt = this.enhancer.getSystemPrompt()
      messages = [{ role: 'system', content: systemPrompt }, ...options.conversationHistory]
      console.log('[AlephChat.streamChat] Built messages for tool continuation:', messages.length)
    } else {
      // Normal message processing
      const inputResult = this.core.processUserInput(userMessage)
      console.log('[AlephChat.streamChat] Input processed, new words:', inputResult.newWords.length)

      // Pass conversation history and sense context to the enhancer
      const enhanceOptions = {}
      if (options.conversationHistory) {
        enhanceOptions.conversationHistory = options.conversationHistory
      }
      // Pass sense context as system-level metadata (not mixed with user message)
      if (options.senseContext) {
        enhanceOptions.senseContext = options.senseContext
      }
      const enhanced = this.enhancer.autoEnhance(userMessage, enhanceOptions)
      messages = enhanced.messages
    }

    console.log('[AlephChat.streamChat] Messages count:', messages.length)
    console.log('[AlephChat.streamChat] First message role:', messages[0]?.role)

    // Add tools to the request if enabled
    const streamOptions = {}
    if (this.useTools && options.tools !== false) {
      streamOptions.tools = this.tools
      console.log('[AlephChat.streamChat] Tools enabled, count:', this.tools.length)
    }

    let fullResponse = ''
    let yieldCount = 0

    console.log('[AlephChat.streamChat] Starting LLM stream...')

    try {
      for await (const chunk of this.llm.streamChat(messages, streamOptions)) {
        yieldCount++

        // Handle tool calls object
        if (chunk && typeof chunk === 'object' && chunk.type === 'tool_calls') {
          console.log('[AlephChat.streamChat] Tool calls received')
          if (this.callbacks.onToolCall) {
            this.callbacks.onToolCall(chunk.toolCalls)
          }
          yield chunk
          continue
        }

        // Handle regular text chunks
        if (typeof chunk === 'string') {
          fullResponse += chunk
          if (onChunk) onChunk(chunk)
          yield chunk
        } else {
          console.log('[AlephChat.streamChat] Unknown chunk type:', typeof chunk, chunk)
        }
      }

      console.log(
        '[AlephChat.streamChat] Stream complete, total yields:',
        yieldCount,
        'response length:',
        fullResponse.length,
      )
    } catch (err) {
      console.error('[AlephChat.streamChat] Stream error:', err.message)
      console.error('[AlephChat.streamChat] Stack:', err.stack)
      throw err
    }

    // Process complete response (only if we have content)
    if (fullResponse && userMessage) {
      this.processor.process(fullResponse, userMessage)
      this.exchangeCount++
    }
  }

  /**
   * Get session statistics
   * @returns {Object}
   */
  getStats() {
    const coreStats = this.core.getStats()
    return {
      connected: this.isConnected,
      model: this.modelName,
      sessionDuration: Date.now() - this.sessionStart,
      exchangeCount: this.exchangeCount,
      ...coreStats,
    }
  }

  /**
   * Get vocabulary statistics
   * @returns {Object}
   */
  getVocabStats() {
    return this.core.vocabulary.getStats()
  }

  /**
   * Get current topics
   * @returns {Array}
   */
  getTopics() {
    return this.core.topicTracker.getCurrentTopics()
  }

  /**
   * Get style profile
   * @returns {Object}
   */
  getStyleProfile() {
    return this.core.styleProfiler.getStyleHints()
  }

  /**
   * Find similar words
   * @param {string} word - Query word
   * @returns {Array}
   */
  findSimilarWords(word) {
    return this.core.vocabulary.findSimilar(word)
  }

  /**
   * Query concept graph
   * @param {string} concept - Query concept
   * @returns {Object}
   */
  queryConcepts(concept) {
    return this.core.conceptGraph.query(concept)
  }

  /**
   * Forget a word
   * @param {string} word - Word to forget
   * @returns {boolean}
   */
  forgetWord(word) {
    return this.core.vocabulary.forget(word)
  }

  /**
   * Save all data
   */
  save() {
    this.core.save()
  }

  /**
   * Clear session (keep persistent data)
   */
  clearSession() {
    this.core.clearSession()
    this.exchangeCount = 0
    this.sessionStart = Date.now()
  }

  /**
   * Reset everything
   */
  reset() {
    this.core.reset()
    this.exchangeCount = 0
    this.sessionStart = Date.now()
  }

  /**
   * End session and save
   */
  endSession() {
    const stats = this.getStats()
    this.core.memory.endSession({
      duration: stats.sessionDuration,
      exchanges: stats.exchangeCount,
      wordsLearned: stats.vocabulary.sessionWords,
      topics: this.getTopics(),
    })
    this.save()
  }
}

module.exports = { AlephChat }
