import type { Options } from '@wdio/types'

const config: Options.Testrunner = {
  runner: 'local',
  tsConfigPath: './tsconfig.e2e.json',

  specs: ['../specs/**/*.spec.ts'],
  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      platformName: 'iOS',
      'appium:deviceName': process.env.SAUCE_IOS_DEVICE || 'iPhone 15',
      'appium:platformVersion': process.env.SAUCE_IOS_VERSION || '17',
      'appium:automationName': 'XCUITest',
      'appium:app': process.env.SAUCE_APP || 'storage:filename=lumiere.ipa',
      'appium:noReset': false,
      'appium:fullReset': false,
      'sauce:options': {
        name: 'Lumiere iOS E2E Tests',
        build: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
        appiumVersion: 'latest',
      },
    },
  ],

  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  region: (process.env.SAUCE_REGION as 'us' | 'eu') || 'us',

  services: ['sauce'],

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: './e2e/results',
        outputFileFormat: () => 'results-ios.xml',
      },
    ],
  ],

  logLevel: 'info',
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
}

export { config }
