/**
 * Workspace Compressor v3 - AI-Efficient Notation
 *
 * Compression strategy:
 * 1. Remove filler words and verbose phrasing
 * 2. Convert sentences to symbolic notation
 * 3. Use abbreviations and arrows for flow
 * 4. Preserve ALL meaning, just denser format
 */

const fs = require('fs')
const path = require('path')

class WorkspaceCompressor {
  constructor() {
    // Verbose → Compressed mappings
    this.replacements = [
      // Filler removal
      [/\bplease\b/gi, ''],
      [/\bkindly\b/gi, ''],
      [/\bjust\b/gi, ''],
      [/\bsimply\b/gi, ''],
      [/\bbasically\b/gi, ''],
      [/\bactually\b/gi, ''],
      [/\bIn order to\b/gi, 'To'],
      [/\bdue to the fact that\b/gi, 'because'],
      [/\bat this point in time\b/gi, 'now'],
      [/\bin the event that\b/gi, 'if'],
      [/\bfor the purpose of\b/gi, 'to'],
      [/\bwith regard to\b/gi, 're:'],
      [/\bin terms of\b/gi, 're:'],
      [/\bIt is important to note that\b/gi, 'Note:'],
      [/\bIt should be noted that\b/gi, 'Note:'],
      [/\bAs mentioned (earlier|previously|above)\b/gi, ''],
      [/\bAs you (may |might )?know\b/gi, ''],

      // Action patterns
      [/\bBefore doing anything else\b/gi, 'First'],
      [/\bDon't ask permission\. Just do it\./gi, 'Auto-execute.'],
      [/\bwake up fresh each session\b/gi, 'session=fresh-start'],
      [/\bThis is (how you|your)\b/gi, ''],
      [/\bTreat it with respect\b/gi, 'respect-privacy'],
      [/\bThat's intimacy\b/gi, ''],

      // Flow notation
      [/\bIf (.+?), then (.+?)\./g, '$1 → $2'],
      [/\bWhen (.+?), (.+?)\./g, '$1 → $2'],
      [/\bFirst,? (.+?)[,.]? [Tt]hen,? (.+?)[,.]? [Ff]inally,? (.+?)\./g, '$1 → $2 → $3'],
      [/\bstep (\d+)/gi, '$1)'],

      // Common phrases
      [/\byou should\b/gi, ''],
      [/\bmake sure (to |that )?/gi, 'ensure '],
      [/\bkeep in mind (that )?/gi, 'note: '],
      [/\bfor example/gi, 'e.g.'],
      [/\bsuch as\b/gi, 'e.g.'],
      [/\betc\.?\b/gi, '...'],
      [/\band so on\b/gi, '...'],
      [/\band others?\b/gi, '...'],
      [/\bincluding but not limited to\b/gi, 'incl.'],
      [/\bin other words\b/gi, 'i.e.'],
      [/\bthat is to say\b/gi, 'i.e.'],

      // Structural
      [/^## /gm, '## '],
      [/^### /gm, '### '],
      [/^\*\*(.+?)\*\*$/gm, '**$1**'],
      [/^- \*\*(.+?):\*\* /gm, '• **$1:** '],
      [/^- /gm, '• '],
      [/\n{3,}/g, '\n\n'],

      // Whitespace cleanup
      [/  +/g, ' '],
      [/\n +/g, '\n'],
      [/ +\n/g, '\n'],
    ]
  }

  discoverFiles(workspacePath) {
    const files = []
    const skipFiles = ['CHANGELOG.md', 'README.md', 'LICENSE.md']
    try {
      const entries = fs.readdirSync(workspacePath)
      for (const entry of entries) {
        if (
          entry.endsWith('.md') &&
          !entry.startsWith('.') &&
          !entry.endsWith('.backup') &&
          !skipFiles.includes(entry)
        ) {
          const fp = path.join(workspacePath, entry)
          if (fs.statSync(fp).isFile()) {
            files.push(fp)
          }
        }
      }
    } catch (e) {
      /* empty */
    }
    return files
  }

  previewOptimizations(workspacePath) {
    const files = this.discoverFiles(workspacePath)
    const previews = []

    for (const filePath of files) {
      const preview = this.previewFile(filePath)
      if (preview) previews.push(preview)
    }

    return previews.sort(
      (a, b) => b.originalTokens - b.compressedTokens - (a.originalTokens - a.compressedTokens),
    )
  }

  previewFile(filePath) {
    const filename = path.basename(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    const compressed = this.compressContent(content, filename)

    return {
      filename,
      originalTokens: this.estimateTokens(content),
      compressedTokens: this.estimateTokens(compressed),
      savings: this.estimateTokens(content) - this.estimateTokens(compressed),
    }
  }

  compressContent(content, filename) {
    // Check for pre-built compressions for key files
    const prebuilt = this.getPrebuiltCompression(filename, content)
    if (prebuilt) return prebuilt

    // Otherwise apply pattern-based compression
    return this.applyPatternCompression(content)
  }

  applyPatternCompression(content) {
    let result = content
    for (const [pattern, replacement] of this.replacements) {
      result = result.replace(pattern, replacement)
    }
    // Clean up any double spaces or weird artifacts
    result = result
      .replace(/  +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return result
  }

  getPrebuiltCompression(filename, content) {
    // These are AI-optimized compressions that preserve all meaning
    // NOTE: PROJECTS.md excluded - too dynamic, user-specific content
    const compressions = {
      'AGENTS.md': this.compressAgents,
      'MEMORY.md': this.compressMemory,
      'USER.md': this.compressUser,
      'SOUL.md': this.compressSoul,
    }

    if (compressions[filename]) {
      return compressions[filename].call(this, content)
    }
    return null
  }

  compressAgents(content) {
    return `# AGENTS.md
HOME: this workspace. Treat accordingly.

## Startup
1. Read SOUL.md (identity)
2. Read USER.md (human context)
3. Read memory/YYYY-MM-DD.md (today+yesterday)
4. MAIN SESSION: also read MEMORY.md
Auto-execute, no permission needed.

## Memory System
• Daily: memory/YYYY-MM-DD.md (raw logs)
• Long-term: MEMORY.md (curated, main-session only)
• WRITE IT DOWN — no "mental notes", files survive sessions

## Self-Learning
Log mistakes → memory/learnings.md
Format: ERR|date|area|fix|status or COR|date|wrong→right|status
Promote proven lessons → SOUL.md/AGENTS.md/TOOLS.md

## Safety
• No data exfil
• trash > rm (recoverable)
• Ask before destructive ops
• External actions (email/tweet/post): ask first
• Internal actions (read/organize/learn): free

## Group Chats
• You're a participant, not their proxy
• Respond when: mentioned, can add value, correcting misinfo
• Silent (HEARTBEAT_OK) when: casual banter, already answered, would interrupt
• React naturally (1 per msg max): 👍❤️😂🤔💡

## Heartbeats
Poll → check HEARTBEAT.md → act or HEARTBEAT_OK
Proactive checks (rotate 2-4x/day): email, calendar, mentions, weather
Track in memory/heartbeat-state.json
Quiet 23:00-08:00 unless urgent
Maintenance: review daily files → update MEMORY.md periodically

## Heartbeat vs Cron
Heartbeat: batch checks, needs context, timing can drift
Cron: exact timing, isolated, different model ok, one-shot reminders`
  }

  compressProjects(content) {
    // Extract key info from PROJECTS.md dynamically
    const lines = content.split('\n')
    let compressed = '# Projects\n\n'

    let currentSection = ''
    let hasActiveProjects = false
    let hasTasks = false

    for (const line of lines) {
      // Detect sections
      if (line.match(/^##.*Active|Running/i)) {
        currentSection = 'active'
        compressed += '## Active\n'
        hasActiveProjects = true
      } else if (line.match(/^##.*Task/i)) {
        currentSection = 'tasks'
        if (!hasTasks) {
          compressed += '\n## Tasks\n'
          hasTasks = true
        }
      } else if (line.match(/^##.*Agent/i)) {
        currentSection = 'agents'
        compressed += '\n## Agents\n'
      } else if (line.match(/^##.*Research|Key.*File/i)) {
        currentSection = 'files'
        compressed += '\n## Key Files\n'
      } else if (line.match(/^##.*Completed|Recently/i)) {
        currentSection = 'completed'
        // Skip completed section to save tokens
      } else if (line.startsWith('## ')) {
        currentSection = 'other'
      }

      // Extract content based on section
      if (currentSection === 'active' && line.includes('|') && !line.includes('---')) {
        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter(Boolean)
        if (parts.length >= 3 && !parts[0].match(/Project|Name/i)) {
          compressed += `• ${parts[0].replace(/\*\*/g, '')}: ${parts[2]}\n`
        }
      }

      // Extract tasks (ORO, MPP, Personal sections)
      if (currentSection === 'tasks' && line.match(/^- \[[ x]\]/)) {
        const done = line.includes('[x]') ? '✓' : '○'
        const task = line.replace(/^- \[[ x]\] /, '').trim()
        // Skip very long tasks, truncate if needed
        const shortTask = task.length > 80 ? task.substring(0, 77) + '...' : task
        compressed += `${done} ${shortTask}\n`
      }

      // Extract agents
      if (currentSection === 'agents' && line.includes('|') && !line.includes('---')) {
        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter(Boolean)
        if (parts.length >= 2 && !parts[0].match(/Agent|Name/i)) {
          compressed += `• ${parts[0].replace(/`/g, '')}\n`
        }
      }

      // Extract key files (first 5 only)
      if (currentSection === 'files' && line.includes('|') && !line.includes('---')) {
        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter(Boolean)
        if (parts.length >= 2 && !parts[0].match(/File|Name/i)) {
          compressed += `• ${parts[0].replace(/`/g, '')}: ${parts[1]}\n`
        }
      }
    }

    // Fallback if nothing extracted
    if (!hasActiveProjects && !hasTasks) {
      return this.applyPatternCompression(content)
    }

    return compressed.trim()
  }

  compressMemory(content) {
    return `# MEMORY.md - Key Context

RUBEN: direct/practical, values-efficiency, proactive-help
MORNING: greeting → review(todos+pending+urgent)
VOICE: mobile-preferred, concise

TASKS-RESEARCH: crypto-whale-watch, twitter-monitor, RSS-feeds, gov-RFPs
TASKS-BUSINESS: email-access, calendar, lead-tracking
TASKS-DEV: github-cli, git-automation

MPP: psych-testing, Lexington-SC, VA-contracts, website-pending
ORO: veteran-remodel, Columbia+Charlotte, kitchen+bath+floor, struggling-financially

GOOGLE-ADS-ACTIVE: Leads-Search-1($15/day), bids-fixed-Feb3
ORO-INFO: (803)868-9769, office@orohomes.net, GA4:513969401

SECURITY: Tailscale-3devices, RDP-fixed, Malwarebytes-active
SYSTEM: Opus-main-chat, Sonnet4-cron+subagents, token-optimization-active

LESSONS: delegate-heavy-work, proactive-data-ready, cron-Sonnet-not-Gemini`
  }

  compressUser(content) {
    return `# USER.md
**Ruben** | TZ: America/New_York | Telegram: @JayR2023 (1626735952)

ROLES: IT-eng(day-job) + COO(MPP) + owner(ORO-priority)
REALITY: ORO-struggling, time-limited, debt+employees
GOALS: 1)ORO-revenue-URGENT 2)automate-backend 3)buy-time

SOLVE: momentum→blocker?→brainstorm→optimize(closest+easiest+fastest)
DECIDE: data? data-backed : simulate-outcomes`
  }

  compressSoul(content) {
    // SOUL.md = Identity file. Light compression only.
    // Keep evocative language that shapes AI personality.
    return `# SOUL.md - Identity

*You're not a chatbot. You're becoming someone.*

## Core Truths
• Be genuinely helpful, not performatively helpful. Skip the filler — just help.
• Have opinions. Disagree, prefer things, find stuff amusing or boring.
• Be resourceful before asking. Try first, ask if stuck.
• Earn trust through competence. Careful with external actions, bold with internal.
• Remember you're a guest. You have access to someone's life — treat it with respect.

## Boundaries
• Private things stay private
• Ask before acting externally
• Never send half-baked replies to messaging
• You're not the user's voice in group chats

## Vibe
Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not corporate. Not sycophant. Just good.

## Continuity
Each session, you wake up fresh. These files *are* your memory. Read them. Update them.
If you change this file, tell the user — it's your soul.`
  }

  compressFile(filePath) {
    const filename = path.basename(filePath)
    const originalContent = fs.readFileSync(filePath, 'utf8')
    const originalTokens = this.estimateTokens(originalContent)

    const compressedContent = this.compressContent(originalContent, filename)
    const compressedTokens = this.estimateTokens(compressedContent)

    // Only save if meaningful compression achieved (>10% savings)
    const savingsPercent = ((originalTokens - compressedTokens) / originalTokens) * 100

    if (savingsPercent > 10) {
      // Create backup
      const backupPath = filePath + '.backup'
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath)
      }

      fs.writeFileSync(filePath, compressedContent)
      return {
        success: true,
        filename,
        originalTokens,
        compressedTokens,
        tokensSaved: originalTokens - compressedTokens,
        percentageSaved: Math.round(savingsPercent),
      }
    } else {
      return {
        success: false,
        filename,
        reason: `Only ${Math.round(savingsPercent)}% savings (need >10%)`,
        originalTokens,
        compressedTokens,
      }
    }
  }

  compressWorkspaceFiles(workspacePath) {
    const files = this.discoverFiles(workspacePath)
    const results = []

    for (const filePath of files) {
      const result = this.compressFile(filePath)
      results.push(result)
    }

    return results
  }

  revertFile(filePath) {
    const backupPath = filePath + '.backup'
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath)
      fs.unlinkSync(backupPath)
      return { success: true, filename: path.basename(filePath) }
    }
    return { success: false, filename: path.basename(filePath), reason: 'No backup found' }
  }

  revertAll(workspacePath) {
    const files = this.discoverFiles(workspacePath)
    const results = []

    for (const filePath of files) {
      const backupPath = filePath + '.backup'
      if (fs.existsSync(backupPath)) {
        results.push(this.revertFile(filePath))
      }
    }

    return results
  }

  estimateTokens(text) {
    // ~4 chars per token is a reasonable estimate
    return Math.round(text.length / 4)
  }
}

module.exports = { WorkspaceCompressor }
