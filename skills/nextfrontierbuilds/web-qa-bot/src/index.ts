/**
 * web-qa-bot - AI-powered web application QA automation
 *
 * @packageDocumentation
 */

// Main exports
export { QABot } from './bot.js'
export { Browser } from './browser.js'
export { formatDuration, generateReportFromFile, Reporter } from './reporter.js'
export { smokeTest } from './smoke.js'

// Assertions
export {
  AssertionError,
  expectClickable,
  expectConsoleEvent,
  expectCount,
  expectModal,
  expectNoErrors,
  expectNotVisible,
  expectState,
  expectText,
  expectTitle,
  expectUrl,
  expectVisible,
  softExpect,
} from './assertions.js'

// Utilities
export { categorizeError, ConsoleMonitor, filterBySeverity } from './utils/console.js'
export {
  detectModals,
  detectStaleRefs,
  diffSnapshots,
  elementExists,
  findAllByRole,
  findByRole,
  findByText,
  getInteractiveElements,
  parseSnapshot,
  resolveRef,
} from './utils/snapshot.js'
export {
  isPageLoading,
  retry,
  sleep,
  waitFor,
  waitForStableSnapshot,
  waitStrategyToArgs,
} from './utils/wait.js'

// Types
export type {
  ConsoleEvent,
  ElementRef,
  QABotConfig,
  ReportOptions,
  SmokeCheck,
  SmokeTestOptions,
  Snapshot,
  StepResult,
  SuiteResult,
  TestCase,
  TestResult,
  TestStatus,
  TestStep,
  TestSuite,
  WaitStrategy,
} from './types.js'
