module.exports = {
  preset: 'jest-expo',
  testRegex: '(/__tests__/.*\\.(test|spec))\\.[jt]sx?$',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@openrouter/sdk$': '<rootDir>/__mocks__/@openrouter/sdk.ts',
    '^@noble/curves/(.+)$': '@noble/curves/$1.js',
  },
}
