/**
 * Configuration for the Autonomous Learning System
 *
 * Central configuration for all learning components including:
 * - Learner timing and limits
 * - Chaperone API settings
 * - Safety filter whitelists
 * - Content ingester settings
 */

const os = require('os')
const path = require('path')

module.exports = {
  // Autonomous Learner settings
  learner: {
    iterationInterval: 15000, // 15 seconds between learning iterations (faster feedback)
    reflectionInterval: 300000, // 5 minutes between reflection cycles
    curiosityThreshold: 0.25, // Minimum curiosity intensity to trigger learning (slightly lower)
    maxIterationsPerSession: 100, // Safety limit per session
    minCuriosityGapDuration: 3000, // Minimum time a gap must persist before acting
  },

  // Chaperone API settings
  chaperone: {
    rateLimit: 10, // Maximum requests per minute
    llmUrl: 'http://localhost:1234/v1', // Chaperone LLM endpoint
    timeout: 30000, // Request timeout in ms
    maxLogEntries: 1000, // Maximum log entries to retain
    maxAnswerTokens: 500, // Max tokens for Q&A responses
    maxSummaryTokens: 300, // Max tokens for summaries
  },

  // Safety Filter settings
  safety: {
    // Allowed domains for web content fetching
    allowedDomains: [
      'arxiv.org',
      'github.com',
      'raw.githubusercontent.com',
      'wikipedia.org',
      'en.wikipedia.org',
      'docs.python.org',
      'developer.mozilla.org',
      'stackoverflow.com',
      'nature.com',
      'sciencedirect.com',
      'semanticscholar.org',
      'huggingface.co',
      'pytorch.org',
      'tensorflow.org',
    ],

    // Allowed protocols (HTTPS only for security)
    allowedProtocols: ['https:'],

    // Allowed MIME types for content
    allowedMimeTypes: [
      'text/plain',
      'text/html',
      'text/markdown',
      'text/x-markdown',
      'application/pdf',
      'application/json',
      'text/csv',
    ],

    // Allowed local filesystem paths (expanded at runtime)
    allowedPaths: [
      path.join(os.homedir(), 'incoming'),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'papers'),
      path.join(os.homedir(), 'Downloads'),
      // Allow reading from the workspace/development directories
      path.join(os.homedir(), 'Development'),
      path.join(os.homedir(), 'Projects'),
      path.join(os.homedir(), 'workspace'),
      // Common workspace paths
      '/workspace',
      process.cwd(),
      // The sentient app's own directory
      path.resolve(__dirname, '../..'),
      path.resolve(__dirname, '../../..'),
    ],

    // Content limits
    maxContentSize: 10 * 1024 * 1024, // 10MB maximum content size
    maxFilesPerSession: 50, // Maximum files per learning session
    maxRequestsPerMinute: 10, // Rate limiting
  },

  // Content Ingester settings
  ingester: {
    maxChunkSize: 2000, // Maximum characters per chunk
    overlapSize: 200, // Overlap between chunks for context
    minChunkSize: 100, // Minimum chunk size to process
  },

  // Query Formulator settings
  query: {
    maxQueryLength: 200, // Maximum query length
    maxContextItems: 5, // Maximum context items to include
  },

  // Reflection Loop settings
  reflector: {
    reflectionDepth: 3, // How far back to look for connections
    minSimilarity: 0.7, // Minimum similarity for connection detection
    maxFollowUps: 3, // Maximum follow-up questions per reflection
  },
}
