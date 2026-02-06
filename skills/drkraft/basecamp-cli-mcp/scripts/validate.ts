#!/usr/bin/env bun
/**
 * Manual Validation Script for Basecamp CLI
 *
 * This script runs through all CLI commands against a real Basecamp account
 * to verify everything works correctly before release.
 *
 * Prerequisites:
 * - BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET environment variables set
 * - Authenticated via `basecamp auth login`
 * - At least one project in Basecamp with todos, messages, etc.
 *
 * Usage:
 *   bun run scripts/validate.ts
 *   bun run scripts/validate.ts --project <PROJECT_ID>
 */

import { execSync } from 'child_process'

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

interface TestResult {
  name: string
  command: string
  passed: boolean
  output?: string
  error?: string
}

const results: TestResult[] = []

function log(color: string, prefix: string, message: string): void {
  console.log(`${color}${prefix}${COLORS.reset} ${message}`)
}

function run(name: string, command: string): TestResult {
  log(COLORS.blue, '[RUN]', `${name}: ${COLORS.gray}${command}`)
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    log(COLORS.green, '[PASS]', name)
    return { name, command, passed: true, output: output.trim() }
  } catch (error) {
    const err = error as { stderr?: Buffer; message?: string }
    const errorMsg = err.stderr?.toString() || err.message || 'Unknown error'
    log(COLORS.red, '[FAIL]', `${name}: ${errorMsg.slice(0, 100)}`)
    return { name, command, passed: false, error: errorMsg }
  }
}

function section(title: string): void {
  console.log(`\n${COLORS.yellow}=== ${title} ===${COLORS.reset}\n`)
}

async function main(): Promise<void> {
  console.log(`${COLORS.blue}
╔══════════════════════════════════════════════════╗
║       Basecamp CLI Manual Validation Script       ║
╚══════════════════════════════════════════════════╝
${COLORS.reset}`)

  // Parse arguments
  const args = process.argv.slice(2)
  const projectIdIndex = args.indexOf('--project')
  let projectId = projectIdIndex !== -1 ? args[projectIdIndex + 1] : null

  const CLI = './dist/index.js'

  // ============ AUTH ============
  section('Authentication')
  results.push(run('Auth status', `${CLI} auth status`))

  // ============ ACCOUNTS ============
  section('Accounts')
  results.push(run('List accounts', `${CLI} accounts`))
  results.push(run('Current account', `${CLI} account current`))

  // ============ PROJECTS ============
  section('Projects')
  const projectsResult = run('List projects', `${CLI} projects list --format json`)
  results.push(projectsResult)

  // Extract first project ID if not provided
  if (!projectId && projectsResult.passed && projectsResult.output) {
    try {
      const projects = JSON.parse(projectsResult.output)
      if (Array.isArray(projects) && projects.length > 0) {
        projectId = String(projects[0].id)
        log(COLORS.blue, '[INFO]', `Using project ID: ${projectId}`)
      }
    } catch {
      log(COLORS.yellow, '[WARN]', 'Could not parse projects output')
    }
  }

  if (!projectId) {
    log(
      COLORS.red,
      '[ERROR]',
      'No project ID available. Create a project or specify --project <ID>',
    )
    printSummary()
    process.exit(1)
  }

  results.push(run('Get project', `${CLI} projects get ${projectId} --format json`))

  // ============ PEOPLE ============
  section('People')
  results.push(run('Get me', `${CLI} people me --format json`))
  results.push(run('List people', `${CLI} people list --format json`))
  results.push(
    run('List project people', `${CLI} people list --project ${projectId} --format json`),
  )

  // ============ TODO LISTS ============
  section('Todo Lists')
  const todolistsResult = run(
    'List todolists',
    `${CLI} todolists list --project ${projectId} --format json`,
  )
  results.push(todolistsResult)

  let todolistId: string | null = null
  if (todolistsResult.passed && todolistsResult.output) {
    try {
      const todolists = JSON.parse(todolistsResult.output)
      if (Array.isArray(todolists) && todolists.length > 0) {
        todolistId = String(todolists[0].id)
        log(COLORS.blue, '[INFO]', `Using todolist ID: ${todolistId}`)
      }
    } catch {
      log(COLORS.yellow, '[WARN]', 'Could not parse todolists output')
    }
  }

  // ============ TODOS ============
  section('Todos')
  if (todolistId) {
    results.push(
      run(
        'List todos',
        `${CLI} todos list --project ${projectId} --list ${todolistId} --format json`,
      ),
    )
    // Create a test todo
    const createTodoResult = run(
      'Create todo',
      `${CLI} todos create --project ${projectId} --list ${todolistId} --content "Test todo from validation script" --format json`,
    )
    results.push(createTodoResult)

    if (createTodoResult.passed && createTodoResult.output) {
      try {
        const todo = JSON.parse(createTodoResult.output)
        const todoId = todo.id
        if (todoId) {
          results.push(
            run('Get todo', `${CLI} todos get ${todoId} --project ${projectId} --format json`),
          )
          results.push(
            run('Complete todo', `${CLI} todos complete ${todoId} --project ${projectId}`),
          )
          results.push(
            run('Uncomplete todo', `${CLI} todos uncomplete ${todoId} --project ${projectId}`),
          )
        }
      } catch {
        log(COLORS.yellow, '[WARN]', 'Could not parse created todo')
      }
    }
  } else {
    log(COLORS.yellow, '[SKIP]', 'No todolist found, skipping todo tests')
  }

  // ============ TODO GROUPS ============
  section('Todo Groups')
  if (todolistId) {
    results.push(
      run(
        'List todo groups',
        `${CLI} todogroups list --project ${projectId} --list ${todolistId} --format json`,
      ),
    )
  } else {
    log(COLORS.yellow, '[SKIP]', 'No todolist found, skipping todo groups tests')
  }

  // ============ MESSAGES ============
  section('Messages')
  results.push(run('List messages', `${CLI} messages list --project ${projectId} --format json`))

  // ============ CAMPFIRES ============
  section('Campfires')
  results.push(run('List campfires', `${CLI} campfires list --project ${projectId} --format json`))

  // ============ VAULTS ============
  section('Vaults (Docs & Files)')
  const vaultsResult = run('List vaults', `${CLI} vaults list --project ${projectId} --format json`)
  results.push(vaultsResult)

  // ============ DOCUMENTS ============
  section('Documents')
  // Documents require a vault ID - skip if no vault
  log(COLORS.gray, '[INFO]', 'Document tests require manual vault ID')

  // ============ SCHEDULES ============
  section('Schedules')
  results.push(run('Get schedule', `${CLI} schedules get --project ${projectId} --format json`))
  results.push(
    run('List schedule entries', `${CLI} schedules entries --project ${projectId} --format json`),
  )

  // ============ CARD TABLES ============
  section('Card Tables (Kanban)')
  results.push(run('Get card table', `${CLI} cardtables get --project ${projectId} --format json`))

  // ============ WEBHOOKS ============
  section('Webhooks')
  results.push(run('List webhooks', `${CLI} webhooks list --project ${projectId} --format json`))

  // ============ RECORDINGS ============
  section('Recordings')
  results.push(
    run(
      'List recordings (Todo)',
      `${CLI} recordings list --type Todo --bucket ${projectId} --format json`,
    ),
  )

  // ============ EVENTS ============
  section('Events')
  log(COLORS.gray, '[INFO]', 'Events require a recording ID - skipping (tested via MCP)')

  // ============ SUBSCRIPTIONS ============
  section('Subscriptions')
  log(COLORS.gray, '[INFO]', 'Subscription tests require a recording ID')

  // ============ SEARCH ============
  section('Search')
  results.push(run('Search', `${CLI} search "test" --format json`))

  // ============ MCP SERVER ============
  section('MCP Server')
  results.push(
    run(
      'MCP tools/list',
      `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | bun run mcp | grep -q '"tools"' && echo "MCP OK"`,
    ),
  )

  // ============ SUMMARY ============
  printSummary()
}

function printSummary(): void {
  console.log(`\n${COLORS.blue}
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╚══════════════════════════════════════════════════╝
${COLORS.reset}`)

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const total = results.length

  console.log(`Total: ${total}`)
  console.log(`${COLORS.green}Passed: ${passed}${COLORS.reset}`)
  console.log(`${COLORS.red}Failed: ${failed}${COLORS.reset}`)

  if (failed > 0) {
    console.log(`\n${COLORS.red}Failed tests:${COLORS.reset}`)
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`)
        if (r.error) {
          console.log(`    ${COLORS.gray}${r.error.slice(0, 200)}${COLORS.reset}`)
        }
      })
  }

  console.log(`\nPass rate: ${((passed / total) * 100).toFixed(1)}%`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
