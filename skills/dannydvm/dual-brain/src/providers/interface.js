/**
 * Provider Interface
 *
 * All LLM providers must implement this interface.
 */

class Provider {
  constructor(config) {
    this.config = config
  }

  /**
   * Get a perspective from the LLM
   * @param {string} agentId - The agent requesting perspective
   * @param {string} userMessage - The user's message
   * @param {string} context - Business/memory context (optional)
   * @returns {Promise<string>} - The perspective text (or empty string on failure)
   */
  async getPerspective(agentId, userMessage, context = '') {
    throw new Error('getPerspective must be implemented by provider')
  }

  /**
   * Test if the provider is available
   * @returns {Promise<boolean>}
   */
  async test() {
    throw new Error('test must be implemented by provider')
  }
}

module.exports = Provider
