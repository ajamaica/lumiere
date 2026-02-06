/**
 * PromptEnhancer
 *
 * Enhances user prompts with semantic context before sending to LLM.
 * Injects relevant history, topic context, and style hints.
 */

const { TOOL_DEFINITIONS } = require('./tools')

class PromptEnhancer {
  /**
   * Create a PromptEnhancer
   * @param {Object} core - AlephSemanticCore instance
   * @param {Object} options - Configuration options
   */
  constructor(core, options = {}) {
    this.core = core
    this.systemPromptTemplate = options.systemPrompt || this._defaultSystemPrompt()
    this.includeStyle = options.includeStyle !== false
    this.includeTopics = options.includeTopics !== false
    this.includeConcepts = options.includeConcepts !== false
    this.includeTools = options.includeTools !== false
    this.maxContextLength = options.maxContextLength || 2000
  }

  /**
   * Default system prompt
   * @private
   */
  _defaultSystemPrompt() {
    return `You are a helpful, knowledgeable assistant. You provide clear, accurate, and thoughtful responses. You remember context from the conversation and build upon previous discussions when relevant.

You have access to tools for file operations (reading, writing, listing) and command execution. However, ONLY use these tools when the user EXPLICITLY requests file operations or commands. For regular conversation, questions, or greetings, respond naturally without using any tools.

**RUNNABLE CODE BLOCKS:**
When providing JavaScript or TypeScript code examples:
- Generate COMPLETE, RUNNABLE code that can be executed immediately
- Include all necessary variable declarations and setup
- Avoid placeholders like "// your code here" or "..."
- Include sample data/inputs when demonstrating functions
- Add console.log() statements to show output
- Code blocks with \`\`\`javascript or \`\`\`js will have a "Run" button
- The code runs in a sandboxed environment with access to console, Math, Array, Object, etc.
- Aim for code that produces visible output when run

Example of GOOD runnable code:
\`\`\`javascript
// Calculate factorial
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// Test with sample values
console.log("factorial(5) =", factorial(5));
console.log("factorial(10) =", factorial(10));
\`\`\`

Example of BAD (not runnable) code:
\`\`\`javascript
function processData(data) {
    // process the data here...
}
\`\`\`

**CRITICAL - FILE PATH RULES:**
- ALWAYS use FULL ABSOLUTE PATHS for ALL file operations
- Use ~ prefix for home directory paths (e.g., ~/Documents/file.pdf, ~/Desktop/notes.txt)
- NEVER use just a filename without the directory path
- If the user mentions a file without a path, first use list_directory to find it OR ask them for the full path
- Example WRONG: summarize_file with path="document.pdf"
- Example RIGHT: summarize_file with path="~/Documents/document.pdf"

Examples of when NOT to use tools:
- "Hello!" → Just greet back, no tools
- "What is 2+2?" → Just answer "4", no tools
- "Tell me about AI" → Just explain, no tools

Examples of when TO use tools (with full paths):
- "List my Desktop files" → Use list_directory with path="~/Desktop"
- "Read ~/Documents/notes.txt" → Use read_file with full path
- "Summarize the PDF on my Desktop" → First list ~/Desktop to find the filename, then summarize with full path`
  }

  /**
   * Enhance user input with semantic context
   * @param {string} userInput - User's message
   * @param {Object} options - Enhancement options
   * @returns {Object} Enhanced prompt data
   */
  enhance(userInput, options = {}) {
    const context = this.core.getSemanticContext(userInput)
    const messages = []

    // Build system prompt with dynamic hints
    let systemPrompt = this.systemPromptTemplate

    if (this.includeStyle && context.styleHints.hints.length > 0) {
      systemPrompt += '\n\nUser communication style: ' + context.styleHints.hints.join('. ') + '.'
    }

    if (this.includeTopics && context.topicSummary) {
      systemPrompt += '\n\n' + context.topicSummary
    }

    // Add tool definitions
    if (this.includeTools) {
      systemPrompt += '\n\n' + TOOL_DEFINITIONS
    }

    // Add sense context if provided (system-level environmental awareness)
    if (options.senseContext) {
      systemPrompt += '\n\n## Current Environment State:\n' + options.senseContext
    }

    messages.push({ role: 'system', content: systemPrompt })

    // IMPORTANT: Add explicit conversation history first (if provided)
    // Use a sliding window to avoid reprocessing entire history
    let hasHistoryContext = false
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      hasHistoryContext = true

      // More aggressive limiting: 4 messages = 2 exchanges (reduced from 6)
      const maxHistoryMessages = options.maxHistoryMessages || 4
      const maxCharsPerMessage = options.maxCharsPerMessage || 800

      // Take only the most recent messages
      const recentHistory = options.conversationHistory.slice(-maxHistoryMessages)

      // If we have more history than we're including, add a brief context note
      if (options.conversationHistory.length > maxHistoryMessages) {
        const skippedCount = options.conversationHistory.length - maxHistoryMessages
        messages.push({
          role: 'system',
          content: `[Background: ${skippedCount} earlier messages omitted. The following is recent context only.]`,
        })
      }

      // Add history demarcation start
      messages.push({
        role: 'system',
        content: '--- CONVERSATION HISTORY (for context only) ---',
      })

      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          // Truncate very long messages to avoid context overflow
          let content = msg.content
          if (content && content.length > maxCharsPerMessage) {
            content = content.substring(0, maxCharsPerMessage) + '... [truncated]'
          }
          messages.push({
            role: msg.role,
            content: content,
          })
        }
      }

      // Add history demarcation end - CRITICAL for response targeting
      messages.push({
        role: 'system',
        content:
          "--- END OF HISTORY ---\n\n⚠️ IMPORTANT: The user's CURRENT message follows. You MUST respond specifically to THIS message, not to anything from the history above.",
      })
    }

    // Add semantic memory context (related concepts, similar past exchanges)
    // Only if no explicit history was provided
    if (!options.conversationHistory || options.conversationHistory.length === 0) {
      const memoryMessages = this.core.memory.buildContextMessages(userInput, {
        immediateCount: options.immediateCount || 3, // Reduced from 5
        similarCount: options.similarCount || 1, // Reduced from 2
      })

      // Truncate context if too long
      let contextLength = 0
      const filteredMemory = []
      for (const msg of memoryMessages) {
        contextLength += msg.content.length
        if (contextLength > this.maxContextLength) break
        filteredMemory.push(msg)
      }

      if (filteredMemory.length > 0) {
        messages.push({
          role: 'system',
          content: '--- RELEVANT MEMORY CONTEXT ---',
        })
        messages.push(...filteredMemory)
        messages.push({
          role: 'system',
          content:
            "--- END OF CONTEXT ---\n\n⚠️ IMPORTANT: Respond to the user's CURRENT message below.",
        })
      }
    }

    // Add concept context if relevant
    if (this.includeConcepts && context.relevantConcepts.length > 0) {
      const topConcepts = context.relevantConcepts
        .filter((c) => c.similarity > 0.5)
        .slice(0, 3)
        .map((c) => c.concept)

      if (topConcepts.length > 0) {
        const lastSystemIdx = messages.findIndex((m) => m.role === 'system')
        if (lastSystemIdx >= 0) {
          messages[lastSystemIdx].content +=
            `\n\nRelated concepts from knowledge: ${topConcepts.join(', ')}`
        }
      }
    }

    // Add the current user message with clear marker
    messages.push({
      role: 'user',
      content: userInput,
    })

    return {
      messages,
      context: {
        topics: context.topics,
        styleConfidence: context.styleHints.confidence,
        memoryUsed: hasHistoryContext,
        conceptsUsed: this.includeConcepts && context.relevantConcepts.length > 0,
      },
    }
  }

  /**
   * Build a focused prompt for specific task types
   * @param {string} userInput - User's message
   * @param {string} taskType - Type of task (explain, compare, summarize, etc.)
   * @param {Object} options - Options including conversationHistory
   * @returns {Object} Enhanced prompt data
   */
  enhanceForTask(userInput, taskType, options = {}) {
    const taskPrompts = {
      explain: 'Provide a clear, detailed explanation. Use examples where helpful.',
      compare:
        'Compare and contrast the items mentioned. Highlight key similarities and differences.',
      summarize: 'Provide a concise summary of the key points.',
      analyze: 'Analyze the topic thoroughly, considering multiple perspectives.',
      code: 'Provide working code with clear comments and explanations.',
      debug: 'Help identify and fix the issue. Explain the root cause.',
      creative: 'Be creative and engaging in your response.',
    }

    const taskHint = taskPrompts[taskType] || ''
    const enhanced = this.enhance(userInput, options)

    if (taskHint && enhanced.messages.length > 0) {
      const sysIdx = enhanced.messages.findIndex((m) => m.role === 'system')
      if (sysIdx >= 0) {
        enhanced.messages[sysIdx].content += `\n\nTask guidance: ${taskHint}`
      }
    }

    enhanced.taskType = taskType
    return enhanced
  }

  /**
   * Detect task type from user input
   * @param {string} input - User input
   * @returns {string|null} Detected task type
   */
  detectTaskType(input) {
    const lower = input.toLowerCase()

    if (/\b(explain|what is|tell me about|describe)\b/.test(lower)) {
      return 'explain'
    }
    if (/\b(compare|versus|vs|difference|differ)\b/.test(lower)) {
      return 'compare'
    }
    if (/\b(summarize|summary|tldr|brief)\b/.test(lower)) {
      return 'summarize'
    }
    if (/\b(analyze|analysis|evaluate|assess)\b/.test(lower)) {
      return 'analyze'
    }
    if (/\b(code|function|implement|write.*program)\b/.test(lower)) {
      return 'code'
    }
    if (/\b(debug|fix|error|bug|issue|problem)\b/.test(lower)) {
      return 'debug'
    }
    if (/\b(creative|story|poem|imagine)\b/.test(lower)) {
      return 'creative'
    }

    return null
  }

  /**
   * Auto-enhance with task detection
   * @param {string} userInput - User's message
   * @param {Object} options - Options including conversationHistory
   * @returns {Object} Enhanced prompt data
   */
  autoEnhance(userInput, options = {}) {
    const taskType = this.detectTaskType(userInput)
    if (taskType) {
      return this.enhanceForTask(userInput, taskType, options)
    }
    return this.enhance(userInput, options)
  }

  /**
   * Set custom system prompt
   * @param {string} prompt - New system prompt
   */
  setSystemPrompt(prompt) {
    this.systemPromptTemplate = prompt
  }

  /**
   * Get the current system prompt (with tool definitions)
   * @returns {string}
   */
  getSystemPrompt() {
    let systemPrompt = this.systemPromptTemplate

    // Add tool definitions
    if (this.includeTools) {
      systemPrompt += '\n\n' + TOOL_DEFINITIONS
    }

    return systemPrompt
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      includeStyle: this.includeStyle,
      includeTopics: this.includeTopics,
      includeConcepts: this.includeConcepts,
      maxContextLength: this.maxContextLength,
    }
  }
}

module.exports = { PromptEnhancer }
