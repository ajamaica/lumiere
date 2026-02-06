import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import fetch from 'node-fetch'
import { homedir } from 'os'
import { join } from 'path'

import type { Network } from '../../../shared/types/config'

/**
 * Payment service installation options
 */
export interface InstallPaymentServiceOptions {
  installPath?: string
  network?: Network
  gitUrl?: string
}

/**
 * Payment service installation result
 */
export interface PaymentServiceInstallResult {
  serviceUrl: string
  installPath: string
  network: Network
  status: 'installed' | 'already_exists'
}

/**
 * Payment service status
 */
export interface PaymentServiceStatus {
  running: boolean
  url: string
  healthCheck?: {
    status: string
    version?: string
  }
}

/**
 * Install masumi-payment-service locally
 *
 * Clones the repository and installs dependencies.
 *
 * @param options - Installation options
 * @returns Installation result with service URL
 */
export async function installPaymentService(
  options: InstallPaymentServiceOptions = {},
): Promise<PaymentServiceInstallResult> {
  const defaultPath = join(homedir(), '.masumi', 'payment-service')
  const installPath = options.installPath || defaultPath
  const network = options.network || 'Preprod'
  const gitUrl = options.gitUrl || 'https://github.com/masumi-network/masumi-payment-service.git'

  // Check if already installed
  try {
    await fs.access(join(installPath, 'package.json'))
    return {
      serviceUrl: `http://localhost:3000/api/v1`,
      installPath,
      network,
      status: 'already_exists',
    }
  } catch {
    // Not installed, continue
  }

  // Ensure parent directory exists
  await fs.mkdir(installPath, { recursive: true })

  // Check if git is available
  try {
    execSync('git --version', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'Git is not installed. Please install Git to clone the payment service repository.',
    )
  }

  // Check if Node.js is available
  try {
    execSync('node --version', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'Node.js is not installed. Please install Node.js (v18+) to run the payment service.',
    )
  }

  // Clone repository
  console.log(`Cloning masumi-payment-service to ${installPath}...`)
  execSync(`git clone ${gitUrl} ${installPath}`, { stdio: 'inherit' })

  // Install dependencies
  console.log('Installing dependencies...')
  execSync('npm install', { cwd: installPath, stdio: 'inherit' })

  return {
    serviceUrl: `http://localhost:3000/api/v1`,
    installPath,
    network,
    status: 'installed',
  }
}

/**
 * Check if payment service is running
 *
 * @param serviceUrl - Service URL (default: http://localhost:3000/api/v1)
 * @returns Service status
 */
export async function checkPaymentServiceStatus(
  serviceUrl: string = 'http://localhost:3000/api/v1',
): Promise<PaymentServiceStatus> {
  try {
    const healthUrl = serviceUrl.replace('/api/v1', '/health')
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 5000,
    })

    if (response.ok) {
      const healthData = await response.json()
      return {
        running: true,
        url: serviceUrl,
        healthCheck: {
          status: 'healthy',
          version: healthData.version,
        },
      }
    }

    return {
      running: false,
      url: serviceUrl,
    }
  } catch {
    return {
      running: false,
      url: serviceUrl,
    }
  }
}

/**
 * Start payment service
 *
 * @param installPath - Path where service is installed
 * @param network - Cardano network
 * @returns Service status
 */
export async function startPaymentService(
  installPath: string,
  network: Network = 'Preprod',
): Promise<PaymentServiceStatus> {
  // Check if service is already running
  const status = await checkPaymentServiceStatus()
  if (status.running) {
    return status
  }

  // Check if service is installed
  try {
    await fs.access(join(installPath, 'package.json'))
  } catch {
    throw new Error(`Payment service not found at ${installPath}. Run installPaymentService first.`)
  }

  // Start service in background
  // Note: In production, you might want to use PM2 or similar process manager
  console.log(`Starting payment service at ${installPath}...`)
  console.log('Network:', network)
  console.log('Service URL: http://localhost:3000/api/v1')
  console.log(
    'Note: Service is starting in background. Use a process manager (PM2, systemd) for production.',
  )

  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NETWORK: network,
    PORT: '3000',
  }

  // Start with npm start (non-blocking)
  // In a real implementation, you'd use a process manager
  execSync('npm start', {
    cwd: installPath,
    env,
    stdio: 'inherit',
    detached: true,
  })

  // Wait a bit for service to start
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Check status
  return await checkPaymentServiceStatus()
}

/**
 * Generate API key via payment service
 *
 * Calls the payment service's POST /api-key endpoint to generate an admin API key.
 *
 * @param serviceUrl - Payment service URL
 * @param adminKey - Admin key from payment service configuration (if required)
 * @returns Generated API key
 */
export async function generateApiKey(serviceUrl: string, adminKey?: string): Promise<string> {
  const apiKeyUrl = `${serviceUrl}/api-key`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (adminKey) {
    headers['Authorization'] = `Bearer ${adminKey}`
  }

  try {
    const response = await fetch(apiKeyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        permissions: ['ReadAndPay', 'Read', 'Admin'],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to generate API key: ${response.status} ${response.statusText}. ${errorText}`,
      )
    }

    const data = await response.json()
    return data.apiKey || data.data?.apiKey || data.key
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to generate API key: ${String(error)}`)
  }
}
