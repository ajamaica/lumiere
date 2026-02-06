/**
 * Git Sense - Version Control Awareness
 *
 * Awareness of repository state and history:
 * - Current branch
 * - Modified/staged/untracked files
 * - Recent commits
 * - Remote status
 */

const { Sense } = require('./base')
const { execSync } = require('child_process')
const path = require('path')

class GitSense extends Sense {
  constructor(options = {}) {
    super({ name: 'git', ...options })
    this.focus = options.focus || process.cwd()
    this.refreshRate = 15000 // 15 seconds
  }

  /**
   * Execute git command safely
   */
  git(command) {
    try {
      return execSync(`git ${command}`, {
        cwd: this.focus,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      }).trim()
    } catch (error) {
      return null
    }
  }

  /**
   * Check if directory is a git repo
   */
  isGitRepo() {
    return this.git('rev-parse --is-inside-work-tree') === 'true'
  }

  /**
   * Get current branch
   */
  getBranch() {
    return this.git('branch --show-current') || this.git('rev-parse --short HEAD')
  }

  /**
   * Get status of files
   */
  getStatus() {
    const output = this.git('status --porcelain')
    if (!output) return { staged: [], modified: [], untracked: [], deleted: [] }

    const staged = []
    const modified = []
    const untracked = []
    const deleted = []

    for (const line of output.split('\n')) {
      if (!line) continue

      const index = line[0]
      const worktree = line[1]
      const file = line.slice(3)

      if (index === 'A' || index === 'M' || index === 'R') staged.push(file)
      if (worktree === 'M') modified.push(file)
      if (index === '?' && worktree === '?') untracked.push(file)
      if (index === 'D' || worktree === 'D') deleted.push(file)
    }

    return { staged, modified, untracked, deleted }
  }

  /**
   * Get ahead/behind status
   */
  getRemoteStatus() {
    const upstream = this.git('rev-parse --abbrev-ref @{upstream}')
    if (!upstream) return { hasRemote: false, ahead: 0, behind: 0 }

    const counts = this.git('rev-list --count --left-right @{upstream}...HEAD')
    if (!counts) return { hasRemote: true, ahead: 0, behind: 0 }

    const [behind, ahead] = counts.split('\t').map((n) => parseInt(n) || 0)
    return { hasRemote: true, ahead, behind }
  }

  /**
   * Get recent commits
   */
  getRecentCommits(count = 5) {
    const format = '%h|%s|%ar'
    const output = this.git(`log -${count} --format="${format}"`)
    if (!output) return []

    return output.split('\n').map((line) => {
      const [hash, message, age] = line.split('|')
      return { hash, message: message.slice(0, 50), age }
    })
  }

  /**
   * Get time since last commit
   */
  getLastCommitAge() {
    const timestamp = this.git('log -1 --format=%ct')
    if (!timestamp) return null
    return Date.now() - parseInt(timestamp) * 1000
  }

  async read() {
    if (!this.isGitRepo()) {
      return {
        isRepo: false,
        branch: null,
        status: { staged: [], modified: [], untracked: [], deleted: [] },
        ahead: 0,
        behind: 0,
        hasRemote: false,
        recentCommits: [],
        lastCommitAge: null,
        isDirty: false,
      }
    }

    const branch = this.getBranch()
    const status = this.getStatus()
    const remoteStatus = this.getRemoteStatus()
    const recentCommits = this.getRecentCommits(3)
    const lastCommitAge = this.getLastCommitAge()

    const isDirty =
      status.staged.length > 0 || status.modified.length > 0 || status.deleted.length > 0

    return {
      isRepo: true,
      branch,
      status,
      ahead: remoteStatus.ahead,
      behind: remoteStatus.behind,
      hasRemote: remoteStatus.hasRemote,
      recentCommits,
      lastCommitAge,
      isDirty,
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    if (!reading.isRepo) return 0

    // Dirty state is notable
    if (reading.isDirty) deviation += 0.3

    // Behind remote is notable
    if (reading.behind > 0) deviation += 0.2

    // Long time since commit
    if (reading.lastCommitAge && reading.lastCommitAge > 3600000) {
      deviation += 0.2 // Over an hour
    }

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    if (!reading.isRepo) return anomalies

    if (reading.isDirty && reading.lastCommitAge && reading.lastCommitAge > 7200000) {
      anomalies.push({
        sense: 'git',
        type: 'uncommitted',
        message: `Uncommitted changes for ${Math.floor(reading.lastCommitAge / 3600000)}+ hours`,
        salience: 0.6,
      })
    }

    if (reading.behind > 5) {
      anomalies.push({
        sense: 'git',
        type: 'behind_remote',
        message: `${reading.behind} commits behind remote`,
        salience: 0.5,
      })
    }

    if (reading.status.untracked.length > 10) {
      anomalies.push({
        sense: 'git',
        type: 'many_untracked',
        message: `${reading.status.untracked.length} untracked files`,
        salience: 0.4,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r || !r.isRepo) return '**Git**: not a repository'

    const parts = [`**Git**: ${r.branch}`]

    if (r.ahead > 0 || r.behind > 0) {
      const ahead = r.ahead > 0 ? `+${r.ahead}` : ''
      const behind = r.behind > 0 ? `-${r.behind}` : ''
      parts.push(ahead + behind)
    }

    const changes = []
    if (r.status.modified.length > 0) {
      changes.push(`Modified: ${r.status.modified.slice(0, 2).join(', ')}`)
    }
    if (r.status.staged.length > 0) {
      changes.push(`Staged: ${r.status.staged.slice(0, 2).join(', ')}`)
    }
    if (r.status.untracked.length > 0) {
      changes.push(`${r.status.untracked.length} untracked`)
    }

    if (changes.length > 0) {
      parts.push('|', changes.join(', '))
    } else if (!r.isDirty) {
      parts.push('| clean')
    }

    return parts.join(' ')
  }
}

module.exports = { GitSense }
