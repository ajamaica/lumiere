/**
 * Agent Module - Agentic Behavior for Sentient Observer
 *
 * Provides the capability to:
 * 1. Decompose large tasks into multiple steps
 * 2. Execute each step with state tracking
 * 3. Detect when decomposition is needed vs direct execution
 * 4. Manage task lifecycle and context preservation
 *
 * Integrates with:
 * - AgencyLayer for goal/attention management
 * - Tools for action execution
 * - Memory for context preservation
 * - LLM for planning and reasoning
 */

const { EventEmitter } = require('events')

/**
 * Task status enum
 */
const TaskStatus = {
  PENDING: 'pending',
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_INPUT: 'waiting_for_input',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

/**
 * Step status enum
 */
const StepStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
}

/**
 * Task complexity indicators for decomposition decision
 */
const ComplexityIndicators = {
  // Keywords suggesting multi-step work
  MULTI_STEP_KEYWORDS: [
    'create',
    'build',
    'implement',
    'develop',
    'design',
    'refactor',
    'migrate',
    'convert',
    'transform',
    'analyze',
    'review',
    'audit',
    'test',
    'set up',
    'configure',
    'install',
    'deploy',
    'fix',
    'debug',
    'resolve',
    'troubleshoot',
    'integrate',
    'connect',
    'combine',
    'merge',
    'multiple',
    'several',
    'all',
    'each',
    'every',
    'first',
    'then',
    'next',
    'after',
    'finally',
    'step by step',
    'systematically',
    'thoroughly',
  ],

  // Connectors suggesting sequence
  SEQUENCE_CONNECTORS: [
    'and then',
    'after that',
    'once done',
    'when finished',
    'followed by',
    'before',
    'after',
    'while',
  ],

  // Minimum word count for likely complex tasks
  MIN_WORDS_FOR_COMPLEX: 15,

  // Maximum for definitely simple tasks
  MAX_WORDS_FOR_SIMPLE: 5,
}

/**
 * Represents a single step in a task plan
 */
class TaskStep {
  constructor(data = {}) {
    this.id = data.id || TaskStep.generateId()
    this.taskId = data.taskId || null
    this.index = data.index || 0
    this.description = data.description || ''
    this.action = data.action || null // Tool action or internal
    this.toolName = data.toolName || null
    this.toolParams = data.toolParams || {}
    this.expectedOutcome = data.expectedOutcome || ''
    this.status = data.status || StepStatus.PENDING
    this.result = data.result || null
    this.error = data.error || null
    this.startedAt = data.startedAt || null
    this.completedAt = data.completedAt || null
    this.retryCount = data.retryCount || 0
    this.maxRetries = data.maxRetries || 2
    this.dependencies = data.dependencies || [] // Step IDs this depends on
    this.context = data.context || {} // Context carried from previous steps
  }

  static generateId() {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  get duration() {
    if (!this.startedAt) return 0
    const end = this.completedAt || Date.now()
    return end - this.startedAt
  }

  get isComplete() {
    return (
      this.status === StepStatus.COMPLETED ||
      this.status === StepStatus.FAILED ||
      this.status === StepStatus.SKIPPED
    )
  }

  get canRetry() {
    return this.status === StepStatus.FAILED && this.retryCount < this.maxRetries
  }

  start() {
    this.status = StepStatus.IN_PROGRESS
    this.startedAt = Date.now()
  }

  complete(result) {
    this.status = StepStatus.COMPLETED
    this.result = result
    this.completedAt = Date.now()
  }

  fail(error) {
    this.status = StepStatus.FAILED
    this.error = typeof error === 'string' ? error : error.message
    this.completedAt = Date.now()
    this.retryCount++
  }

  skip(reason) {
    this.status = StepStatus.SKIPPED
    this.result = { skipped: true, reason }
    this.completedAt = Date.now()
  }

  reset() {
    this.status = StepStatus.PENDING
    this.result = null
    this.error = null
    this.startedAt = null
    this.completedAt = null
  }

  toJSON() {
    return {
      id: this.id,
      taskId: this.taskId,
      index: this.index,
      description: this.description,
      action: this.action,
      toolName: this.toolName,
      toolParams: this.toolParams,
      expectedOutcome: this.expectedOutcome,
      status: this.status,
      result: this.result,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.duration,
      retryCount: this.retryCount,
      dependencies: this.dependencies,
    }
  }
}

/**
 * Represents a task with its plan and execution state
 */
class Task {
  constructor(data = {}) {
    this.id = data.id || Task.generateId()
    this.description = data.description || ''
    this.originalInput = data.originalInput || ''
    this.status = data.status || TaskStatus.PENDING
    this.complexity = data.complexity || null // Assessed complexity
    this.steps = (data.steps || []).map((s) => (s instanceof TaskStep ? s : new TaskStep(s)))
    this.currentStepIndex = data.currentStepIndex || 0
    this.context = data.context || {} // Accumulated context
    this.result = data.result || null
    this.error = data.error || null
    this.createdAt = data.createdAt || Date.now()
    this.startedAt = data.startedAt || null
    this.completedAt = data.completedAt || null
    this.parentTaskId = data.parentTaskId || null // For subtasks
    this.childTaskIds = data.childTaskIds || []
    this.metadata = data.metadata || {}
  }

  static generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  get duration() {
    if (!this.startedAt) return 0
    const end = this.completedAt || Date.now()
    return end - this.startedAt
  }

  get currentStep() {
    return this.steps[this.currentStepIndex] || null
  }

  get completedSteps() {
    return this.steps.filter((s) => s.status === StepStatus.COMPLETED)
  }

  get pendingSteps() {
    return this.steps.filter((s) => s.status === StepStatus.PENDING)
  }

  get failedSteps() {
    return this.steps.filter((s) => s.status === StepStatus.FAILED)
  }

  get progress() {
    if (this.steps.length === 0) return 0
    return this.completedSteps.length / this.steps.length
  }

  get isComplete() {
    return (
      this.status === TaskStatus.COMPLETED ||
      this.status === TaskStatus.FAILED ||
      this.status === TaskStatus.CANCELLED
    )
  }

  addStep(stepData) {
    const step =
      stepData instanceof TaskStep
        ? stepData
        : new TaskStep({
            ...stepData,
            taskId: this.id,
            index: this.steps.length,
          })
    this.steps.push(step)
    return step
  }

  startPlanning() {
    this.status = TaskStatus.PLANNING
    this.startedAt = Date.now()
  }

  startExecution() {
    this.status = TaskStatus.IN_PROGRESS
    if (!this.startedAt) this.startedAt = Date.now()
  }

  complete(result) {
    this.status = TaskStatus.COMPLETED
    this.result = result
    this.completedAt = Date.now()
  }

  fail(error) {
    this.status = TaskStatus.FAILED
    this.error = typeof error === 'string' ? error : error.message
    this.completedAt = Date.now()
  }

  cancel(reason) {
    this.status = TaskStatus.CANCELLED
    this.error = reason || 'Cancelled by user'
    this.completedAt = Date.now()
  }

  advanceStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++
      return this.currentStep
    }
    return null
  }

  /**
   * Accumulate context from completed steps
   */
  gatherContext() {
    const ctx = { ...this.context }

    for (const step of this.completedSteps) {
      if (step.result) {
        ctx[`step_${step.index}_result`] = step.result
      }
      if (step.context) {
        Object.assign(ctx, step.context)
      }
    }

    return ctx
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      originalInput: this.originalInput,
      status: this.status,
      complexity: this.complexity,
      steps: this.steps.map((s) => s.toJSON()),
      currentStepIndex: this.currentStepIndex,
      progress: this.progress,
      context: this.context,
      result: this.result,
      error: this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.duration,
      parentTaskId: this.parentTaskId,
      childTaskIds: this.childTaskIds,
      metadata: this.metadata,
    }
  }
}

/**
 * Task Planner - Uses LLM to decompose tasks into steps
 */
class TaskPlanner {
  constructor(options = {}) {
    this.llmClient = options.llmClient || null
    this.toolDefinitions = options.toolDefinitions || []
    this.maxSteps = options.maxSteps || 20
    this.planningTimeout = options.planningTimeout || 60000
  }

  setLLMClient(client) {
    this.llmClient = client
  }

  setToolDefinitions(tools) {
    this.toolDefinitions = tools
  }

  /**
   * Generate a plan for a task using LLM
   */
  async plan(task, context = {}) {
    if (!this.llmClient) {
      throw new Error('No LLM client configured for planning')
    }

    const systemPrompt = this.buildPlanningPrompt()
    const userPrompt = this.buildTaskPrompt(task, context)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    try {
      let response = ''

      // Stream or direct call based on client capability
      if (typeof this.llmClient.streamChat === 'function') {
        for await (const chunk of this.llmClient.streamChat(messages)) {
          if (typeof chunk === 'string') {
            response += chunk
          }
        }
      } else {
        const result = await this.llmClient.chat(messages)
        response = result.content || result
      }

      return this.parsePlanResponse(response, task)
    } catch (error) {
      throw new Error(`Planning failed: ${error.message}`)
    }
  }

  buildPlanningPrompt() {
    const toolList = this.toolDefinitions
      .map((t) => {
        const fn = t.function || t
        return `- ${fn.name}: ${fn.description}`
      })
      .join('\n')

    return `You are a task planning assistant. Your job is to break down complex tasks into clear, actionable steps.

## Available Tools
${toolList || 'No tools available'}

## Planning Guidelines
1. Break the task into discrete, sequential steps
2. Each step should be a single, clear action
3. For each step, specify if it requires a tool and which one
4. Consider dependencies between steps
5. Keep steps atomic - one action per step
6. Estimate what each step will produce
7. Order steps logically

## Response Format
Respond with a JSON object containing the plan:
\`\`\`json
{
    "summary": "Brief summary of the task",
    "steps": [
        {
            "description": "What this step does",
            "action": "tool" | "think" | "respond" | "verify",
            "toolName": "tool_name_if_applicable",
            "toolParams": { "param": "value" },
            "expectedOutcome": "What this step produces",
            "dependencies": []
        }
    ],
    "notes": "Any additional context or warnings"
}
\`\`\`

Always respond with valid JSON inside a code block.`
  }

  buildTaskPrompt(task, context) {
    let prompt = `## Task
${task.description || task.originalInput}`

    if (Object.keys(context).length > 0) {
      prompt += `\n\n## Context
${JSON.stringify(context, null, 2)}`
    }

    prompt += `\n\n## Instructions
Analyze this task and create a step-by-step plan. If the task is simple enough to complete in one action, create a single step.`

    return prompt
  }

  parsePlanResponse(response, task) {
    // Extract JSON from response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)

    if (!jsonMatch) {
      // Try parsing the whole response as JSON
      try {
        return this.convertPlanToSteps(JSON.parse(response.trim()), task)
      } catch {
        throw new Error('Could not parse planning response as JSON')
      }
    }

    try {
      const planData = JSON.parse(jsonMatch[1].trim())
      return this.convertPlanToSteps(planData, task)
    } catch (error) {
      throw new Error(`Invalid plan JSON: ${error.message}`)
    }
  }

  convertPlanToSteps(planData, task) {
    const steps = []

    if (!planData.steps || !Array.isArray(planData.steps)) {
      throw new Error('Plan must contain a steps array')
    }

    for (let i = 0; i < Math.min(planData.steps.length, this.maxSteps); i++) {
      const stepData = planData.steps[i]

      steps.push(
        new TaskStep({
          taskId: task.id,
          index: i,
          description: stepData.description || `Step ${i + 1}`,
          action: stepData.action || 'think',
          toolName: stepData.toolName || null,
          toolParams: stepData.toolParams || {},
          expectedOutcome: stepData.expectedOutcome || '',
          dependencies: stepData.dependencies || [],
        }),
      )
    }

    return {
      summary: planData.summary || '',
      steps,
      notes: planData.notes || '',
    }
  }
}

/**
 * Complexity Analyzer - Determines if task needs decomposition
 */
class ComplexityAnalyzer {
  constructor(options = {}) {
    this.indicators = options.indicators || ComplexityIndicators
    this.llmClient = options.llmClient || null
    this.useQuickHeuristics = options.useQuickHeuristics !== false
  }

  setLLMClient(client) {
    this.llmClient = client
  }

  /**
   * Analyze task complexity
   * Returns { score: 0-1, shouldDecompose: boolean, reasons: string[] }
   */
  async analyze(input, context = {}) {
    // Quick heuristic analysis
    const heuristic = this.heuristicAnalysis(input)

    // If definitely simple or definitely complex, return quickly
    if (heuristic.confidence > 0.8) {
      return {
        score: heuristic.score,
        shouldDecompose: heuristic.shouldDecompose,
        reasons: heuristic.reasons,
        method: 'heuristic',
      }
    }

    // If LLM available, get more accurate assessment
    if (this.llmClient && !this.useQuickHeuristics) {
      try {
        return await this.llmAnalysis(input, context, heuristic)
      } catch {
        // Fall back to heuristic
      }
    }

    return {
      score: heuristic.score,
      shouldDecompose: heuristic.shouldDecompose,
      reasons: heuristic.reasons,
      method: 'heuristic',
    }
  }

  /**
   * Fast heuristic-based complexity analysis
   */
  heuristicAnalysis(input) {
    const text = input.toLowerCase()
    const words = text.split(/\s+/)
    const reasons = []
    let score = 0

    // Word count factor
    if (words.length <= this.indicators.MAX_WORDS_FOR_SIMPLE) {
      score -= 0.3
      reasons.push('Very short input')
    } else if (words.length >= this.indicators.MIN_WORDS_FOR_COMPLEX) {
      score += 0.2
      reasons.push('Longer input')
    }

    // Multi-step keywords
    const multiStepMatches = this.indicators.MULTI_STEP_KEYWORDS.filter((kw) => text.includes(kw))
    if (multiStepMatches.length > 0) {
      score += 0.15 * Math.min(multiStepMatches.length, 4)
      reasons.push(`Contains action keywords: ${multiStepMatches.slice(0, 3).join(', ')}`)
    }

    // Sequence connectors
    const sequenceMatches = this.indicators.SEQUENCE_CONNECTORS.filter((conn) =>
      text.includes(conn),
    )
    if (sequenceMatches.length > 0) {
      score += 0.25 * Math.min(sequenceMatches.length, 3)
      reasons.push('Contains sequence connectors')
    }

    // Multiple sentences or commands
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    if (sentences.length > 2) {
      score += 0.2
      reasons.push(`Multiple sentences (${sentences.length})`)
    }

    // Contains numbered list or bullets
    if (/(\d+\.|[-*])\s/.test(input)) {
      score += 0.3
      reasons.push('Contains list items')
    }

    // Contains "and" multiple times (compound task)
    const andCount = (text.match(/\band\b/g) || []).length
    if (andCount >= 2) {
      score += 0.2
      reasons.push('Multiple conjunctions')
    }

    // Question mark suggests simple query
    if (text.includes('?') && sentences.length === 1) {
      score -= 0.3
      reasons.push('Simple question')
    }

    // Normalize score
    score = Math.max(0, Math.min(1, 0.5 + score))

    // Determine confidence based on how extreme the score is
    const confidence = Math.abs(score - 0.5) * 2

    return {
      score,
      shouldDecompose: score > 0.5,
      reasons,
      confidence,
    }
  }

  /**
   * LLM-based complexity analysis
   */
  async llmAnalysis(input, context, heuristic) {
    const prompt = `Analyze if this task needs to be broken into multiple steps.

Task: "${input}"

Quick assessment: ${heuristic.shouldDecompose ? 'Likely complex' : 'Likely simple'}
Reasons: ${heuristic.reasons.join('; ')}

Respond with JSON:
\`\`\`json
{
    "isComplex": true/false,
    "estimatedSteps": number,
    "reason": "brief explanation"
}
\`\`\``

    const result = await this.llmClient.chat([
      { role: 'system', content: 'You analyze task complexity. Be concise.' },
      { role: 'user', content: prompt },
    ])

    const response = result.content || result
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1].trim())
        const score = data.isComplex ? Math.min(0.9, 0.5 + (data.estimatedSteps || 2) * 0.1) : 0.3

        return {
          score,
          shouldDecompose: data.isComplex,
          reasons: [...heuristic.reasons, data.reason],
          estimatedSteps: data.estimatedSteps,
          method: 'llm',
        }
      } catch {
        // Fall through
      }
    }

    return {
      ...heuristic,
      method: 'heuristic_fallback',
    }
  }
}

/**
 * Step Executor - Executes individual task steps
 */
class StepExecutor {
  constructor(options = {}) {
    this.toolExecutor = options.toolExecutor || null
    this.llmClient = options.llmClient || null
    this.timeout = options.timeout || 60000
    this.events = new EventEmitter()
  }

  setToolExecutor(executor) {
    this.toolExecutor = executor
  }

  setLLMClient(client) {
    this.llmClient = client
  }

  /**
   * Execute a single step
   */
  async execute(step, context = {}) {
    step.start()
    this.events.emit('step:start', { step, context })

    try {
      let result

      switch (step.action) {
        case 'tool':
          result = await this.executeTool(step, context)
          break

        case 'think':
          result = await this.executeThink(step, context)
          break

        case 'respond':
          result = await this.executeRespond(step, context)
          break

        case 'verify':
          result = await this.executeVerify(step, context)
          break

        default:
          result = await this.executeGeneric(step, context)
      }

      step.complete(result)
      this.events.emit('step:complete', { step, result })

      return result
    } catch (error) {
      step.fail(error)
      this.events.emit('step:fail', { step, error: error.message })

      if (step.canRetry) {
        this.events.emit('step:retry', { step, attempt: step.retryCount })
        step.reset()
        return this.execute(step, context)
      }

      throw error
    }
  }

  /**
   * Execute a tool action
   */
  async executeTool(step, context) {
    if (!this.toolExecutor) {
      throw new Error('No tool executor configured')
    }

    if (!step.toolName) {
      throw new Error('No tool specified for tool action')
    }

    // Interpolate context into params
    const params = this.interpolateParams(step.toolParams, context)

    const result = await this.toolExecutor.execute({
      tool: step.toolName,
      ...params,
    })

    if (!result.success) {
      throw new Error(result.error || 'Tool execution failed')
    }

    return result
  }

  /**
   * Execute a thinking/reasoning step
   */
  async executeThink(step, context) {
    if (!this.llmClient) {
      return { thought: step.description, context }
    }

    const prompt = `## Current Task Step
${step.description}

## Context from Previous Steps
${JSON.stringify(context, null, 2)}

## Expected Outcome
${step.expectedOutcome}

Think through this step and provide your analysis.`

    let response = ''

    if (typeof this.llmClient.streamChat === 'function') {
      for await (const chunk of this.llmClient.streamChat([
        {
          role: 'system',
          content: 'You are a thoughtful assistant working through a task step by step.',
        },
        { role: 'user', content: prompt },
      ])) {
        if (typeof chunk === 'string') {
          response += chunk
        }
      }
    } else {
      const result = await this.llmClient.chat([
        {
          role: 'system',
          content: 'You are a thoughtful assistant working through a task step by step.',
        },
        { role: 'user', content: prompt },
      ])
      response = result.content || result
    }

    return {
      thought: response,
      context: { ...context, lastThought: response },
    }
  }

  /**
   * Execute a response generation step
   */
  async executeRespond(step, context) {
    if (!this.llmClient) {
      return { response: step.description }
    }

    const contextSummary = Object.entries(context)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n')

    const prompt = `Based on the completed steps and context, generate a response.

## Step Description
${step.description}

## Accumulated Context
${contextSummary}

Generate an appropriate response.`

    let response = ''

    if (typeof this.llmClient.streamChat === 'function') {
      for await (const chunk of this.llmClient.streamChat([{ role: 'user', content: prompt }])) {
        if (typeof chunk === 'string') {
          response += chunk
        }
      }
    } else {
      const result = await this.llmClient.chat([{ role: 'user', content: prompt }])
      response = result.content || result
    }

    return { response }
  }

  /**
   * Execute a verification step
   */
  async executeVerify(step, context) {
    if (!this.llmClient) {
      return { verified: true, details: 'No LLM for verification' }
    }

    const prompt = `Verify that the following step was completed correctly.

## Step to Verify
${step.description}

## Expected Outcome
${step.expectedOutcome}

## Context/Results
${JSON.stringify(context, null, 2)}

Respond with JSON:
\`\`\`json
{
    "verified": true/false,
    "issues": [],
    "suggestions": []
}
\`\`\``

    const result = await this.llmClient.chat([
      { role: 'system', content: 'You verify task completion. Be thorough but concise.' },
      { role: 'user', content: prompt },
    ])

    const response = result.content || result
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim())
      } catch {
        // Fall through
      }
    }

    return { verified: true, rawResponse: response }
  }

  /**
   * Execute a generic step (delegate to think)
   */
  async executeGeneric(step, context) {
    return this.executeThink(step, context)
  }

  /**
   * Interpolate context values into tool parameters
   */
  interpolateParams(params, context) {
    const result = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to context variable
        const contextKey = value.slice(1)
        result[key] = context[contextKey] ?? value
      } else if (typeof value === 'string' && value.includes('{{')) {
        // Template interpolation
        result[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          return context[varName] ?? match
        })
      } else {
        result[key] = value
      }
    }

    return result
  }

  on(event, callback) {
    this.events.on(event, callback)
  }

  off(event, callback) {
    this.events.off(event, callback)
  }
}

/**
 * Agent - Main agentic behavior coordinator
 */
class Agent {
  constructor(options = {}) {
    this.planner = new TaskPlanner(options.planner)
    this.analyzer = new ComplexityAnalyzer(options.analyzer)
    this.executor = new StepExecutor(options.executor)

    this.llmClient = options.llmClient || null
    this.toolExecutor = options.toolExecutor || null
    this.toolDefinitions = options.toolDefinitions || []

    // Configure sub-components
    if (this.llmClient) {
      this.planner.setLLMClient(this.llmClient)
      this.analyzer.setLLMClient(this.llmClient)
      this.executor.setLLMClient(this.llmClient)
    }

    if (this.toolExecutor) {
      this.executor.setToolExecutor(this.toolExecutor)
    }

    if (this.toolDefinitions.length > 0) {
      this.planner.setToolDefinitions(this.toolDefinitions)
    }

    // Task management
    this.tasks = new Map()
    this.currentTask = null
    this.taskHistory = []
    this.maxHistory = options.maxHistory || 50

    // Configuration
    this.autoDecompose = options.autoDecompose !== false
    this.minComplexityForDecomposition = options.minComplexityForDecomposition || 0.5
    this.maxConcurrentTasks = options.maxConcurrentTasks || 1

    // Events
    this.events = new EventEmitter()

    // Wire up executor events
    this.executor.on('step:start', (data) => this.events.emit('step:start', data))
    this.executor.on('step:complete', (data) => this.events.emit('step:complete', data))
    this.executor.on('step:fail', (data) => this.events.emit('step:fail', data))
    this.executor.on('step:retry', (data) => this.events.emit('step:retry', data))
  }

  /**
   * Configure the agent with external dependencies
   */
  configure(options = {}) {
    if (options.llmClient) {
      this.llmClient = options.llmClient
      this.planner.setLLMClient(options.llmClient)
      this.analyzer.setLLMClient(options.llmClient)
      this.executor.setLLMClient(options.llmClient)
    }

    if (options.toolExecutor) {
      this.toolExecutor = options.toolExecutor
      this.executor.setToolExecutor(options.toolExecutor)
    }

    if (options.toolDefinitions) {
      this.toolDefinitions = options.toolDefinitions
      this.planner.setToolDefinitions(options.toolDefinitions)
    }
  }

  /**
   * Process an input - decides whether to execute directly or decompose
   * @param {string} input - User input/task description
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Execution result
   */
  async process(input, context = {}) {
    // Create task
    const task = new Task({
      description: input,
      originalInput: input,
      context,
    })

    this.tasks.set(task.id, task)
    this.events.emit('task:created', { task })

    try {
      // Analyze complexity
      const complexity = await this.analyzer.analyze(input, context)
      task.complexity = complexity

      this.events.emit('task:analyzed', { task, complexity })

      // Decide on execution path
      if (
        this.autoDecompose &&
        complexity.shouldDecompose &&
        complexity.score >= this.minComplexityForDecomposition
      ) {
        // Complex task - decompose and execute step by step
        return await this.executeWithPlan(task, context)
      } else {
        // Simple task - execute directly
        return await this.executeDirect(task, context)
      }
    } catch (error) {
      task.fail(error)
      this.events.emit('task:failed', { task, error: error.message })
      this.archiveTask(task)
      throw error
    }
  }

  /**
   * Execute a task directly without decomposition
   */
  async executeDirect(task, context) {
    task.startExecution()
    this.currentTask = task
    this.events.emit('task:started', { task, mode: 'direct' })

    // Create a single implicit step
    const step = task.addStep({
      description: task.description,
      action: 'respond',
      expectedOutcome: 'Complete the task',
    })

    try {
      const result = await this.executor.execute(step, context)

      task.complete(result)
      this.events.emit('task:completed', { task, result })
      this.archiveTask(task)

      return {
        taskId: task.id,
        success: true,
        result,
        steps: 1,
        mode: 'direct',
        duration: task.duration,
      }
    } catch (error) {
      task.fail(error)
      this.events.emit('task:failed', { task, error: error.message })
      this.archiveTask(task)

      return {
        taskId: task.id,
        success: false,
        error: error.message,
        mode: 'direct',
        duration: task.duration,
      }
    } finally {
      this.currentTask = null
    }
  }

  /**
   * Execute a task with planning and step-by-step execution
   */
  async executeWithPlan(task, context) {
    task.startPlanning()
    this.currentTask = task
    this.events.emit('task:planning', { task })

    try {
      // Generate plan
      const plan = await this.planner.plan(task, context)

      // Add steps to task
      for (const step of plan.steps) {
        task.addStep(step)
      }

      task.metadata.planSummary = plan.summary
      task.metadata.planNotes = plan.notes

      this.events.emit('task:planned', {
        task,
        stepCount: plan.steps.length,
        summary: plan.summary,
      })

      // Execute steps
      task.startExecution()
      this.events.emit('task:started', { task, mode: 'planned' })

      const results = []
      let accumulatedContext = { ...context }

      for (const step of task.steps) {
        // Check dependencies
        const depsOk = this.checkDependencies(step, task)
        if (!depsOk) {
          step.skip('Dependencies not met')
          continue
        }

        try {
          const result = await this.executor.execute(step, accumulatedContext)
          results.push({ stepId: step.id, result })

          // Accumulate context
          if (result && typeof result === 'object') {
            accumulatedContext = { ...accumulatedContext, ...result }
          }

          task.advanceStep()
        } catch (error) {
          // Step failed - decide whether to continue or abort
          if (!step.canRetry) {
            // Check if this is a critical step
            const isCritical = step.index === 0 || step.dependencies.length > 0

            if (isCritical) {
              throw error
            }

            // Non-critical step failed, continue
            results.push({ stepId: step.id, error: error.message })
            task.advanceStep()
          }
        }
      }

      // Task completed
      const finalResult = {
        steps: results,
        context: accumulatedContext,
        summary: plan.summary,
      }

      task.complete(finalResult)
      this.events.emit('task:completed', { task, result: finalResult })
      this.archiveTask(task)

      return {
        taskId: task.id,
        success: true,
        result: finalResult,
        steps: task.steps.length,
        completedSteps: task.completedSteps.length,
        failedSteps: task.failedSteps.length,
        mode: 'planned',
        duration: task.duration,
      }
    } catch (error) {
      task.fail(error)
      this.events.emit('task:failed', { task, error: error.message })
      this.archiveTask(task)

      return {
        taskId: task.id,
        success: false,
        error: error.message,
        steps: task.steps.length,
        completedSteps: task.completedSteps.length,
        currentStep: task.currentStepIndex,
        mode: 'planned',
        duration: task.duration,
      }
    } finally {
      this.currentTask = null
    }
  }

  /**
   * Check if step dependencies are met
   */
  checkDependencies(step, task) {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true
    }

    for (const depId of step.dependencies) {
      const depStep = task.steps.find((s) => s.id === depId)
      if (!depStep || depStep.status !== StepStatus.COMPLETED) {
        return false
      }
    }

    return true
  }

  /**
   * Archive a completed task
   */
  archiveTask(task) {
    this.tasks.delete(task.id)
    this.taskHistory.push(task.toJSON())

    if (this.taskHistory.length > this.maxHistory) {
      this.taskHistory.shift()
    }
  }

  /**
   * Cancel the current task
   */
  cancel(reason = 'Cancelled by user') {
    if (this.currentTask) {
      this.currentTask.cancel(reason)
      this.events.emit('task:cancelled', {
        task: this.currentTask,
        reason,
      })
      this.archiveTask(this.currentTask)
      this.currentTask = null
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      hasCurrentTask: !!this.currentTask,
      currentTask: this.currentTask
        ? {
            id: this.currentTask.id,
            status: this.currentTask.status,
            progress: this.currentTask.progress,
            currentStep: this.currentTask.currentStep?.description,
          }
        : null,
      pendingTasks: this.tasks.size,
      completedTasks: this.taskHistory.length,
      recentTasks: this.taskHistory.slice(-5),
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || this.taskHistory.find((t) => t.id === taskId)
  }

  /**
   * Force decomposition for a task
   */
  async decompose(input, context = {}) {
    const task = new Task({
      description: input,
      originalInput: input,
      context,
    })

    this.tasks.set(task.id, task)
    return this.executeWithPlan(task, context)
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    this.events.on(event, callback)
    return this
  }

  /**
   * Unsubscribe from events
   */
  off(event, callback) {
    this.events.off(event, callback)
    return this
  }

  /**
   * Reset the agent
   */
  reset() {
    if (this.currentTask) {
      this.currentTask.cancel('Agent reset')
    }
    this.tasks.clear()
    this.currentTask = null
    this.taskHistory = []
  }
}

/**
 * Create an agent instance with common defaults
 */
function createAgent(options = {}) {
  return new Agent(options)
}

module.exports = {
  // Enums
  TaskStatus,
  StepStatus,
  ComplexityIndicators,

  // Classes
  TaskStep,
  Task,
  TaskPlanner,
  ComplexityAnalyzer,
  StepExecutor,
  Agent,

  // Factory
  createAgent,
}
