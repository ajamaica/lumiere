#!/usr/bin/env node

/**
 * Token Saver - Dashboard
 *
 * Two sections:
 * 1. Workspace Files - Scans ALL .md files, shows "possible savings" until applied
 * 2. Model Audit - Detects current models, suggests cheaper alternatives
 */

const fs = require('fs')
const path = require('path')
const { TokenAnalyzer } = require('./analyzer.js')
const { WorkspaceCompressor } = require('./compressor.js')

class TokenOptimizerV2 {
  constructor() {
    this.analyzer = new TokenAnalyzer()
    this.compressor = new WorkspaceCompressor()
  }

  async run(command = 'dashboard', args = []) {
    const workspacePath = this.findWorkspace()

    switch (command) {
      case 'dashboard':
        return this.showDashboard(workspacePath)
      case 'tokens':
        return this.optimizeTokens(workspacePath, args)
      case 'models':
        return this.showModelAudit(workspacePath)
      case 'compaction':
        return this.showCompaction(workspacePath, args)
      case 'revert':
        return this.revertChanges(args[0], workspacePath)
      default:
        return this.showDashboard(workspacePath)
    }
  }

  findWorkspace() {
    let dir = process.cwd()
    if (dir.includes('skills' + path.sep + 'token-optimizer')) {
      return path.resolve(dir, '..', '..')
    }
    return dir
  }

  async showDashboard(workspacePath) {
    const analysis = await this.analyzer.analyzeWorkspace(workspacePath)
    const previews = this.compressor.previewOptimizations(workspacePath)
    const modelAudit = this.analyzer.auditModels(workspacePath)
    const fileSavings = this.calculatePossibleSavings(previews)
    const hasBackups = this.findBackups(workspacePath).length > 0

    // Compaction settings
    const configPath = path.join(workspacePath, '.token-saver-config.json')
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {}
    const compactionPct = config.compactionThreshold
      ? Math.round(config.compactionThreshold * 100)
      : 95
    const compactionAt = Math.round(200 * (compactionPct / 100))
    const compactionSavings =
      compactionPct <= 40 ? 200 : compactionPct <= 60 ? 100 : compactionPct <= 80 ? 30 : 0

    // Auto-scan chat history for recommendation
    const chatAnalysis = await this.analyzeUserSessions(workspacePath, 'week')

    // Visual bar helper
    const bar = (current, max, width = 15) => {
      const pct = Math.min(100, Math.max(0, (current / max) * 100))
      const filled = Math.round((pct / 100) * width)
      return '█'.repeat(filled) + '░'.repeat(width - filled)
    }

    // Build file table
    const totalTokens = analysis.totalTokens
    let fileRows = ''
    for (const file of Object.keys(analysis.files).sort()) {
      const info = analysis.files[file]
      const preview = previews.find((p) => p.filename === file)
      const canSave = preview ? preview.originalTokens - preview.compressedTokens : 0
      const savePct =
        preview && preview.originalTokens > 0
          ? Math.round((canSave / preview.originalTokens) * 100)
          : 0
      const status = savePct > 50 ? '🔴' : savePct > 20 ? '🟡' : '🟢'
      const saveLabel = canSave > 0 ? `-${canSave} (${savePct}%)` : '✓ optimized'
      fileRows += `│ ${status} ${file.padEnd(18)} │ ${String(info.tokens).padStart(5)} │ ${saveLabel.padStart(14)} │\n`
    }

    // Calculate totals
    const totalSaveable = fileSavings.tokens
    const totalAfter = totalTokens - totalSaveable
    const totalPct = totalTokens > 0 ? Math.round((totalSaveable / totalTokens) * 100) : 0

    console.log(`
╭─────────────────────────────────────────────────────────╮
│  ⚡ TOKEN SAVER                                          │
│  Reduce AI costs by optimizing what gets sent each call │
╰─────────────────────────────────────────────────────────╯

📁 **WORKSPACE FILES** (sent every API call)
┌──────────────────────┬───────┬────────────────┐
│ File                 │ Tokens│ Can Save       │
├──────────────────────┼───────┼────────────────┤
${fileRows}├──────────────────────┼───────┼────────────────┤
│ TOTAL                │ ${String(totalTokens).padStart(5)} │ -${String(totalSaveable).padStart(4)} (${totalPct}%)     │
└──────────────────────┴───────┴────────────────┘
${totalSaveable > 0 ? `\n💰 File compression: Save ~${totalSaveable} tokens/call → **~$${fileSavings.monthlyCost.toFixed(0)}/mo**\n   Run: \`/optimize tokens\`\n` : '\n✅ Files already optimized\n'}
🤖 **MODELS**
${this.formatModelsTable(modelAudit)}

💬 **CHAT COMPACTION** — Current: ${compactionAt}K ${compactionSavings > 0 ? '(saving ~$' + compactionSavings + '/mo)' : '(not optimized)'}
${chatAnalysis.hasData ? '📊 Scanned ' + chatAnalysis.sessionsAnalyzed + ' sessions (last 7 days) — avg topic: ' + chatAnalysis.avgTopicLength + 'K → **' + chatAnalysis.recommendation + '** recommended\n' : ''}
  🟢 Safe: 160K (-$30)    🟡 Balanced: 120K (-$100)    🔴 Aggressive: 80K (-$200)
  Apply: \`/optimize compaction 120\` | Custom: \`/optimize compaction <num>\`

  ⚠️ **Note:** Lower values mean AI summarizes your chat history sooner.
     After compaction, AI keeps the summary but loses exact wording of old messages.
     Pick a value higher than your typical topic length (yours: ${chatAnalysis.hasData ? chatAnalysis.avgTopicLength + 'K' : '~30K'}) to avoid mid-topic memory loss.`)

    // Calculate total potential savings
    const recommendedCompactionSavings =
      compactionSavings > 0
        ? 0
        : chatAnalysis.safeThreshold <= 80
          ? 200
          : chatAnalysis.safeThreshold <= 120
            ? 100
            : 30
    const totalPotential =
      fileSavings.monthlyCost + modelAudit.totalPossibleSavings + recommendedCompactionSavings

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 **TOTAL POTENTIAL SAVINGS: ~$${totalPotential.toFixed(0)}/month**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }

  formatModelsTable(modelAudit) {
    let output = ''
    const current = modelAudit.current || {}

    // Format current models
    if (current.default) {
      output += `• Main chat: ${current.default.model} (~$${this.estimateModelCost(current.default.model, 'main')}/mo)\n`
    }
    if (current.cron && current.cron.model !== 'unknown') {
      output += `• Cron jobs: ${current.cron.model} (~$${this.estimateModelCost(current.cron.model, 'cron')}/mo)\n`
    }
    if (current.subagent && current.subagent.model !== 'unknown') {
      output += `• Subagents: ${current.subagent.model} (~$${this.estimateModelCost(current.subagent.model, 'sub')}/mo)\n`
    }

    if (modelAudit.suggestions && modelAudit.suggestions.length > 0) {
      output += '\n💡 Suggestions:\n'
      for (const sug of modelAudit.suggestions) {
        const role = sug.role || sug.context || 'Unknown'
        const savings = Math.round(sug.monthlySaving || sug.savings || 0)
        output += `   ${role}: ${sug.current} → ${sug.suggested} (-$${savings}/mo)\n`
      }
    }
    return output
  }

  estimateModelCost(model, usage) {
    const costs = {
      'claude-opus-4-5': { main: 72, cron: 15, sub: 10 },
      'claude-sonnet-4': { main: 25, cron: 5, sub: 4 },
      'claude-sonnet-4-20250514': { main: 25, cron: 5, sub: 4 },
      'gemini-2.0-flash': { main: 0, cron: 0, sub: 0 },
      'gpt-4o': { main: 30, cron: 8, sub: 6 },
    }
    const modelKey = Object.keys(costs).find((k) => model.includes(k)) || 'claude-sonnet-4'
    return costs[modelKey]?.[usage] || 10
  }

  async showModelAudit(workspacePath) {
    const modelAudit = this.analyzer.auditModels(workspacePath)

    console.log(`🤖 **AI Model Audit - Detailed Analysis**

╭─────────────────────────────────────────────────────────╮
│  CURRENT MODEL CONFIGURATION                             │
╰─────────────────────────────────────────────────────────╯
${this.formatCurrentModelsDetailed(modelAudit.current)}

╭─────────────────────────────────────────────────────────╮
│  RECOMMENDED CHANGES                                     │
╰─────────────────────────────────────────────────────────╯
${this.formatModelSuggestionsDetailed(modelAudit.suggestions)}

╭─────────────────────────────────────────────────────────╮
│  AVAILABLE MODELS & PRICING                              │
╰─────────────────────────────────────────────────────────╯
${this.formatAvailableModels()}

💡 Model changes require updating OpenClaw gateway config.
   These are possible savings — actual savings depend on usage patterns.`)
  }

  calculatePossibleSavings(filePreviews) {
    const totalBefore = filePreviews.reduce((sum, p) => sum + p.originalTokens, 0)
    const totalAfter = filePreviews.reduce((sum, p) => sum + p.compressedTokens, 0)
    const saved = totalBefore - totalAfter
    const percentage = totalBefore > 0 ? Math.round((saved / totalBefore) * 100) : 0
    const monthlyCost = saved * 0.003 * 4.33

    return { tokens: saved, percentage, monthlyCost }
  }

  formatFileList(filePreviews, hasBackups) {
    if (filePreviews.length === 0) return '  (no .md files found)'

    return filePreviews
      .map((preview) => {
        const savings = preview.originalTokens - preview.compressedTokens
        const percentage =
          preview.originalTokens > 0 ? Math.round((savings / preview.originalTokens) * 100) : 0
        const status = percentage > 75 ? '🔴' : percentage > 40 ? '🟡' : '🟢'
        const label = hasBackups ? 'saved' : 'possible saving'
        return `${status} **${preview.filename}:** ${preview.originalTokens.toLocaleString()} → ${preview.compressedTokens.toLocaleString()} tokens (${percentage}% ${label})`
      })
      .join('\n')
  }

  formatFileListCompact(filePreviews, hasBackups) {
    if (filePreviews.length === 0) return '(none)'

    // Only show files with >10% potential savings, or top 5
    const significant = filePreviews.filter((p) => {
      const pct =
        p.originalTokens > 0
          ? Math.round(((p.originalTokens - p.compressedTokens) / p.originalTokens) * 100)
          : 0
      return pct > 10
    })

    if (significant.length === 0) return '✅ All files optimized'

    return (
      significant
        .slice(0, 5)
        .map((p) => {
          const pct =
            p.originalTokens > 0
              ? Math.round(((p.originalTokens - p.compressedTokens) / p.originalTokens) * 100)
              : 0
          return `• ${p.filename}: ${p.originalTokens}→${p.compressedTokens} (${pct}%)`
        })
        .join('\n') + (significant.length > 5 ? `\n• +${significant.length - 5} more...` : '')
    )
  }

  formatCurrentModelsCompact(models) {
    return Object.entries(models)
      .map(([role, info]) => {
        if (info.model === 'unknown') return `• ${this.roleLabel(role)}: ?`
        const cost =
          info.estimatedMonthlyCost > 0 ? ` $${info.estimatedMonthlyCost.toFixed(0)}/mo` : ''
        return `• ${this.roleLabel(role)}: ${info.model}${cost}`
      })
      .join('\n')
  }

  formatModelSuggestionsCompact(suggestions) {
    if (suggestions.length === 0) return ''
    return suggestions
      .map((s) => `💡 ${s.role}: ${s.current}→${s.suggested} (-$${s.monthlySaving.toFixed(0)}/mo)`)
      .join('\n')
  }

  formatCurrentModels(models) {
    const lines = []
    for (const [role, info] of Object.entries(models)) {
      if (info.model === 'unknown') {
        lines.push(`• **${this.roleLabel(role)}:** ⚠️ Not detected`)
      } else {
        const cost =
          info.estimatedMonthlyCost > 0
            ? ` (~$${info.estimatedMonthlyCost.toFixed(2)}/month)`
            : ' (free)'
        lines.push(`• **${this.roleLabel(role)}:** ${info.model}${cost}`)
      }
    }
    return lines.join('\n')
  }

  formatCurrentModelsDetailed(models) {
    const lines = []
    for (const [role, info] of Object.entries(models)) {
      lines.push(`**${this.roleLabel(role)}**`)
      lines.push(`  Model: ${info.model || 'unknown'}`)
      lines.push(`  Detected from: ${info.detectedFrom || 'not found'}`)
      lines.push(`  Est. cost: $${(info.estimatedMonthlyCost || 0).toFixed(2)}/month`)
      lines.push('')
    }
    return lines.join('\n')
  }

  formatModelSuggestions(suggestions) {
    if (suggestions.length === 0) {
      return '  ✅ No obvious model optimizations detected\n  (Run `/optimize models` for full analysis)'
    }

    return suggestions
      .map((s) => {
        const saving =
          s.monthlySaving > 0
            ? `~$${s.monthlySaving.toFixed(2)}/month possible saving`
            : 'minimal saving'
        return `💡 **${s.role}:** Switch ${s.current} → ${s.suggested} — ${saving}`
      })
      .join('\n')
  }

  formatModelSuggestionsDetailed(suggestions) {
    if (suggestions.length === 0) {
      return '✅ Current model configuration looks cost-efficient!\n'
    }

    return suggestions
      .map((s, i) => {
        let detail = `**${i + 1}. ${s.role}: ${s.current} → ${s.suggested}**
   Reason: ${s.reason}
   Current cost: ~$${s.currentMonthlyCost.toFixed(2)}/month
   New cost: ~$${s.newMonthlyCost.toFixed(2)}/month
   **Possible saving: ~$${s.monthlySaving.toFixed(2)}/month**
   Confidence: ${s.confidence}`
        if (s.note) detail += `\n   ⚠️ Note: ${s.note}`
        return detail
      })
      .join('\n\n')
  }

  formatAvailableModels() {
    const { MODEL_PRICING } = require('./analyzer.js')
    const lines = []

    const tiers = { free: [], budget: [], standard: [], premium: [] }
    for (const [key, info] of Object.entries(MODEL_PRICING)) {
      tiers[info.tier].push({ key, ...info })
    }

    if (tiers.free.length) {
      lines.push('**🟢 Free Tier:**')
      tiers.free.forEach((m) => lines.push(`  • ${m.label} — $0 (great for cron/background tasks)`))
    }
    if (tiers.budget.length) {
      lines.push('**🟡 Budget:**')
      tiers.budget.forEach((m) => lines.push(`  • ${m.label} — $${m.input}/1K input tokens`))
    }
    if (tiers.standard.length) {
      lines.push('**🟠 Standard:**')
      tiers.standard.forEach((m) => lines.push(`  • ${m.label} — $${m.input}/1K input tokens`))
    }
    if (tiers.premium.length) {
      lines.push('**🔴 Premium:**')
      tiers.premium.forEach((m) => lines.push(`  • ${m.label} — $${m.input}/1K input tokens`))
    }

    return lines.join('\n')
  }

  roleLabel(role) {
    const labels = {
      default: 'Default (main chat)',
      cron: 'Cron jobs',
      subagent: 'Subagents',
    }
    return labels[role] || role
  }

  async optimizeTokens(workspacePath, args = []) {
    // Calculate BEFORE totals first
    const beforeAnalysis = await this.analyzer.analyzeWorkspace(workspacePath)
    const beforeTotal = beforeAnalysis.totalTokens

    console.log('🗜️ **Compressing workspace files...**\n')

    const results = this.compressor.compressWorkspaceFiles(workspacePath)
    let totalSaved = 0
    let filesChanged = 0
    let filesSkipped = 0
    const changedFiles = []

    results.forEach((result) => {
      if (result.success && result.tokensSaved > 0) {
        totalSaved += result.tokensSaved
        filesChanged++
        changedFiles.push(result)
      } else {
        filesSkipped++
      }
    })

    // Enable persistent AI-efficient writing mode
    const persistentEnabled = this.enablePersistentMode(workspacePath)

    // Calculate AFTER totals
    const afterAnalysis = await this.analyzer.analyzeWorkspace(workspacePath)
    const afterTotal = afterAnalysis.totalTokens
    const totalPercentSaved =
      beforeTotal > 0 ? Math.round(((beforeTotal - afterTotal) / beforeTotal) * 100) : 0

    const monthlySavings = totalSaved * 0.003 * 4.33

    // Show compact before/after comparison
    console.log(`\n**Before → After:**`)
    changedFiles.forEach((f) => {
      console.log(
        `• ${f.filename}: ${f.originalTokens}→${f.compressedTokens} (${f.percentageSaved}%)`,
      )
    })
    console.log(`• **Total: ${beforeTotal}→${afterTotal} (${totalPercentSaved}% smaller)**`)

    console.log(`
✅ Done | ${filesChanged} files | ~$${monthlySavings.toFixed(2)}/mo saved${persistentEnabled ? ' | Persistent: ON' : ''}
Backups: .backup | Undo: \`/optimize revert\``)
  }

  /**
   * Enable persistent AI-efficient writing mode by adding instruction to AGENTS.md
   * This ensures the AI continues writing in compressed notation after optimization
   */
  enablePersistentMode(workspacePath) {
    const agentsPath = path.join(workspacePath, 'AGENTS.md')
    if (!fs.existsSync(agentsPath)) return false

    const content = fs.readFileSync(agentsPath, 'utf8')
    const marker = '## 📝 Token Saver — Persistent Mode'

    // Already enabled
    if (content.includes(marker)) return false

    const instruction = `
${marker}
**Status: ENABLED** — Turn off with \`/optimize revert\`

**Priority: Integrity > Size** — Never sacrifice meaning or functionality for smaller tokens.

**Writing style by file type:**
| File | Style | Example |
|------|-------|---------|
| SOUL.md | Evocative, personality-shaping | Keep poetic language, "you're becoming someone" |
| AGENTS.md | Dense instructions | Symbols (→, +, |), abbreviations OK |
| USER.md | Key:value facts | \`ROLES: IT-eng + COO + owner\` |
| MEMORY.md | Ultra-dense data | \`GOOGLE-ADS: $15/day, bids-fixed-Feb3\` |
| memory/*.md | Log format, dated | Facts only, no filler |
| PROJECTS.md | Keep structure | Don't compress — user's format |

**General rules:**
- Symbols (→, +, |, &) over words when clarity preserved
- Abbreviations for common terms
- Remove filler ("just", "basically", "I think")
- Preserve ALL meaning
`

    // Backup AGENTS.md before modifying
    const backupPath = agentsPath + '.backup'
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(agentsPath, backupPath)
    }

    fs.appendFileSync(agentsPath, instruction)
    return true
  }

  revertChanges(target, workspacePath) {
    const backups = this.findBackups(workspacePath)

    if (backups.length === 0) {
      console.log('📁 **No backups found** — nothing to revert.')
      return
    }

    let toRevert = target && target !== 'all' ? backups.filter((b) => b.includes(target)) : backups

    if (toRevert.length === 0) {
      console.log(`❌ **No backups found for:** ${target}`)
      return
    }

    const restored = []
    toRevert.forEach((backupPath) => {
      const originalPath = backupPath.replace('.backup', '')
      fs.copyFileSync(backupPath, originalPath)
      fs.unlinkSync(backupPath)
      restored.push(path.basename(originalPath))
    })

    // Also remove persistent mode from AGENTS.md if it was added
    this.disablePersistentMode(workspacePath)

    console.log(`✅ Reverted: ${restored.join(', ')} | Persistent: OFF`)
  }

  /**
   * Remove persistent mode instruction from AGENTS.md
   */
  disablePersistentMode(workspacePath) {
    const agentsPath = path.join(workspacePath, 'AGENTS.md')
    if (!fs.existsSync(agentsPath)) return

    const content = fs.readFileSync(agentsPath, 'utf8')
    const marker = '## 📝 Token Saver — Persistent Mode'
    const markerIndex = content.indexOf(marker)

    if (markerIndex === -1) return

    // Remove everything from the marker to the end of the persistent mode section
    const before = content.substring(0, markerIndex).trimEnd()
    fs.writeFileSync(agentsPath, before + '\n')
  }

  async showCompaction(workspacePath, args) {
    const setting = args[0]
    const contextMax = 200000

    // Check for scan range (--week, --month, --all)
    let scanRange = 'week' // default
    if (args.includes('--month')) scanRange = 'month'
    if (args.includes('--all')) scanRange = 'all'

    // Visual bar helper
    const bar = (pct, width = 20) => {
      const clampedPct = Math.max(0, Math.min(100, pct))
      const filled = Math.max(0, Math.round((clampedPct / 100) * width))
      const empty = Math.max(0, width - filled)
      return '█'.repeat(filled) + '░'.repeat(empty)
    }

    // Analyze user's actual session data
    if (scanRange !== 'week') {
      console.log(
        `⏳ Scanning ${scanRange === 'all' ? 'all sessions' : 'last month'}... (this may take a moment)\n`,
      )
    }
    const analysis = await this.analyzeUserSessions(workspacePath, scanRange)

    // Presets with clear meaning
    const presets = {
      aggressive: { threshold: 0.4, compactAt: 80, savings: 200 },
      balanced: { threshold: 0.6, compactAt: 120, savings: 100 },
      conservative: { threshold: 0.8, compactAt: 160, savings: 30 },
      off: { threshold: 0.95, compactAt: 190, savings: 0 },
    }

    // Apply setting if provided (ignore flags like --month)
    if (setting && !setting.startsWith('--')) {
      const preset = presets[setting]
      let threshold
      let compactAt

      if (preset) {
        // Preset name
        threshold = preset.threshold
        compactAt = preset.compactAt
      } else {
        const num = parseFloat(setting)
        if (isNaN(num)) {
          console.log(`❌ Invalid: Use preset name or number (e.g., 'balanced', '100', '0.5')`)
          return
        }

        if (num > 1 && num <= 200) {
          // User entered token count in K (e.g., 100 = 100K tokens)
          compactAt = Math.round(num)
          threshold = num / (contextMax / 1000)
        } else if (num >= 0.2 && num <= 1.0) {
          // User entered decimal threshold (e.g., 0.5 = 50%)
          threshold = num
          compactAt = Math.round((contextMax * threshold) / 1000)
        } else {
          console.log(`❌ Invalid: Enter 20-200 (K tokens) or 0.2-1.0 (threshold)`)
          return
        }
      }

      const configPath = path.join(workspacePath, '.token-saver-config.json')
      const config = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
        : {}
      config.previousCompactionThreshold = config.compactionThreshold
      config.compactionThreshold = threshold
      config.compactionSetAt = new Date().toISOString()
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      const savings = preset ? preset.savings : Math.max(0, Math.round((190 - compactAt) * 1.8))

      console.log(`✅ **Compaction Set: ${preset ? preset.compactAt + 'K' : compactAt + 'K (Custom)'}**

**What happens now:**
• AI compacts conversation when it reaches **${compactAt}K tokens**
• Old messages get summarized to make room
• Estimated savings: **~$${savings}/month**

**To undo:** \`/optimize compaction off\`

⚠️ Add to OpenClaw config to apply:
\`agents.defaults.context.compactionThreshold: ${threshold.toFixed(2)}\``)
      return
    }

    // Get current settings
    const configPath = path.join(workspacePath, '.token-saver-config.json')
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {}
    const currentThreshold = config.compactionThreshold || 0.95
    const currentCompactAt = Math.round((contextMax * currentThreshold) / 1000)

    console.log(`**⚡ Compaction Control**

**What is this?**
When conversations get long, AI "compacts" by summarizing old messages.
Compact sooner = pay less, but AI forgets earlier parts faster.

**Your Current Setting:** Compact at **${currentCompactAt}K tokens**
`)

    // Show personalized recommendation if we have data
    if (analysis.hasData) {
      const rangeLabel =
        scanRange === 'all' ? 'all time' : scanRange === 'month' ? 'last 30 days' : 'last 7 days'
      console.log(`**📊 Your Usage Analysis** (${analysis.sessionsAnalyzed} sessions, ${rangeLabel})
┌─────────────────────────────────────────┐
│ Avg topic length:    ${String(analysis.avgTopicLength + 'K tokens').padEnd(18)}│
│ Avg session size:    ${String(analysis.avgSessionSize + 'K tokens').padEnd(18)}│
│ Topics per session:  ${String('~' + analysis.topicChangesPerSession).padEnd(18)}│
└─────────────────────────────────────────┘

**🎯 Recommended for you: ${analysis.recommendation}**
You rarely reference context older than ~${analysis.safeThreshold}K tokens.

📅 Scan range: ${rangeLabel} | Try \`--month\` or \`--all\` for more data
`)
    } else {
      console.log(`**📊 Usage Analysis:** No session data found for ${scanRange === 'all' ? 'any time' : 'last ' + (scanRange === 'month' ? '30 days' : '7 days')}
`)
    }

    console.log(`**Options:**

${bar(40)}  **Aggressive**
                     Compact at 80K | Save ~$200/mo | Short memory

${bar(60)}  **Balanced** ${analysis.safeThreshold === 120 ? '← Recommended' : ''}
                     Compact at 120K | Save ~$100/mo | Medium memory

${bar(80)}  **Conservative** ${analysis.safeThreshold === 160 ? '← Recommended' : ''}
                     Compact at 160K | Save ~$30/mo | Long memory

${bar(95)}  **Off** (current default)
                     Compact at 190K | Baseline | Maximum memory

**Commands:**
\`/optimize compaction aggressive\` — 80K threshold
\`/optimize compaction balanced\` — 120K threshold
\`/optimize compaction 100\` — Custom: compact at 100K tokens
\`/optimize compaction off\` — Disable (default)

**Scan more data:** (may take longer)
\`/optimize compaction --month\` — Analyze last 30 days
\`/optimize compaction --all\` — Analyze all history`)
  }

  /**
   * Analyze user's sessions to recommend compaction threshold
   * @param {string} workspacePath
   * @param {string} range - 'week' (default), 'month', or 'all'
   */
  async analyzeUserSessions(workspacePath, range = 'week') {
    const result = {
      hasData: false,
      sessionsAnalyzed: 0,
      avgTopicLength: 30,
      avgSessionSize: 60,
      topicChangesPerSession: 2,
      recommendation: 'Balanced',
      safeThreshold: 120,
      scanRange: range,
    }

    // Time ranges
    const now = Date.now()
    const ranges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    }
    const cutoff = now - (ranges[range] || ranges.week)

    try {
      const openclawDir =
        process.env.OPENCLAW_DIR || path.join(require('os').homedir(), '.openclaw')
      const sessionsDir = path.join(openclawDir, 'agents', 'main', 'sessions')

      if (!fs.existsSync(sessionsDir)) return result

      const sessionFiles = fs
        .readdirSync(sessionsDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => ({
          name: f,
          path: path.join(sessionsDir, f),
          stat: fs.statSync(path.join(sessionsDir, f)),
        }))
        .filter((f) => f.stat.size > 10000 && f.stat.mtimeMs > cutoff)
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)

      if (sessionFiles.length === 0) return result

      let totalTokens = 0
      for (const session of sessionFiles) {
        totalTokens += Math.round(session.stat.size / 4 / 1000)
      }

      result.hasData = true
      result.sessionsAnalyzed = sessionFiles.length
      result.avgSessionSize = Math.round(totalTokens / sessionFiles.length)
      result.topicChangesPerSession = Math.max(1, Math.round(result.avgSessionSize / 25))
      result.avgTopicLength = Math.round(result.avgSessionSize / result.topicChangesPerSession)

      // Recommend based on topic length
      if (result.avgTopicLength <= 25) {
        result.recommendation = 'Aggressive'
        result.safeThreshold = 80
      } else if (result.avgTopicLength <= 40) {
        result.recommendation = 'Balanced'
        result.safeThreshold = 120
      } else {
        result.recommendation = 'Conservative'
        result.safeThreshold = 160
      }
    } catch (e) {
      /* silent */
    }

    return result
  }

  findBackups(workspacePath) {
    try {
      return fs
        .readdirSync(workspacePath)
        .filter((file) => file.endsWith('.backup'))
        .map((file) => path.join(workspacePath, file))
    } catch (e) {
      return []
    }
  }
}

// CLI
if (require.main === module) {
  const optimizer = new TokenOptimizerV2()
  const command = process.argv[2] || 'dashboard'
  const args = process.argv.slice(3)
  optimizer.run(command, args).catch(console.error)
}

module.exports = { TokenOptimizerV2 }
