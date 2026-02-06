#!/usr/bin/env node

/**
 * Prompt Workflow Orchestrator
 *
 * Orchestrates the AI prompt collection, conversion, and publishing workflow.
 * Supports multiple modes: auto, interactive, manual.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKFLOW_DIR = __dirname
const CLAWD_ROOT = process.env.CLAWD_ROOT || '/root/clawd'
const SCRIPTS_DIR = join(CLAWD_ROOT, 'scripts')
const OUTPUT_DIR = join(WORKFLOW_DIR, 'output')
const STATE_FILE = join(OUTPUT_DIR, 'state.json')
const LOG_FILE = join(OUTPUT_DIR, 'workflow.log')

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

/**
 * Logger with file output and console output
 */
class Logger {
  constructor() {
    this.logs = []
  }

  log(level, message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}`

    // Console output
    console.log(logEntry)

    // File output
    try {
      this.logs.push(logEntry)
      writeFileSync(LOG_FILE, this.logs.join('\n') + '\n')
    } catch (error) {
      console.error('Failed to write to log file:', error.message)
    }
  }

  info(message) {
    this.log('INFO', message)
  }
  warn(message) {
    this.log('WARN', message)
  }
  error(message) {
    this.log('ERROR', message)
  }
  success(message) {
    this.log('SUCCESS', message)
  }
}

/**
 * State manager for workflow execution
 */
class StateManager {
  constructor(logger) {
    this.logger = logger
    this.state = this.loadState()
  }

  loadState() {
    if (existsSync(STATE_FILE)) {
      try {
        return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
      } catch (error) {
        this.logger.error(`Failed to load state: ${error.message}`)
      }
    }
    return this.createNewState()
  }

  createNewState() {
    return {
      startTime: null,
      endTime: null,
      mode: null,
      steps: {
        collect: { status: 'pending', startTime: null, endTime: null, error: null },
        convert: { status: 'pending', startTime: null, endTime: null, error: null },
        publish: { status: 'pending', startTime: null, endTime: null, error: null },
      },
    }
  }

  saveState() {
    try {
      writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2))
    } catch (error) {
      this.logger.error(`Failed to save state: ${error.message}`)
    }
  }

  startWorkflow(mode) {
    this.state.startTime = new Date().toISOString()
    this.state.mode = mode
    this.state.endTime = null
    // Reset step statuses
    Object.keys(this.state.steps).forEach((step) => {
      this.state.steps[step] = { status: 'pending', startTime: null, endTime: null, error: null }
    })
    this.saveState()
    this.logger.info(`Workflow started in ${mode} mode`)
  }

  startStep(stepName) {
    this.state.steps[stepName] = {
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      error: null,
    }
    this.saveState()
    this.logger.info(`Step '${stepName}' started`)
  }

  completeStep(stepName) {
    this.state.steps[stepName] = {
      ...this.state.steps[stepName],
      status: 'completed',
      endTime: new Date().toISOString(),
    }
    this.saveState()
    this.logger.success(`Step '${stepName}' completed`)
  }

  failStep(stepName, error) {
    this.state.steps[stepName] = {
      ...this.state.steps[stepName],
      status: 'failed',
      endTime: new Date().toISOString(),
      error: error.message,
    }
    this.saveState()
    this.logger.error(`Step '${stepName}' failed: ${error.message}`)
  }

  endWorkflow() {
    this.state.endTime = new Date().toISOString()
    this.saveState()
    this.logger.info('Workflow ended')
  }

  getFailedStep() {
    for (const [step, data] of Object.entries(this.state.steps)) {
      if (data.status === 'failed') {
        return step
      }
    }
    return null
  }

  getCompletedSteps() {
    const completed = []
    for (const [step, data] of Object.entries(this.state.steps)) {
      if (data.status === 'completed') {
        completed.push(step)
      }
    }
    return completed
  }
}

/**
 * Workflow orchestrator
 */
class PromptWorkflow {
  constructor() {
    this.logger = new Logger()
    this.stateManager = new StateManager(this.logger)
  }

  /**
   * Execute a shell command
   */
  execCommand(command, cwd = WORKFLOW_DIR) {
    try {
      const output = execSync(command, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })
      return { success: true, output }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || '',
      }
    }
  }

  /**
   * Step: Collect prompts from various sources
   */
  async collect() {
    this.stateManager.startStep('collect')

    const collectScript = join(WORKFLOW_DIR, 'scripts', 'collect.sh')

    if (!existsSync(collectScript)) {
      this.stateManager.failStep('collect', new Error('Collect script not found'))
      return false
    }

    this.logger.info('Running collect.sh...')

    // Make script executable
    this.execCommand(`chmod +x "${collectScript}"`)

    // Execute collect script
    const result = this.execCommand(`bash "${collectScript}"`)

    if (result.success) {
      this.stateManager.completeStep('collect')
      this.logger.success('Collection completed')
      return true
    } else {
      this.stateManager.failStep('collect', new Error(result.error))
      this.logger.error('Collection failed')
      return false
    }
  }

  /**
   * Step: Convert collected prompts to skills
   */
  async convert() {
    this.stateManager.startStep('convert')

    const convertScript = join(SCRIPTS_DIR, 'convert-prompts-to-skills.py')

    if (!existsSync(convertScript)) {
      this.stateManager.failStep('convert', new Error('Convert script not found'))
      return false
    }

    this.logger.info('Running convert-prompts-to-skills.py...')

    // Execute convert script (Python)
    const result = this.execCommand(`python3 "${convertScript}"`)

    if (result.success) {
      this.stateManager.completeStep('convert')
      this.logger.success('Conversion completed')
      return true
    } else {
      this.stateManager.failStep('convert', new Error(result.error))
      this.logger.error('Conversion failed')
      return false
    }
  }

  /**
   * Step: Publish skills to ClawdHub
   */
  async publish() {
    this.stateManager.startStep('publish')

    const publishScript = join(WORKFLOW_DIR, 'scripts', 'publish.sh')

    if (!existsSync(publishScript)) {
      this.stateManager.failStep('publish', new Error('Publish script not found'))
      return false
    }

    this.logger.info('Running publish.sh...')

    // Make script executable
    this.execCommand(`chmod +x "${publishScript}"`)

    // Execute publish script
    const result = this.execCommand(`bash "${publishScript}"`)

    if (result.success) {
      this.stateManager.completeStep('publish')
      this.logger.success('Publishing completed')
      return true
    } else {
      this.stateManager.failStep('publish', new Error(result.error))
      this.logger.error('Publishing failed')
      return false
    }
  }

  /**
   * Run the entire workflow in auto mode
   */
  async runAuto() {
    this.stateManager.startWorkflow('auto')

    const steps = ['collect', 'convert', 'publish']

    for (const step of steps) {
      const success = await this[step]()
      if (!success) {
        this.logger.error(`Workflow failed at step: ${step}`)
        this.stateManager.endWorkflow()
        return false
      }
    }

    this.stateManager.endWorkflow()
    this.logger.success('Workflow completed successfully!')
    return true
  }

  /**
   * Run in interactive mode - recover from failures
   */
  async runInteractive() {
    this.stateManager.startWorkflow('interactive')

    // Check for failed steps
    const failedStep = this.stateManager.getFailedStep()
    const completedSteps = this.stateManager.getCompletedSteps()

    if (failedStep) {
      this.logger.warn(`Resuming from failed step: ${failedStep}`)
      this.logger.info(`Previously completed steps: ${completedSteps.join(', ') || 'none'}`)

      const success = await this[failedStep]()
      if (!success) {
        this.stateManager.endWorkflow()
        return false
      }

      // Continue with remaining steps
      const allSteps = ['collect', 'convert', 'publish']
      const failedIndex = allSteps.indexOf(failedStep)

      for (let i = failedIndex + 1; i < allSteps.length; i++) {
        const step = allSteps[i]
        const success = await this[step]()
        if (!success) {
          this.stateManager.endWorkflow()
          return false
        }
      }
    } else {
      // No failures, run full workflow
      this.logger.info('No failed steps found, running full workflow')
      return await this.runAuto()
    }

    this.stateManager.endWorkflow()
    this.logger.success('Workflow completed successfully!')
    return true
  }

  /**
   * Run specific steps in manual mode
   */
  async runManual(steps) {
    this.stateManager.startWorkflow('manual')

    this.logger.info(`Running manual steps: ${steps.join(', ')}`)

    for (const step of steps) {
      if (!this[step]) {
        this.logger.error(`Unknown step: ${step}`)
        this.stateManager.endWorkflow()
        return false
      }

      const success = await this[step]()
      if (!success) {
        this.logger.error(`Workflow failed at step: ${step}`)
        this.stateManager.endWorkflow()
        return false
      }
    }

    this.stateManager.endWorkflow()
    this.logger.success('Workflow completed successfully!')
    return true
  }

  /**
   * Print current state
   */
  printState() {
    const state = this.stateManager.state
    console.log('\n=== Workflow State ===')
    console.log(`Mode: ${state.mode}`)
    console.log(`Started: ${state.startTime || 'Not started'}`)
    console.log(`Ended: ${state.endTime || 'Running'}`)
    console.log('\nSteps:')
    for (const [step, data] of Object.entries(state.steps)) {
      const icon =
        data.status === 'completed'
          ? '✅'
          : data.status === 'failed'
            ? '❌'
            : data.status === 'running'
              ? '⏳'
              : '⏸️'
      console.log(`  ${icon} ${step}: ${data.status}`)
      if (data.error) {
        console.log(`     Error: ${data.error}`)
      }
    }
    console.log('====================\n')
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)
  const workflow = new PromptWorkflow()

  // Parse command line arguments
  const mode = args[0] || 'auto'

  // If just asking for state
  if (mode === 'status') {
    workflow.printState()
    return
  }

  // Run workflow
  let success
  switch (mode) {
    case 'auto':
      success = await workflow.runAuto()
      break
    case 'interactive':
      success = await workflow.runInteractive()
      break
    case 'manual':
      const steps = args.slice(1)
      if (steps.length === 0) {
        workflow.logger.error(
          'Manual mode requires step names: node main.js manual collect convert',
        )
        process.exit(1)
      }
      success = await workflow.runManual(steps)
      break
    default:
      workflow.logger.error(`Unknown mode: ${mode}`)
      workflow.logger.info('Usage: node main.js [auto|interactive|manual|status] [step1 step2 ...]')
      process.exit(1)
  }

  process.exit(success ? 0 : 1)
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export default PromptWorkflow
