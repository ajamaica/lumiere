module.exports = {
  preset: 'jest-expo',
  testRegex: '(/__tests__/.*\\.(test|spec))\\.[jt]sx?$',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
}
