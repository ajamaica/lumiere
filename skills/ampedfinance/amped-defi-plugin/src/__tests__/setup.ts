/**
 * Jest Test Setup
 */

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Set default test environment
process.env.AMPED_OC_MODE = 'execute'
process.env.AMPED_OC_WALLETS_JSON = JSON.stringify({
  test: {
    address: '0x1234567890123456789012345678901234567890',
    privateKey: '0xabc123def456',
  },
})
process.env.AMPED_OC_RPC_URLS_JSON = JSON.stringify({
  ethereum: 'https://eth-mainnet.example.com',
  arbitrum: 'https://arb-mainnet.example.com',
  sonic: 'https://rpc.sonic.example.com',
})

// Global test timeout
jest.setTimeout(10000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
