#!/usr/bin/env node

/**
 * Context Optimization Script
 * Summarizes conversation context and cleans up old messages
 */

const fs = require('fs')
const path = require('path')

class ContextOptimizer {
  constructor(
    workspaceDir = '/home/blackworm/.openclaw/workspace',
    configFile = 'task_processing_config.json',
  ) {
    this.workspaceDir = workspaceDir
    this.configFile = path.join(this.workspaceDir, configFile)
    this.memoryDir = path.join(this.workspaceDir, 'memory')

    // Load configuration
    this.config = this.loadConfig()

    // Ensure memory directory exists
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true })
    }
  }

  /**
   * Loads configuration from task_processing_config.json
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configContent = fs.readFileSync(this.configFile, 'utf8')
        return JSON.parse(configContent).context_optimization
      } else {
        // Return default configuration if file doesn't exist
        return {
          enabled: true,
          schedule: {
            enabled: true,
            interval_minutes: 60,
            max_context_length: 50,
            min_messages_for_optimization: 30,
          },
          summarization: {
            max_bullet_points: 20,
            include_facts: true,
            preserve_important_info: true,
          },
          storage: {
            summary_file_pattern: 'context-summary-YYYY-MM-DD.md',
            memory_file: 'MEMORY.md',
            backup_enabled: true,
          },
          cleanup: {
            remove_old_context: true,
            keep_recent_messages: 10,
            auto_purge: true,
          },
          output_optimization: {
            prevent_overflow: true,
            token_saving_mode: true,
            result_summarization: true,
          },
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      // Return default config if there's an error
      return {
        enabled: true,
        schedule: {
          enabled: true,
          interval_minutes: 60,
          max_context_length: 50,
          min_messages_for_optimization: 30,
        },
        summarization: {
          max_bullet_points: 20,
          include_facts: true,
          preserve_important_info: true,
        },
        storage: {
          summary_file_pattern: 'context-summary-YYYY-MM-DD.md',
          memory_file: 'MEMORY.md',
          backup_enabled: true,
        },
        cleanup: {
          remove_old_context: true,
          keep_recent_messages: 10,
          auto_purge: true,
        },
        output_optimization: {
          prevent_overflow: true,
          token_saving_mode: true,
          result_summarization: true,
        },
      }
    }
  }

  /**
   * Summarizes the conversation context
   * @param {Array} messages - Array of conversation messages
   * @returns {Object} Summary with bullet points and facts
   */
  summarizeContext(messages) {
    // Filter out system messages and focus on meaningful conversation
    const conversationMessages = messages.filter(
      (msg) =>
        msg.role !== 'system' &&
        !msg.content.includes('HEARTBEAT_OK') &&
        !msg.content.startsWith('✅ New session started'),
    )

    // Check if we have enough messages to warrant optimization
    if (conversationMessages.length < this.config.schedule.min_messages_for_optimization) {
      return {
        bulletPoints: [],
        factsToRemember: [],
        totalMessages: messages.length,
        conversationLength: conversationMessages.length,
        optimized: false,
        reason: `Not enough messages (${conversationMessages.length}) to warrant optimization (min: ${this.config.schedule.min_messages_for_optimization})`,
      }
    }

    // Extract key points from the conversation
    const keyPoints = []
    const factsToRemember = []

    // Analyze messages to extract important information
    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i]

      if (msg.role === 'user' || msg.role === 'assistant') {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)

        // Look for important user requests, decisions, or information
        if (this.containsImportantInfo(content)) {
          keyPoints.push(this.extractKeyPoint(content))
        }

        // Extract facts that should be remembered
        const extractedFacts = this.extractFacts(content)
        factsToRemember.push(...extractedFacts)
      }
    }

    // Limit to configured maximum bullet points
    const limitedPoints = keyPoints.slice(0, this.config.summarization.max_bullet_points)

    return {
      bulletPoints: limitedPoints,
      factsToRemember: [...new Set(factsToRemember)], // Remove duplicates
      totalMessages: messages.length,
      conversationLength: conversationMessages.length,
      optimized: true,
    }
  }

  /**
   * Checks if message contains important information worth remembering
   */
  containsImportantInfo(content) {
    const importantPatterns = [
      /remember/i,
      /important/i,
      /fact/i,
      /decision/i,
      /should know/i,
      /need to know/i,
      /recall/i,
      /save/i,
      /store/i,
      /keep track/i,
      /note/i,
      /record/i,
      /plan/i,
      /schedule/i,
      /preference/i,
      /previously/i,
      /preference/i,
      /like/i,
      /dislike/i,
      /want/i,
      /need/i,
      /don't forget/i,
      /remind/i,
      /todo/i,
      /task/i,
      /goal/i,
      /objective/i,
    ]

    return importantPatterns.some((pattern) => pattern.test(content))
  }

  /**
   * Extracts a key point from content
   */
  extractKeyPoint(content) {
    // Simple extraction - take first 100 characters and clean up
    let point = content.trim().substring(0, 100)
    if (content.length > 100) point += '...'
    return point
  }

  /**
   * Extracts facts from content
   */
  extractFacts(content) {
    const factPatterns = [
      /([A-Za-z\s]+)\sis\s([^.!?]+)/gi,
      /([A-Za-z\s]+)\sare\s([^.!?]+)/gi,
      /([A-Za-z\s]+)\shas\s([^.!?]+)/gi,
      /([A-Za-z\s]+)\shave\s([^.!?]+)/gi,
      /I\s(am|like|prefer|want|need)\s([^.!?]+)/gi,
      /My\s(name|preference|habit|schedule)\s(is|are)\s([^.!?]+)/gi,
      /([A-Za-z\s]+)\swas\s([^.!?]+)/gi,
      /([A-Za-z\s]+)\swere\s([^.!?]+)/gi,
    ]

    const facts = []
    factPatterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        facts.push(match[0].trim())
      }
    })

    return facts
  }

  /**
   * Saves summary to memory file
   */
  saveSummary(summary, timestamp = new Date()) {
    const dateStr = timestamp.toISOString().split('T')[0]

    // Use configured pattern for summary file
    const fileName = this.config.storage.summary_file_pattern.replace('YYYY-MM-DD', dateStr)
    const summaryFile = path.join(this.memoryDir, fileName)

    const summaryContent = `# Context Summary - ${timestamp.toISOString()}

## Key Points
${summary.bulletPoints.map((point) => `- ${point}`).join('\n')}

## Facts to Remember
${summary.factsToRemember.map((fact) => `- ${fact}`).join('\n')}

## Stats
- Total messages processed: ${summary.totalMessages}
- Conversation messages: ${summary.conversationLength}
- Generated on: ${timestamp.toString()}
`

    fs.writeFileSync(summaryFile, summaryContent)
    console.log(`Summary saved to: ${summaryFile}`)

    return summaryFile
  }

  /**
   * Updates main MEMORY.md with important facts
   */
  updateMemory(summary) {
    // Use configured memory file
    const memoryFile = path.join(this.workspaceDir, this.config.storage.memory_file)
    let memoryContent = ''

    if (fs.existsSync(memoryFile)) {
      memoryContent = fs.readFileSync(memoryFile, 'utf8')
    }

    // Append new facts to memory
    const newMemoryContent = summary.factsToRemember
      .filter((fact) => !memoryContent.includes(fact))
      .map((fact) => `- ${fact}`)
      .join('\n')

    if (newMemoryContent && this.config.summarization.include_facts) {
      const timestamp = new Date().toISOString()
      const updatedContent =
        memoryContent + `\n\n## Context Optimization - ${timestamp}\n${newMemoryContent}\n`
      fs.writeFileSync(memoryFile, updatedContent)
      console.log(
        `Updated ${this.config.storage.memory_file} with ${summary.factsToRemember.length} new facts`,
      )
    }
  }

  /**
   * Cleans up old context files
   */
  cleanupOldSummaries() {
    // Use configured retention period if available
    const keepDays = 30 // Default value, could be configurable

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - keepDays)

    const summaryFiles = fs
      .readdirSync(this.memoryDir)
      .filter((file) => file.startsWith('context-summary-') && file.endsWith('.md'))

    let cleanedCount = 0
    summaryFiles.forEach((file) => {
      const filePath = path.join(this.memoryDir, file)
      const fileDate = new Date(file.replace('context-summary-', '').replace('.md', ''))

      if (fileDate < cutoffDate) {
        fs.unlinkSync(filePath)
        console.log(`Removed old summary: ${filePath}`)
        cleanedCount++
      }
    })

    return cleanedCount
  }

  /**
   * Clears old context while preserving the summary
   */
  clearOldContext(messages) {
    if (!this.config.cleanup.remove_old_context) {
      return messages // Return original messages if cleanup is disabled
    }

    // Keep only the most recent messages as specified in config
    const keepCount = this.config.cleanup.keep_recent_messages || 10

    if (messages.length <= keepCount) {
      return messages // Don't clear if we don't have enough messages
    }

    // Keep only the most recent messages
    const recentMessages = messages.slice(-keepCount)

    // Add a system message indicating context was optimized
    const optimizationNotice = {
      role: 'system',
      content: `Context optimized: Previous conversation summarized and old messages cleared to maintain performance. Key points and important facts preserved in memory.`,
    }

    return [optimizationNotice, ...recentMessages]
  }

  /**
   * Main optimization function
   */
  optimizeContext(messages) {
    console.log('Starting context optimization...')

    // Summarize the context
    const summary = this.summarizeContext(messages)

    // Only proceed if we have enough messages to warrant optimization
    if (!summary.optimized) {
      console.log(summary.reason)
      return {
        summary,
        summaryFile: null,
        cleanedCount: 0,
        contextCleared: false,
        message: summary.reason,
      }
    }

    // Save summary to memory file
    const summaryFile = this.saveSummary(summary)

    // Update main memory with important facts
    this.updateMemory(summary)

    // Clean up old summaries
    const cleanedCount = this.cleanupOldSummaries()

    // Clear old context while preserving recent messages
    const optimizedMessages = this.clearOldContext(messages)
    const contextCleared = optimizedMessages.length < messages.length

    console.log(`Context optimization completed!`)

    return {
      summary,
      summaryFile,
      cleanedCount,
      contextCleared,
      optimizedMessages,
    }
  }
}

// Export the class for use in other modules
module.exports = ContextOptimizer

// If running as main script, demonstrate usage
if (require.main === module) {
  // Example usage would go here
  console.log('Context Optimizer skill script loaded.')
  console.log('This script provides functionality to summarize and optimize conversation context.')
}
