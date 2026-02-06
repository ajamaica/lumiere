/**
 * LLM Bridge for File Editor
 *
 * Connects file editing to the active LLM client.
 * Uses the system's configured LLM (Vertex AI, LMStudio, etc.)
 */

const { SYSTEM_PROMPT } = require('./prompts')

// Store reference to active LLM client
let activeLLMClient = null

/**
 * Configure the LLM bridge with an LLM client
 * @param {Object} llmClient - LLM client instance (VertexAI, LMStudio, etc.)
 */
function configureLLMBridge(llmClient) {
  activeLLMClient = llmClient
}

/**
 * Get the currently configured LLM client
 * @returns {Object|null} The active LLM client
 */
function getLLMClient() {
  return activeLLMClient
}

/**
 * Generate edits using the active LLM
 * @param {string} fileName - Name of the file being edited
 * @param {string} fileContent - Content of the file
 * @param {string} userInstruction - What the user wants to change
 * @param {Object} options - Optional settings
 * @returns {Promise<Object>} Edit result with thoughtProcess and edits array
 */
async function generateEdits(fileName, fileContent, userInstruction, options = {}) {
  const llm = options.llmClient || activeLLMClient

  if (!llm) {
    throw new Error(
      'No LLM client configured. Call configureLLMBridge() first or pass llmClient in options.',
    )
  }

  // Construct the prompt with the file context
  const userMessage = `
FILENAME: ${fileName}

FILE CONTENT:
\`\`\`
${fileContent}
\`\`\`

USER INSTRUCTION: 
${userInstruction}
`

  // Build conversation messages
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  try {
    let response

    // Check if the LLM client supports structured output (JSON mode)
    if (typeof llm.complete === 'function') {
      // Simple completion API
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}\n\nRespond with valid JSON only.`
      response = await llm.complete(fullPrompt, {
        temperature: 0.1,
        maxTokens: options.maxTokens || 32768,
      })
    } else if (typeof llm.chat === 'function') {
      // Chat completion API (preferred)
      response = await llm.chat(messages, {
        temperature: 0.1,
        maxTokens: options.maxTokens || 32768,
        responseFormat: { type: 'json_object' },
      })
    } else if (typeof llm.streamChat === 'function') {
      // Streaming API - collect full response
      let fullResponse = ''
      for await (const chunk of llm.streamChat(userMessage, null, {
        conversationHistory: [{ role: 'system', content: SYSTEM_PROMPT }],
        temperature: 0.1,
        maxTokens: options.maxTokens || 32768,
      })) {
        if (typeof chunk === 'string') {
          fullResponse += chunk
        }
      }
      response = fullResponse
    } else {
      throw new Error('LLM client does not support any known completion method')
    }

    // Extract the response content
    const content =
      typeof response === 'string'
        ? response
        : response?.content || response?.message?.content || response

    // Try to parse as JSON
    return parseEditResponse(content)
  } catch (error) {
    // If LLM call fails, return empty edits with error
    return {
      thoughtProcess: `Error generating edits: ${error.message}`,
      edits: [],
      error: error.message,
    }
  }
}

/**
 * Parse the LLM response to extract edits
 * Handles various response formats robustly
 * @param {string} content - Raw LLM response
 * @returns {Object} Parsed result
 */
function parseEditResponse(content) {
  if (!content || typeof content !== 'string') {
    return {
      thoughtProcess: 'Empty response from LLM',
      edits: [],
      error: 'Empty response',
    }
  }

  // Try to extract JSON from the response
  let jsonStr = content.trim()

  // If wrapped in markdown code blocks, extract
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Try to find JSON object in response
  const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonObjMatch) {
    jsonStr = jsonObjMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)

    // Validate structure
    return {
      thoughtProcess: parsed.thoughtProcess || 'No thought process provided',
      edits: Array.isArray(parsed.edits) ? parsed.edits : [],
      raw: parsed,
    }
  } catch (parseError) {
    // Try to salvage what we can
    return {
      thoughtProcess: `Failed to parse response as JSON. Raw response: ${content.slice(0, 200)}...`,
      edits: [],
      error: parseError.message,
      rawResponse: content,
    }
  }
}

/**
 * Generate a single file edit with retries
 * @param {string} fileName - File name
 * @param {string} fileContent - File content
 * @param {string} instruction - Edit instruction
 * @param {Object} options - Options including maxRetries
 * @returns {Promise<Object>} Edit result
 */
async function generateEditsWithRetry(fileName, fileContent, instruction, options = {}) {
  const maxRetries = options.maxRetries || 3
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateEdits(fileName, fileContent, instruction, options)

      // If we got valid edits, return
      if (result.edits && result.edits.length > 0) {
        return result
      }

      // If explicitly no edits needed, return
      if (
        result.thoughtProcess?.toLowerCase().includes('no change') ||
        result.thoughtProcess?.toLowerCase().includes('already')
      ) {
        return result
      }

      lastError = result.error || 'No edits generated'
    } catch (error) {
      lastError = error.message
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return {
    thoughtProcess: `Failed after ${maxRetries} attempts: ${lastError}`,
    edits: [],
    error: lastError,
  }
}

module.exports = {
  configureLLMBridge,
  getLLMClient,
  generateEdits,
  generateEditsWithRetry,
  parseEditResponse,
}
