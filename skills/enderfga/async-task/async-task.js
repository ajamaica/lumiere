#!/usr/bin/env node

/**
 * OpenClaw Async Task - 异步任务执行器
 *
 * 解决 AI 执行耗时任务时的 HTTP 超时问题。
 * 使用 OpenClaw/Clawdbot 原生 sessions API 推送结果，零配置即用。
 */

const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// 状态文件路径
const STATE_DIR =
  process.env.OPENCLAW_STATE_DIR ||
  process.env.CLAWDBOT_STATE_DIR ||
  path.join(process.env.HOME, '.openclaw')
const STATE_FILE = path.join(STATE_DIR, 'async-task-state.json')

// 自定义推送端点（可选，高级用户）
const CUSTOM_PUSH_URL = process.env.ASYNC_TASK_PUSH_URL || ''
const CUSTOM_AUTH_TOKEN = process.env.ASYNC_TASK_AUTH_TOKEN || ''

// 检测 CLI 命令（openclaw 优先，fallback 到 clawdbot）
function getCLI() {
  try {
    execSync('which openclaw', { stdio: 'pipe' })
    return 'openclaw'
  } catch {
    try {
      execSync('which clawdbot', { stdio: 'pipe' })
      return 'clawdbot'
    } catch {
      return null
    }
  }
}

const CLI = getCLI()

// 确保状态目录存在
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true })
  }
}

// 读取状态
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return { currentTask: null, history: [] }
  }
}

// 保存状态
function saveState(state) {
  ensureStateDir()
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// 获取当前活跃 session
function getActiveSession() {
  // 1. 环境变量（向后兼容）
  if (process.env.OPENCLAW_SESSION || process.env.CLAWDBOT_PUSH_SESSION) {
    return process.env.OPENCLAW_SESSION || process.env.CLAWDBOT_PUSH_SESSION
  }

  // 2. 通过 CLI 获取
  if (!CLI) {
    return null
  }

  try {
    const output = execSync(`${CLI} sessions --active 5 --json 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 5000,
    })

    const data = JSON.parse(output)
    if (data.sessions && data.sessions.length > 0) {
      // 返回最近活跃的 session key
      const session = data.sessions[0]
      if (session.key) {
        // 处理不同格式: "webchat:xxx" -> "xxx", "telegram:123" -> keep as is
        const parts = session.key.split(':')
        return parts.length > 1 ? parts.slice(1).join(':') : session.key
      }
    }
  } catch (err) {
    // 静默失败
  }

  return null
}

// 通过 CLI sessions_send 推送（推荐方式）
function pushViaCLI(sessionKey, content) {
  if (!CLI) {
    throw new Error('OpenClaw/Clawdbot CLI not found')
  }

  // 使用 sessions send 命令
  const result = spawnSync(CLI, ['sessions', 'send', '--session', sessionKey, content], {
    encoding: 'utf8',
    timeout: 30000,
  })

  if (result.status !== 0) {
    throw new Error(`CLI push failed: ${result.stderr || result.stdout}`)
  }

  return true
}

// 通过自定义 HTTP 端点推送（高级用户）
async function pushViaHTTP(sessionId, content) {
  if (!CUSTOM_PUSH_URL) {
    throw new Error('No custom push URL configured')
  }

  return new Promise((resolve, reject) => {
    const url = new URL(CUSTOM_PUSH_URL)
    const lib = url.protocol === 'https:' ? https : http

    const data = JSON.stringify({
      sessionId: sessionId,
      content: content,
      role: 'assistant',
    })

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    }

    if (CUSTOM_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${CUSTOM_AUTH_TOKEN}`
    }

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: headers,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`))
          }
        })
      },
    )

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// 推送消息（自动选择方式）
async function pushMessage(sessionId, content) {
  // 优先使用自定义 HTTP 端点（如果配置了）
  if (CUSTOM_PUSH_URL) {
    return pushViaHTTP(sessionId, content)
  }

  // 否则使用 CLI
  return pushViaCLI(sessionId, content)
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const message = args.slice(1).join(' ')

  const state = loadState()

  switch (command) {
    case 'start': {
      if (!message) {
        console.error('Usage: async-task start "<task description>"')
        process.exit(1)
      }

      const sessionId = getActiveSession()

      state.currentTask = {
        description: message,
        startedAt: new Date().toISOString(),
        sessionId: sessionId,
      }
      saveState(state)

      // 输出确认消息
      console.log(`⏳ ${message}`)
      console.log('\n[Task started. Call "async-task done" or "async-task fail" when finished.]')
      break
    }

    case 'done': {
      if (!message) {
        console.error('Usage: async-task done "<result message>"')
        process.exit(1)
      }

      const sessionId = state.currentTask?.sessionId || getActiveSession()

      if (!sessionId) {
        console.error('Error: No session ID. Set OPENCLAW_SESSION or ensure CLI is available.')
        process.exit(1)
      }

      try {
        await pushMessage(sessionId, `✅ ${message}`)
        console.log(`✓ Result pushed to session: ${sessionId}`)

        // 记录历史
        if (state.currentTask) {
          state.history.push({
            ...state.currentTask,
            result: message,
            completedAt: new Date().toISOString(),
            status: 'done',
          })
          // 只保留最近 20 条
          if (state.history.length > 20) {
            state.history = state.history.slice(-20)
          }
        }
        state.currentTask = null
        saveState(state)
      } catch (err) {
        console.error('Push failed:', err.message)
        process.exit(1)
      }
      break
    }

    case 'fail': {
      if (!message) {
        console.error('Usage: async-task fail "<error message>"')
        process.exit(1)
      }

      const sessionId = state.currentTask?.sessionId || getActiveSession()

      if (!sessionId) {
        console.error('Error: No session ID available.')
        process.exit(1)
      }

      try {
        await pushMessage(sessionId, `❌ Task failed: ${message}`)
        console.log(`✓ Failure pushed to session: ${sessionId}`)

        if (state.currentTask) {
          state.history.push({
            ...state.currentTask,
            error: message,
            completedAt: new Date().toISOString(),
            status: 'failed',
          })
          if (state.history.length > 20) {
            state.history = state.history.slice(-20)
          }
        }
        state.currentTask = null
        saveState(state)
      } catch (err) {
        console.error('Push failed:', err.message)
        process.exit(1)
      }
      break
    }

    case 'push': {
      // 直接推送（不需要 start）
      if (!message) {
        console.error('Usage: async-task push "<message>"')
        process.exit(1)
      }

      const sessionId = getActiveSession()

      if (!sessionId) {
        console.error('Error: No session ID available.')
        process.exit(1)
      }

      try {
        await pushMessage(sessionId, message)
        console.log(`✓ Pushed to session: ${sessionId}`)
      } catch (err) {
        console.error('Push failed:', err.message)
        process.exit(1)
      }
      break
    }

    case 'status': {
      if (state.currentTask) {
        console.log('Current task:')
        console.log(`  Description: ${state.currentTask.description}`)
        console.log(`  Started: ${state.currentTask.startedAt}`)
        console.log(`  Session: ${state.currentTask.sessionId || '(unknown)'}`)
      } else {
        console.log('No active task.')
      }

      if (state.history.length > 0) {
        console.log(`\nRecent history (last 5):`)
        state.history.slice(-5).forEach((task, i) => {
          const icon = task.status === 'done' ? '✅' : '❌'
          console.log(`  ${icon} ${task.description}`)
        })
      }
      break
    }

    default:
      console.log(`
async-task - Async Task Executor for OpenClaw/Clawdbot

Solve HTTP timeout issues when AI executes long-running tasks.

Usage:
  async-task start "<description>"  Start task, confirm immediately
  async-task done "<result>"        Complete task, push result
  async-task fail "<error>"         Fail task, push error
  async-task push "<message>"       Push message directly
  async-task status                 Show current task status

Environment Variables (optional):
  OPENCLAW_SESSION          Target session ID (auto-detected if not set)
  ASYNC_TASK_PUSH_URL       Custom HTTP push endpoint
  ASYNC_TASK_AUTH_TOKEN     Auth token for custom endpoint

Examples:
  async-task start "Analyzing large codebase..."
  # ... do work ...
  async-task done "Found 42 TODO comments"
`)
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
