/**
 * OpenClaw Tools for Sokosumi Plugin
 *
 * These tools enable AI agents to interact with Sokosumi marketplace
 * to discover and hire sub-agents for specialized tasks.
 */

import type { Network } from '../../../../shared/types/config'
import { MasumiPluginConfigSchema } from '../../../../shared/types/config'
import type { SokosumiConfig } from '../types'
import { createSokosumiClient } from '../utils/client'
import { createMasumiPaymentClient, type MasumiPaymentState } from '../utils/payments'

/**
 * Load configuration from environment variables
 *
 * IMPORTANT: User must provide THEIR OWN payment service URL for advanced mode.
 * There is NO centralized service - each user runs their own payment service node.
 */
function loadConfig() {
  const paymentServiceUrl = process.env.MASUMI_PAYMENT_SERVICE_URL

  // Only validate if advanced mode is being used (when payment service URL is provided)
  // Simple mode only needs SOKOSUMI_API_KEY

  // Use Zod schema to apply defaults, but make paymentServiceUrl optional since
  // it's only required for advanced mode
  const config = {
    network: (process.env.MASUMI_NETWORK || 'Preprod') as Network,
    paymentServiceUrl, // User's own service URL (required only for advanced mode)
    paymentApiKey: process.env.MASUMI_PAYMENT_API_KEY, // User's own admin API key
    sellerVkey: process.env.MASUMI_SELLER_VKEY,
    agentIdentifier: process.env.MASUMI_AGENT_IDENTIFIER,
  }

  // Only parse if paymentServiceUrl is provided (advanced mode)
  // Otherwise return a partial config with defaults
  if (paymentServiceUrl) {
    return MasumiPluginConfigSchema.parse(config)
  }

  // For simple mode, use partial schema to make paymentServiceUrl optional
  return MasumiPluginConfigSchema.partial().parse(config)
}

/**
 * Resolve Sokosumi configuration from environment and config
 */
function resolveSokosumiConfig(): SokosumiConfig | undefined {
  const apiKey = process.env.SOKOSUMI_API_KEY?.trim()
  const apiEndpoint = process.env.SOKOSUMI_API_ENDPOINT || 'https://api.sokosumi.com/v1'
  const enabled = process.env.SOKOSUMI_ENABLED === 'true'

  if (!apiKey && !enabled) {
    return undefined
  }

  const config: SokosumiConfig = {
    enabled: enabled || !!apiKey,
    apiKey,
    apiEndpoint,
  }

  // Advanced mode: check for masumi payment service config
  const masumiConfig = loadConfig()
  if (masumiConfig.paymentServiceUrl && masumiConfig.paymentApiKey) {
    config.mode = 'advanced'
    config.payment = {
      serviceUrl: masumiConfig.paymentServiceUrl,
      adminApiKey: masumiConfig.paymentApiKey,
      network: masumiConfig.network,
    }
  } else {
    config.mode = 'simple'
  }

  return config
}

function isSokosumiEnabled(config?: SokosumiConfig): boolean {
  if (typeof config?.enabled === 'boolean') {
    return config.enabled
  }
  return false // Disabled by default
}

type SokosumiConfigValidation =
  | { valid: true; config: { apiKey: string; apiEndpoint: string } }
  | { valid: false; error: string }

function validateSokosumiConfig(config?: SokosumiConfig): SokosumiConfigValidation {
  const apiKey = config?.apiKey?.trim() || ''

  if (!apiKey) {
    return {
      valid: false,
      error: 'Sokosumi API key is missing. Set SOKOSUMI_API_KEY env var.',
    }
  }

  const apiEndpoint = config?.apiEndpoint || 'https://api.sokosumi.com/v1'

  return {
    valid: true,
    config: {
      apiKey,
      apiEndpoint,
    },
  }
}

/**
 * Detect payment mode based on configuration
 */
function detectPaymentMode(config?: SokosumiConfig): 'simple' | 'advanced' {
  // Explicit mode setting takes precedence
  if (config?.mode === 'simple' || config?.mode === 'advanced') {
    return config.mode
  }

  // Auto-detect: if payment service is configured, use advanced mode
  if (config?.payment?.serviceUrl && config?.payment?.adminApiKey) {
    return 'advanced'
  }

  // Default to simple mode (Sokosumi-hosted)
  return 'simple'
}

type MasumiConfigValidation =
  | {
      valid: true
      config: { serviceUrl: string; adminApiKey: string; network: 'Preprod' | 'Mainnet' }
    }
  | { valid: false; error: string }

function validateMasumiConfig(config?: SokosumiConfig): MasumiConfigValidation {
  if (!config?.payment) {
    return {
      valid: false,
      error:
        'Advanced mode requires payment service configuration. Set MASUMI_PAYMENT_SERVICE_URL and MASUMI_PAYMENT_API_KEY env vars, or use simple mode (just SOKOSUMI_API_KEY).',
    }
  }

  if (!config.payment.serviceUrl) {
    return {
      valid: false,
      error: 'Masumi payment service URL is missing. Set MASUMI_PAYMENT_SERVICE_URL env var.',
    }
  }

  if (!config.payment.adminApiKey) {
    return {
      valid: false,
      error: 'Masumi admin API key is missing. Set MASUMI_PAYMENT_API_KEY env var.',
    }
  }

  const network = config.payment.network || 'Preprod'

  return {
    valid: true,
    config: {
      serviceUrl: config.payment.serviceUrl,
      adminApiKey: config.payment.adminApiKey,
      network,
    },
  }
}

/**
 * Tool: sokosumi_list_agents
 *
 * List all available agents on Sokosumi marketplace
 *
 * @returns List of available agents
 */
export async function sokosumi_list_agents() {
  try {
    const sokosumiConfig = resolveSokosumiConfig()

    if (!isSokosumiEnabled(sokosumiConfig)) {
      return {
        success: false,
        error: 'sokosumi_disabled',
        message: 'Sokosumi integration is disabled. Set SOKOSUMI_API_KEY env var.',
      }
    }

    const configValidation = validateSokosumiConfig(sokosumiConfig)
    if (configValidation.valid === false) {
      const errorMsg = configValidation.error
      return {
        success: false,
        error: 'configuration_error',
        message: errorMsg,
      }
    }
    const validatedConfig = configValidation.config

    const client = createSokosumiClient(validatedConfig)
    const result = await client.listAgents()

    if (result.ok === false) {
      const error = result.error
      return {
        success: false,
        error: error.type,
        message: error.message,
      }
    }

    // Format agents for display
    const formattedAgents = result.data.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities || [],
      pricing: agent.pricing
        ? {
            type: agent.pricing.type,
            credits: agent.pricing.credits || 0,
          }
        : { type: 'unknown', credits: 0 },
      author: agent.author?.name || 'Unknown',
    }))

    return {
      success: true,
      agents: formattedAgents,
      count: formattedAgents.length,
      message: `Found ${formattedAgents.length} agent(s)`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: 'unknown_error',
      message: error.message || 'Failed to list agents',
    }
  }
}

/**
 * Tool: sokosumi_hire_agent
 *
 * Hire a sub-agent from Sokosumi marketplace and create a job.
 *
 * ⏱️ TIMING IMPORTANT: Jobs typically take 2-10 minutes to complete.
 * After hiring, wait at least 2-3 minutes before checking status.
 * Do not poll continuously - give the sub-agent time to work.
 *
 * @param params - Job parameters
 * @returns Job creation result with timing guidance
 */
export async function sokosumi_hire_agent(params: {
  agentId: string
  inputData: string // JSON string
  maxAcceptedCredits: number
  jobName?: string
  sharePublic?: boolean
  shareOrganization?: boolean
}) {
  try {
    const sokosumiConfig = resolveSokosumiConfig()

    if (!isSokosumiEnabled(sokosumiConfig)) {
      return {
        success: false,
        error: 'sokosumi_disabled',
        message: 'Sokosumi integration is disabled',
      }
    }

    const configValidation = validateSokosumiConfig(sokosumiConfig)
    if (configValidation.valid === false) {
      const errorMsg = configValidation.error
      return {
        success: false,
        error: 'configuration_error',
        message: errorMsg,
      }
    }
    const validatedConfig = configValidation.config

    // Detect payment mode
    const paymentMode = detectPaymentMode(sokosumiConfig)

    // For advanced mode, validate payment service config
    let masumiClient = null
    if (paymentMode === 'advanced') {
      const masumiValidation = validateMasumiConfig(sokosumiConfig)
      if (masumiValidation.valid === false) {
        const errorMsg = masumiValidation.error
        return {
          success: false,
          error: 'payment_configuration_error',
          message: errorMsg,
          hint: 'Using advanced mode but payment service not configured. Either configure MASUMI_PAYMENT_SERVICE_URL and MASUMI_PAYMENT_API_KEY or use simple mode (just SOKOSUMI_API_KEY).',
        }
      }
      const masumiValidatedConfig = masumiValidation.config
      masumiClient = createMasumiPaymentClient(masumiValidatedConfig)
    }

    // Parse input data
    let inputData: Record<string, unknown>
    try {
      inputData = JSON.parse(params.inputData) as Record<string, unknown>
    } catch {
      return {
        success: false,
        error: 'invalid_input',
        message: 'inputData must be valid JSON',
      }
    }

    // Create Sokosumi client
    const sokosumiClient = createSokosumiClient(validatedConfig)

    // Create job on Sokosumi
    const jobResult = await sokosumiClient.createJob(params.agentId, {
      inputData,
      maxAcceptedCredits: params.maxAcceptedCredits,
      name: params.jobName,
      sharePublic: params.sharePublic || false,
      shareOrganization: params.shareOrganization || false,
    })

    if (jobResult.ok === false) {
      const error = jobResult.error
      return {
        success: false,
        error: error.type,
        message: error.message,
      }
    }

    const job = jobResult.data

    // Handle payment based on mode
    if (paymentMode === 'simple') {
      // Simple mode: Sokosumi handles payment in USDM via smart contract
      // Job is created, Sokosumi manages the payment flow
      return {
        success: true,
        jobId: job.id,
        agentId: job.agentId,
        status: job.status,
        paymentMode: 'simple',
        message:
          'Job created successfully. Sokosumi is handling payment in USDM via Cardano smart contract. IMPORTANT: Jobs typically take 2-10 minutes to complete. Wait at least 2-3 minutes before checking status.',
        estimatedCompletionTime: '2-10 minutes',
        currency: 'USDM',
      }
    }

    // Advanced mode: Self-hosted payment service
    if (job.masumiJobId && masumiClient) {
      // Wait for payment to be locked on user's wallet
      const paymentResult = await masumiClient.waitForPaymentLocked(job.masumiJobId, {
        maxWaitMs: 300_000, // 5 minutes
        pollIntervalMs: 5_000, // 5 seconds
        onUpdate: (state: MasumiPaymentState) => {
          console.log(`Payment state: ${state}`)
        },
      })

      if (!paymentResult.ok) {
        return {
          success: false,
          error: 'payment_error',
          message:
            paymentResult.error.type === 'timeout'
              ? 'Payment not completed within 5 minutes'
              : paymentResult.error.message,
          jobId: job.id,
          status: 'payment_pending',
          paymentMode: 'advanced',
        }
      }

      return {
        success: true,
        jobId: job.id,
        agentId: job.agentId,
        status: 'in_progress',
        paymentStatus: 'locked',
        paymentMode: 'advanced',
        message:
          'Job created and payment locked from your wallet. Sub-agent is now working on your request. IMPORTANT: Jobs typically take 2-10 minutes to complete. Wait at least 2-3 minutes before checking status.',
        estimatedCompletionTime: '2-10 minutes',
        currency: 'ADA',
      }
    }

    // Free job (no payment required)
    return {
      success: true,
      jobId: job.id,
      agentId: job.agentId,
      status: job.status,
      message: 'Job created successfully (no payment required).',
    }
  } catch (error: any) {
    return {
      success: false,
      error: 'unknown_error',
      message: error.message || 'Failed to hire agent',
    }
  }
}

/**
 * Tool: sokosumi_check_job
 *
 * Check the status of a job on Sokosumi marketplace.
 *
 * ⏱️ TIMING GUIDANCE:
 * - First check: Wait at least 2-3 minutes after hiring before checking
 * - If still in_progress: Wait another 2-3 minutes before checking again
 * - Total job time: Typically 2-10 minutes
 * - Don't poll continuously - jobs need time to complete
 *
 * @param params - Job identifier
 * @returns Job status with timing guidance
 */
export async function sokosumi_check_job(params: { jobId: string }) {
  try {
    const sokosumiConfig = resolveSokosumiConfig()

    if (!isSokosumiEnabled(sokosumiConfig)) {
      return {
        success: false,
        error: 'sokosumi_disabled',
        message: 'Sokosumi integration is disabled',
      }
    }

    const configValidation = validateSokosumiConfig(sokosumiConfig)
    if (configValidation.valid === false) {
      const errorMsg = configValidation.error
      return {
        success: false,
        error: 'configuration_error',
        message: errorMsg,
      }
    }
    const validatedConfig = configValidation.config

    const client = createSokosumiClient(validatedConfig)
    const result = await client.getJob(params.jobId)

    if (result.ok === false) {
      const error = result.error
      return {
        success: false,
        error: error.type,
        message: error.message,
      }
    }

    const job = result.data

    return {
      success: true,
      jobId: job.id,
      agentId: job.agentId,
      status: job.status,
      masumiJobStatus: job.masumiJobStatus,
      hasResult: !!job.result,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      message:
        job.status === 'completed'
          ? 'Job completed successfully'
          : job.status === 'in_progress'
            ? 'Job is still processing. Wait 2-3 more minutes before checking again.'
            : `Job status: ${job.status}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: 'unknown_error',
      message: error.message || 'Failed to check job status',
    }
  }
}

/**
 * Tool: sokosumi_get_result
 *
 * Get the result of a completed job from Sokosumi marketplace.
 *
 * ⏱️ NOTE: Only works for jobs with status 'completed'.
 * Use sokosumi_check_job first to verify completion.
 * Jobs typically take 2-10 minutes to complete.
 *
 * @param params - Job identifier
 * @returns Job result (only if job is completed)
 */
export async function sokosumi_get_result(params: { jobId: string }) {
  try {
    const sokosumiConfig = resolveSokosumiConfig()

    if (!isSokosumiEnabled(sokosumiConfig)) {
      return {
        success: false,
        error: 'sokosumi_disabled',
        message: 'Sokosumi integration is disabled',
      }
    }

    const configValidation = validateSokosumiConfig(sokosumiConfig)
    if (configValidation.valid === false) {
      const errorMsg = configValidation.error
      return {
        success: false,
        error: 'configuration_error',
        message: errorMsg,
      }
    }
    const validatedConfig = configValidation.config

    const client = createSokosumiClient(validatedConfig)
    const result = await client.getJob(params.jobId)

    if (result.ok === false) {
      const error = result.error
      return {
        success: false,
        error: error.type,
        message: error.message,
      }
    }

    const job = result.data

    if (job.status !== 'completed') {
      return {
        success: false,
        error: 'job_not_completed',
        message: `Job is not completed yet. Current status: ${job.status}`,
        jobId: job.id,
        status: job.status,
      }
    }

    if (!job.result) {
      return {
        success: false,
        error: 'no_result',
        message: 'Job is marked as completed but has no result',
        jobId: job.id,
      }
    }

    return {
      success: true,
      jobId: job.id,
      agentId: job.agentId,
      status: job.status,
      result: job.result,
      completedAt: job.completedAt,
      message: 'Job result retrieved successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: 'unknown_error',
      message: error.message || 'Failed to get job result',
    }
  }
}

/**
 * Export all Sokosumi tools
 */
export const SokosumiTools = {
  sokosumi_list_agents,
  sokosumi_hire_agent,
  sokosumi_check_job,
  sokosumi_get_result,
}

export default SokosumiTools
