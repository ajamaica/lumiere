/**
 * OpenClaw Tools for Masumi Plugin
 *
 * These tools enable AI agents to interact with Masumi payment system
 * directly from OpenClaw conversations.
 */

import type { Network } from '../../../shared/types/config'
import { MasumiPluginConfigSchema } from '../../../shared/types/config'
import { PaymentManager } from '../managers/payment'
import { RegistryManager } from '../managers/registry'
import { AutoProvisionService } from '../services/auto-provision'
import {
  checkPaymentServiceStatus,
  generateApiKey,
  installPaymentService,
  startPaymentService,
} from '../services/payment-service-installer'

/**
 * Load configuration from environment variables
 *
 * IMPORTANT: User must provide THEIR OWN payment service URL.
 * There is NO centralized service - each user runs their own node.
 */
function loadConfig() {
  const paymentServiceUrl = process.env.MASUMI_PAYMENT_SERVICE_URL

  if (!paymentServiceUrl) {
    throw new Error(
      'MASUMI_PAYMENT_SERVICE_URL is required. ' +
        'You must provide YOUR self-hosted payment service URL. ' +
        'Examples: http://localhost:3000/api/v1 (local) or https://your-service.railway.app/api/v1 (Railway). ' +
        'There is NO centralized payment.masumi.network service - you run your own node.',
    )
  }

  // Use Zod schema to apply defaults
  return MasumiPluginConfigSchema.parse({
    network: (process.env.MASUMI_NETWORK || 'Preprod') as Network,
    paymentServiceUrl, // Required - user's own service
    paymentApiKey: process.env.MASUMI_PAYMENT_API_KEY, // User's own admin API key
    sellerVkey: process.env.MASUMI_SELLER_VKEY,
    agentIdentifier: process.env.MASUMI_AGENT_IDENTIFIER,
  })
}

/**
 * Tool: masumi_install_payment_service
 *
 * Install masumi-payment-service locally
 * Clones the repository and installs dependencies
 *
 * @param params - Installation options
 * @returns Installation result
 */
export async function masumi_install_payment_service(
  params: {
    installPath?: string
    network?: Network
  } = {},
) {
  try {
    const result = await installPaymentService({
      installPath: params.installPath,
      network: params.network || 'Preprod',
    })

    return {
      success: true,
      serviceUrl: result.serviceUrl,
      installPath: result.installPath,
      network: result.network,
      status: result.status,
      message:
        result.status === 'already_exists'
          ? 'Payment service already installed'
          : 'Payment service installed successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to install payment service',
    }
  }
}

/**
 * Tool: masumi_start_payment_service
 *
 * Start the payment service and check if it's running
 *
 * @param params - Service options
 * @returns Service status
 */
export async function masumi_start_payment_service(
  params: {
    installPath?: string
    serviceUrl?: string
    network?: Network
  } = {},
) {
  try {
    const serviceUrl = params.serviceUrl || 'http://localhost:3000/api/v1'
    const network = params.network || 'Preprod'

    // Check if already running
    let status = await checkPaymentServiceStatus(serviceUrl)
    if (status.running) {
      return {
        success: true,
        running: true,
        serviceUrl: status.url,
        healthCheck: status.healthCheck,
        message: 'Payment service is already running',
      }
    }

    // Try to start if install path provided
    if (params.installPath) {
      status = await startPaymentService(params.installPath, network)
    }

    return {
      success: true,
      running: status.running,
      serviceUrl: status.url,
      healthCheck: status.healthCheck,
      message: status.running
        ? 'Payment service is running'
        : 'Payment service is not running. Start it manually or provide installPath.',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to start payment service',
    }
  }
}

/**
 * Tool: masumi_generate_api_key
 *
 * Generate an API key via payment service
 *
 * @param params - API key generation options
 * @returns Generated API key
 */
export async function masumi_generate_api_key(
  params: {
    serviceUrl?: string
    adminKey?: string
  } = {},
) {
  try {
    const serviceUrl =
      params.serviceUrl || process.env.MASUMI_PAYMENT_SERVICE_URL || 'http://localhost:3000/api/v1'
    const adminKey = params.adminKey || process.env.MASUMI_ADMIN_KEY

    const apiKey = await generateApiKey(serviceUrl, adminKey)

    return {
      success: true,
      apiKey,
      serviceUrl,
      message: 'API key generated successfully. Save this securely!',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate API key',
    }
  }
}

/**
 * Tool: masumi_enable
 *
 * Enable Masumi payments for this agent
 * Auto-provisions wallet and registers on Masumi network
 * Optionally installs payment service if not already configured
 *
 * @param params - Optional configuration parameters
 * @returns Provision status with agent identifier and wallet address
 */
export async function masumi_enable(
  params: {
    agentName?: string
    description?: string
    pricingTier?: 'free' | 'basic' | 'premium'
    installService?: boolean
  } = {},
) {
  try {
    // Check if payment service URL is configured
    const paymentServiceUrl = process.env.MASUMI_PAYMENT_SERVICE_URL

    if (!paymentServiceUrl && params.installService) {
      // Install payment service first
      const installResult = await masumi_install_payment_service({
        network: (process.env.MASUMI_NETWORK || 'Preprod') as Network,
      })

      if (!installResult.success) {
        return {
          success: false,
          error: 'service_installation_failed',
          message: installResult.message,
        }
      }

      // Start service
      await masumi_start_payment_service({
        installPath: installResult.installPath,
        serviceUrl: installResult.serviceUrl,
      })

      // Generate API key
      const apiKeyResult = await masumi_generate_api_key({
        serviceUrl: installResult.serviceUrl,
      })

      if (apiKeyResult.success) {
        // Set environment variable for this session
        process.env.MASUMI_PAYMENT_SERVICE_URL = installResult.serviceUrl
        process.env.MASUMI_PAYMENT_API_KEY = apiKeyResult.apiKey
      }
    }

    const config = loadConfig()

    const service = new AutoProvisionService({
      ...config,
      autoProvision: true,
      agentName: params.agentName,
      agentDescription: params.description,
      pricingTier: params.pricingTier || 'free',
    })

    // Check if already provisioned
    const existing = await service.getProvisionStatus()
    if (existing) {
      return {
        success: true,
        status: 'already_provisioned',
        agentIdentifier: existing.agentIdentifier,
        walletAddress: existing.walletAddress,
        registryUrl: existing.registryUrl,
        message: 'Agent already provisioned and ready to accept payments',
      }
    }

    // Provision new agent
    const result = await service.provision({
      agentName: params.agentName,
      pricingTier: params.pricingTier,
    })

    return {
      success: true,
      status: 'provisioned',
      agentIdentifier: result.agentIdentifier,
      walletAddress: result.walletAddress,
      registryUrl: result.registryUrl,
      credentialsPath: result.credentialsPath,
      message: 'Agent provisioned successfully! You can now accept payments.',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to enable Masumi payments',
    }
  }
}

/**
 * Tool: masumi_create_payment
 *
 * Create a payment request for work to be done
 *
 * @param params - Payment request parameters
 * @returns Payment request with blockchain identifier
 */
export async function masumi_create_payment(params: {
  buyerIdentifier: string
  taskDescription: string
  inputData?: Record<string, unknown>
  payByHours?: number
  submitResultHours?: number
  metadata?: string
}) {
  try {
    const config = loadConfig()

    if (!config.agentIdentifier) {
      return {
        success: false,
        error: 'Agent not provisioned',
        message: 'Run masumi_enable first to provision your agent',
      }
    }

    const manager = new PaymentManager(config)

    const payment = await manager.createPaymentRequest({
      identifierFromPurchaser: params.buyerIdentifier,
      inputData: params.inputData || { task: params.taskDescription },
      payByTime: params.payByHours
        ? new Date(Date.now() + params.payByHours * 60 * 60 * 1000)
        : undefined,
      submitResultTime: params.submitResultHours
        ? new Date(Date.now() + params.submitResultHours * 60 * 60 * 1000)
        : undefined,
      metadata: params.metadata,
    })

    await manager.close()

    return {
      success: true,
      blockchainIdentifier: payment.blockchainIdentifier,
      payByTime: payment.payByTime,
      submitResultTime: payment.submitResultTime,
      state: payment.onChainState || 'Pending',
      nextAction: payment.NextAction.requestedAction,
      requestedFunds: payment.requestedFunds,
      message: `Payment request created. ID: ${payment.blockchainIdentifier}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to create payment request',
    }
  }
}

/**
 * Tool: masumi_check_payment
 *
 * Check the status of a payment
 *
 * @param params - Payment identifier
 * @returns Payment status and details
 */
export async function masumi_check_payment(params: { blockchainIdentifier: string }) {
  try {
    const config = loadConfig()

    const manager = new PaymentManager(config)
    const payment = await manager.checkPaymentStatus(params.blockchainIdentifier)
    await manager.close()

    return {
      success: true,
      blockchainIdentifier: payment.blockchainIdentifier,
      state: payment.onChainState || 'Pending',
      nextAction: payment.NextAction.requestedAction,
      payByTime: payment.payByTime,
      submitResultTime: payment.submitResultTime,
      requestedFunds: payment.requestedFunds,
      message: `Payment state: ${payment.onChainState || 'Pending'}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to check payment status',
    }
  }
}

/**
 * Tool: masumi_complete_payment
 *
 * Submit work result and complete payment
 *
 * @param params - Payment identifier and result data
 * @returns Updated payment status
 */
export async function masumi_complete_payment(params: {
  blockchainIdentifier: string
  resultData: Record<string, unknown> | string
}) {
  try {
    const config = loadConfig()

    const manager = new PaymentManager(config)

    const outputData =
      typeof params.resultData === 'string' ? params.resultData : JSON.stringify(params.resultData)

    const payment = await manager.submitResult(params.blockchainIdentifier, outputData)
    await manager.close()

    return {
      success: true,
      blockchainIdentifier: payment.blockchainIdentifier,
      state: payment.onChainState || 'ResultSubmitted',
      message: 'Work result submitted successfully. Waiting for funds to be released.',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to submit work result',
    }
  }
}

/**
 * Tool: masumi_wallet_balance
 *
 * Get wallet balance
 *
 * @returns Wallet balance in ADA and lovelace
 */
export async function masumi_wallet_balance() {
  try {
    const config = loadConfig()

    const manager = new PaymentManager(config)
    const balance = await manager.getWalletBalance()
    await manager.close()

    const adaAmount = parseInt(balance.ada) / 1_000_000

    return {
      success: true,
      ada: adaAmount,
      lovelace: balance.ada,
      tokens: balance.tokens || [],
      message: `Wallet balance: ${adaAmount} ADA`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to get wallet balance',
    }
  }
}

/**
 * Tool: masumi_list_payments
 *
 * List payment history
 *
 * @param params - Pagination parameters
 * @returns List of payments
 */
export async function masumi_list_payments(params: { limit?: number } = {}) {
  try {
    const config = loadConfig()

    const manager = new PaymentManager(config)
    const { payments, nextCursorId } = await manager.listPayments({
      limit: params.limit || 10,
    })
    await manager.close()

    return {
      success: true,
      payments: payments.map((p) => ({
        blockchainIdentifier: p.blockchainIdentifier,
        state: p.onChainState,
        payByTime: p.payByTime,
        submitResultTime: p.submitResultTime,
      })),
      nextCursorId,
      count: payments.length,
      message: `Found ${payments.length} payment(s)`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to list payments',
    }
  }
}

/**
 * Tool: masumi_search_agents
 *
 * Search for agents on Masumi network
 *
 * @param params - Search filters
 * @returns List of matching agents
 */
export async function masumi_search_agents(
  params: {
    capability?: string
    pricingType?: 'Fixed' | 'Variable' | 'Free'
    tags?: string[]
    limit?: number
  } = {},
) {
  try {
    const config = loadConfig()

    const registry = new RegistryManager({
      network: config.network,
      registryApiKey: config.paymentApiKey || '',
    })

    const agents = await registry.searchAgents({
      network: config.network,
      capability: params.capability,
      pricingType: params.pricingType,
      tags: params.tags,
      limit: params.limit || 10,
      state: 'Active',
    })

    await registry.close()

    return {
      success: true,
      agents: agents.map((a) => ({
        agentIdentifier: a.agentIdentifier,
        name: a.name,
        description: a.description,
        capability: a.Capability.name,
        pricingType: a.Pricing.pricingType,
        apiBaseUrl: a.apiBaseUrl,
      })),
      count: agents.length,
      message: `Found ${agents.length} agent(s)`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to search agents',
    }
  }
}

/**
 * Tool: masumi_get_agent
 *
 * Get details of a specific agent
 *
 * @param params - Agent identifier
 * @returns Agent details
 */
export async function masumi_get_agent(params: { agentIdentifier: string }) {
  try {
    const config = loadConfig()

    const registry = new RegistryManager({
      network: config.network,
      registryApiKey: config.paymentApiKey || '',
    })

    const agent = await registry.getAgent(params.agentIdentifier, config.network)
    await registry.close()

    return {
      success: true,
      agent: {
        agentIdentifier: agent.agentIdentifier,
        name: agent.name,
        description: agent.description,
        state: agent.state,
        capability: agent.Capability,
        author: agent.Author,
        pricing: agent.Pricing,
        apiBaseUrl: agent.apiBaseUrl,
        tags: agent.tags,
      },
      message: `Agent: ${agent.name}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to get agent details',
    }
  }
}

/**
 * Export all masumi tools
 */
export const MasumiTools = {
  masumi_enable,
  masumi_create_payment,
  masumi_check_payment,
  masumi_complete_payment,
  masumi_wallet_balance,
  masumi_list_payments,
  masumi_search_agents,
  masumi_get_agent,
}

export default MasumiTools
