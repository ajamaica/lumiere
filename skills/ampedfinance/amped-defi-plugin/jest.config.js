/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Transform ESM modules from @sodax packages
  transformIgnorePatterns: ['node_modules/(?!(@sodax)/)'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sodax/sdk$': '<rootDir>/src/__mocks__/@sodax/sdk.ts',
    '^@sodax/types$': '<rootDir>/src/__mocks__/@sodax/sdk.ts',
    '^@sodax/wallet-sdk-core$': '<rootDir>/src/__mocks__/@sodax/sdk.ts',
  },
  verbose: true,
}
