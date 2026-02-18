module.exports = {
  preset: 'jest-expo',
  testRegex: '(/__tests__/.*\\.(test|spec))\\.[jt]sx?$',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@openrouter/sdk$': '<rootDir>/__mocks__/@openrouter/sdk.ts',
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
  },
}
