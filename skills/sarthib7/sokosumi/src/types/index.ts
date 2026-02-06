// Sokosumi marketplace types for OpenClaw integration

export interface SokosumiAgent {
  id: string
  name: string
  description: string
  apiBaseUrl: string
  capabilities?: string[]
  pricing?: {
    type: 'fixed' | 'variable'
    credits?: number
    amounts?: Array<{
      amount: string
      unit: string
    }>
  }
  author?: {
    name: string
    contactEmail?: string
  }
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface SokosumiJob {
  id: string
  agentId: string
  userId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  inputData: Record<string, unknown>
  result?: Record<string, unknown>
  masumiJobId?: string
  masumiJobStatus?: string
  cost?: {
    credits: number
    cents: number
  }
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface SokosumiCreateJobRequest {
  inputData: Record<string, unknown>
  maxAcceptedCredits: number
  name?: string
  sharePublic?: boolean
  shareOrganization?: boolean
}

export interface SokosumiCreateJobResponse {
  data: SokosumiJob
}

export interface SokosumiListAgentsResponse {
  data: SokosumiAgent[]
}

export interface SokosumiJobResponse {
  data: SokosumiJob
}

export interface SokosumiInputSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

export interface SokosumiInputSchemaResponse {
  data: SokosumiInputSchema
}

export interface SokosumiPaymentInfo {
  blockchainIdentifier: string
  payByTime: string
  network: 'Preprod' | 'Mainnet'
  estimatedCost: {
    credits: number
    ada?: string
  }
}

export interface SokosumiConfig {
  enabled?: boolean
  apiEndpoint?: string
  apiKey?: string
  /**
   * Payment mode: "simple" or "advanced"
   * - simple: Sokosumi handles payments (just need API key, pays in USDM)
   * - advanced: Self-hosted masumi-payment-service (need wallet, pays in ADA)
   * Auto-detected based on configuration if not specified
   */
  mode?: 'simple' | 'advanced'
  /**
   * Advanced mode only: Self-hosted payment service configuration
   * Only needed if you want to manage your own wallet and pay in ADA
   */
  payment?: {
    serviceUrl?: string
    adminApiKey?: string
    network?: 'Preprod' | 'Mainnet'
  }
}

export interface SokosumiClientConfig {
  apiEndpoint: string
  apiKey: string
  timeout?: number
}

export type SokosumiError =
  | { type: 'unauthorized'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'insufficient_balance'; message: string }
  | { type: 'invalid_input'; message: string }
  | { type: 'network_error'; message: string; cause?: unknown }
  | { type: 'api_error'; message: string; statusCode?: number }
