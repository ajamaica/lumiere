/**
 * Token Analyzer v2 - Workspace files + Model audit
 */

const fs = require('fs')
const path = require('path')

// Model pricing per 1K input tokens (USD)
const MODEL_PRICING = {
  'claude-opus-4': { input: 0.015, output: 0.075, tier: 'premium', label: 'Claude Opus 4' },
  'claude-sonnet-4': { input: 0.003, output: 0.015, tier: 'standard', label: 'Claude Sonnet 4' },
  'claude-haiku-3.5': { input: 0.0008, output: 0.004, tier: 'budget', label: 'Claude Haiku 3.5' },
  'gemini-2.0-flash': {
    input: 0.0,
    output: 0.0,
    tier: 'free',
    label: 'Gemini 2.0 Flash (free tier)',
  },
  'gemini-pro': { input: 0.0, output: 0.0, tier: 'free', label: 'Gemini Pro (free tier)' },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, tier: 'budget', label: 'GPT-4o Mini' },
  'gpt-4o': { input: 0.0025, output: 0.01, tier: 'standard', label: 'GPT-4o' },
  'deepseek-chat': { input: 0.00014, output: 0.00028, tier: 'budget', label: 'DeepSeek V3' },
}

class TokenAnalyzer {
  constructor() {
    // Scan dynamically instead of hardcoding
  }

  /**
   * Discover all .md files in workspace root (the files sent every transaction)
   */
  discoverWorkspaceFiles(workspacePath) {
    const knownContextFiles = [
      'SOUL.md',
      'USER.md',
      'AGENTS.md',
      'MEMORY.md',
      'HEARTBEAT.md',
      'TOOLS.md',
      'IDENTITY.md',
      'PROJECTS.md',
    ]

    const found = []
    try {
      const entries = fs.readdirSync(workspacePath)
      for (const entry of entries) {
        if (entry.endsWith('.md') && !entry.startsWith('.') && !entry.endsWith('.backup')) {
          const filePath = path.join(workspacePath, entry)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            found.push({
              filename: entry,
              isKnownContext: knownContextFiles.includes(entry),
              path: filePath,
            })
          }
        }
      }
    } catch (e) {
      // fallback to known list
      for (const f of knownContextFiles) {
        const fp = path.join(workspacePath, f)
        if (fs.existsSync(fp)) {
          found.push({ filename: f, isKnownContext: true, path: fp })
        }
      }
    }

    return found.sort((a, b) => {
      // Known context files first, then alphabetical
      if (a.isKnownContext !== b.isKnownContext) return b.isKnownContext - a.isKnownContext
      return a.filename.localeCompare(b.filename)
    })
  }

  async analyzeWorkspace(workspacePath) {
    const files = this.discoverWorkspaceFiles(workspacePath)

    const analysis = {
      files: {},
      totalTokens: 0,
      fileList: [],
      monthlyCostEstimate: 0,
    }

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8')
      const tokens = this.estimateTokens(content)

      analysis.files[file.filename] = {
        tokens,
        size: content.length,
        isKnownContext: file.isKnownContext,
      }
      analysis.fileList.push(file.filename)
      analysis.totalTokens += tokens
    }

    // Cost estimate: tokens sent every transaction, assume ~100 transactions/day
    // Using default model pricing
    analysis.monthlyCostEstimate = analysis.totalTokens * 0.003 * 4.33

    return analysis
  }

  /**
   * Estimate current context usage (workspace + system + conversation estimate)
   */
  async estimateCurrentContext() {
    // Base system prompt ~10K, workspace files variable, conversation grows
    // This is a rough estimate - actual depends on session state
    const systemPrompt = 10000
    const workspaceFiles = 2000 // After compression
    const conversationEstimate = 50000 // Typical mid-session

    // Try to get actual from session if available
    try {
      const openclawDir =
        process.env.OPENCLAW_DIR || path.join(require('os').homedir(), '.openclaw')
      const sessionsDir = path.join(openclawDir, 'agents', 'main', 'sessions')

      if (fs.existsSync(sessionsDir)) {
        const sessions = fs
          .readdirSync(sessionsDir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => ({ name: f, stat: fs.statSync(path.join(sessionsDir, f)) }))
          .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)

        if (sessions.length > 0) {
          // Rough estimate: 4 chars per token in JSONL
          const latestSize = sessions[0].stat.size
          return Math.round(latestSize / 4) + systemPrompt + workspaceFiles
        }
      }
    } catch (e) {
      // Fall back to estimate
    }

    return systemPrompt + workspaceFiles + conversationEstimate
  }

  /**
   * Audit current model configuration and suggest alternatives
   */
  auditModels(workspacePath) {
    const config = this.detectCurrentModels(workspacePath)
    const suggestions = this.generateModelSuggestions(config)

    return {
      current: config,
      suggestions,
      totalPossibleSavings: suggestions.reduce((sum, s) => sum + s.monthlySaving, 0),
    }
  }

  /**
   * Detect current model usage from runtime info and config files
   */
  detectCurrentModels(workspacePath) {
    const models = {
      default: { model: 'unknown', usage: 'Main chat / default', detectedFrom: null },
      cron: { model: 'unknown', usage: 'Cron jobs / background tasks', detectedFrom: null },
      subagent: { model: 'unknown', usage: 'Subagent tasks', detectedFrom: null },
    }

    // Check environment for runtime info
    const runtimeModel = process.env.OPENCLAW_MODEL || process.env.DEFAULT_MODEL || null
    if (runtimeModel) {
      models.default.model = runtimeModel
      models.default.detectedFrom = 'environment'
    }

    // Try to read OpenClaw gateway config
    const homedir = process.env.USERPROFILE || process.env.HOME || ''
    const configPaths = [
      path.join(homedir, '.openclaw', 'openclaw.json'),
      path.join(workspacePath, '.openclaw', 'openclaw.json'),
      path.join(workspacePath, '..', '.openclaw', 'openclaw.json'),
    ]

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
          const agentDefaults = config?.agents?.defaults || {}

          // Primary model
          const primary = agentDefaults?.model?.primary
          if (primary) {
            models.default.model = primary.replace('anthropic/', '').replace('google/', '')
            models.default.detectedFrom = 'openclaw.json'
          }

          // Heartbeat/cron model
          const heartbeatModel = agentDefaults?.heartbeat?.model
          if (heartbeatModel) {
            models.cron.model = heartbeatModel.replace('anthropic/', '').replace('google/', '')
            models.cron.detectedFrom = 'openclaw.json'
          }

          // Subagent model
          const subModel = agentDefaults?.subagents?.model
          if (subModel) {
            models.subagent.model = subModel.replace('anthropic/', '').replace('google/', '')
            models.subagent.detectedFrom = 'openclaw.json'
          }
          break
        }
      } catch (e) {
        /* skip */
      }
    }

    // Check MEMORY.md or TOOLS.md for model hints
    const hintFiles = ['MEMORY.md', 'TOOLS.md', 'AGENTS.md']
    for (const hf of hintFiles) {
      const fp = path.join(workspacePath, hf)
      try {
        if (fs.existsSync(fp)) {
          const content = fs.readFileSync(fp, 'utf8').toLowerCase()
          if (content.includes('sonnet') && models.default.model === 'unknown') {
            models.default.model = 'claude-sonnet-4'
            models.default.detectedFrom = hf + ' (inferred)'
          }
          if (
            content.includes('gemini') &&
            content.includes('cron') &&
            models.cron.model === 'unknown'
          ) {
            models.cron.model = 'gemini-pro'
            models.cron.detectedFrom = hf + ' (inferred)'
          }
          if (
            content.includes('opus') &&
            content.includes('subagent') &&
            models.subagent.model === 'unknown'
          ) {
            models.subagent.model = 'claude-opus-4'
            models.subagent.detectedFrom = hf + ' (inferred)'
          }
        }
      } catch (e) {
        /* skip */
      }
    }

    // Estimate monthly cost per role
    const estimateRoleCost = (modelKey, txPerDay) => {
      const pricing = this.findPricing(modelKey)
      if (!pricing) return 0
      // Assume ~2000 tokens per transaction input
      return ((2000 * pricing.input) / 1000) * txPerDay * 30
    }

    models.default.estimatedMonthlyCost = estimateRoleCost(models.default.model, 80)
    models.cron.estimatedMonthlyCost = estimateRoleCost(models.cron.model, 30)
    models.subagent.estimatedMonthlyCost = estimateRoleCost(models.subagent.model, 20)

    return models
  }

  findPricing(modelKey) {
    if (!modelKey || modelKey === 'unknown') return null
    const key = modelKey.toLowerCase()
    // Fuzzy match
    for (const [k, v] of Object.entries(MODEL_PRICING)) {
      if (key.includes(k) || k.includes(key)) return v
    }
    // Partial matches
    if (key.includes('sonnet')) return MODEL_PRICING['claude-sonnet-4']
    if (key.includes('opus')) return MODEL_PRICING['claude-opus-4']
    if (key.includes('haiku')) return MODEL_PRICING['claude-haiku-3.5']
    if (key.includes('gemini')) return MODEL_PRICING['gemini-pro']
    if (key.includes('gpt-4o-mini')) return MODEL_PRICING['gpt-4o-mini']
    if (key.includes('gpt-4o') || key.includes('gpt4o')) return MODEL_PRICING['gpt-4o']
    if (key.includes('deepseek')) return MODEL_PRICING['deepseek-chat']
    return null
  }

  /**
   * Generate model switch suggestions with cost savings
   */
  generateModelSuggestions(currentModels) {
    const suggestions = []

    // Cron job suggestions
    const cronModel = currentModels.cron
    if (cronModel.model !== 'unknown') {
      const cronPricing = this.findPricing(cronModel.model)
      if (cronPricing && cronPricing.tier !== 'free') {
        suggestions.push({
          role: 'Cron Jobs',
          current: cronPricing.label || cronModel.model,
          suggested: 'Gemini 2.0 Flash',
          reason:
            'Background/scheduled tasks rarely need top-tier reasoning. Gemini free tier handles summaries, checks, and monitoring well.',
          currentMonthlyCost: cronModel.estimatedMonthlyCost,
          newMonthlyCost: 0,
          monthlySaving: cronModel.estimatedMonthlyCost,
          confidence: 'high',
        })
      }
    }

    // Subagent suggestions
    const subModel = currentModels.subagent
    if (subModel.model !== 'unknown') {
      const subPricing = this.findPricing(subModel.model)
      if (subPricing && subPricing.tier === 'premium') {
        suggestions.push({
          role: 'Subagents',
          current: subPricing.label || subModel.model,
          suggested: 'Claude Sonnet 4',
          reason:
            'Most subagent tasks (file edits, research, coding) work great on Sonnet. Reserve Opus for complex multi-step reasoning only.',
          currentMonthlyCost: subModel.estimatedMonthlyCost,
          newMonthlyCost: subModel.estimatedMonthlyCost * (0.003 / 0.015),
          monthlySaving: subModel.estimatedMonthlyCost * (1 - 0.003 / 0.015),
          confidence: 'medium',
        })
      }
    }

    // Default model suggestions
    const defModel = currentModels.default
    if (defModel.model !== 'unknown') {
      const defPricing = this.findPricing(defModel.model)
      if (defPricing && defPricing.tier === 'standard') {
        suggestions.push({
          role: 'Simple Queries',
          current: defPricing.label || defModel.model,
          suggested: 'Claude Haiku 3.5',
          reason:
            'For quick lookups, simple Q&A, and low-complexity tasks. ~73% cheaper input tokens.',
          currentMonthlyCost: defModel.estimatedMonthlyCost * 0.3, // assume 30% of queries are simple
          newMonthlyCost: defModel.estimatedMonthlyCost * 0.3 * (0.0008 / 0.003),
          monthlySaving: defModel.estimatedMonthlyCost * 0.3 * (1 - 0.0008 / 0.003),
          confidence: 'low',
          note: 'Requires routing logic to detect simple vs complex queries',
        })
      }
    }

    return suggestions
  }

  estimateTokens(text) {
    return Math.round(text.length / 4)
  }
}

module.exports = { TokenAnalyzer, MODEL_PRICING }
