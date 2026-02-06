const { createDefaultPreset } = require('ts-jest')

const tsJestTransformCfg = createDefaultPreset().transform

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.d\\.ts$',
    '/benchmarks/',
    '/integration/',
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
}
