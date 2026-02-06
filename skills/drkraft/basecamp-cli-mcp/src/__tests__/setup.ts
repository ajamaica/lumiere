import { setupServer } from 'msw/node'
import path from 'path'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { handlers } from './mocks/handlers'

// Create MSW server with handlers
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})

// Mock environment variables for tests
process.env.BASECAMP_CLIENT_ID = 'test-client-id'
process.env.BASECAMP_CLIENT_SECRET = 'test-client-secret'
process.env.BASECAMP_ACCESS_TOKEN = 'test-access-token'
process.env.NODE_ENV = 'test'
process.env.BASECAMP_CONFIG_DIR = path.join(process.cwd(), '.tmp', 'basecamp-cli-test')

// Mock auth module to bypass token validation in API tests
vi.mock('../lib/auth.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getValidAccessToken: vi.fn(() => Promise.resolve('test-access-token')),
  }
})

// Mock getCurrentAccountId to return test account ID
vi.mock('../lib/config.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getCurrentAccountId: vi.fn(() => 99999999),
  }
})
