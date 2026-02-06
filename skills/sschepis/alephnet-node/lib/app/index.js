/**
 * Application Module Index
 *
 * Exports all application components for the Sentient Observer.
 */

// Use static imports for ES modules
import { parseArgs, printHelp } from './args.js'
import { SentientCLI } from './cli.js'
import { colors, MIME_TYPES } from './constants.js'
import { SentientServer } from './server.js'
import {
  clearScreen,
  getSentientSystemPrompt,
  initializeObserver,
  Spinner,
  truncateToolContent,
} from './shared.js'

export {
  clearScreen,
  // Constants
  colors,
  // Shared utilities
  getSentientSystemPrompt,
  initializeObserver,
  MIME_TYPES,
  // Argument parsing
  parseArgs,
  printHelp,
  // Main application classes
  SentientCLI,
  SentientServer,
  Spinner,
  truncateToolContent,
}

export default {
  colors,
  MIME_TYPES,
  parseArgs,
  printHelp,
  getSentientSystemPrompt,
  initializeObserver,
  truncateToolContent,
  clearScreen,
  Spinner,
  SentientCLI,
  SentientServer,
}
