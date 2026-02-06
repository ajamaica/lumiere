#!/usr/bin/env node
/**
 * TreeListy CLI for OpenClaw
 * Hierarchical decomposition and project planning
 *
 * Copyright (c) 2024-2026 Prairie2Cloud LLC
 * Licensed under Apache-2.0
 */

const fs = require('fs')
const path = require('path')
const { getPatternSummaries, getPatternDetail, getPatternKeys } = require('./patterns')
const { decompose, decomposeWithSuggestions } = require('./decompose')
const { exportTree } = require('./export')
const { validate } = require('./validate')
const { push, checkConnection } = require('./push')

const VERSION = '1.0.0'

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const parsed = {
    command: null,
    options: {},
    positional: [],
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]

      if (nextArg && !nextArg.startsWith('-')) {
        parsed.options[key] = nextArg
        i += 2
      } else {
        parsed.options[key] = true
        i++
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1)
      const nextArg = args[i + 1]

      if (nextArg && !nextArg.startsWith('-')) {
        parsed.options[key] = nextArg
        i += 2
      } else {
        parsed.options[key] = true
        i++
      }
    } else if (!parsed.command) {
      parsed.command = arg
      i++
    } else {
      parsed.positional.push(arg)
      i++
    }
  }

  return parsed
}

/**
 * Read input from file or stdin
 */
function readInput(inputPath) {
  if (!inputPath || inputPath === '-') {
    // Read from stdin if available
    if (!process.stdin.isTTY) {
      return fs.readFileSync(0, 'utf8')
    }
    return null
  }

  const resolved = path.resolve(inputPath)
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`)
  }
  return fs.readFileSync(resolved, 'utf8')
}

/**
 * Parse JSON input
 */
function parseJSON(content) {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`)
  }
}

/**
 * Commands
 */

async function cmdPatterns(options) {
  const { name, detail } = options

  if (name) {
    const pattern = getPatternDetail(name)
    if (!pattern) {
      console.error(`Unknown pattern: ${name}`)
      console.log(`Available patterns: ${getPatternKeys().join(', ')}`)
      process.exit(1)
    }

    if (detail) {
      console.log(JSON.stringify(pattern, null, 2))
    } else {
      console.log(`${pattern.icon} ${pattern.name}`)
      console.log(`  ${pattern.description}`)
      console.log(`  Levels: ${pattern.levels.join(' → ')}`)
      console.log(
        `  Types: ${pattern.types.slice(0, 5).join(', ')}${pattern.types.length > 5 ? '...' : ''}`,
      )
      console.log(`  Fields: ${pattern.fieldCount}`)
    }
  } else {
    const summaries = getPatternSummaries()
    console.log('Available TreeListy Patterns:')
    console.log('')
    for (const p of summaries) {
      console.log(`  ${p.icon} ${p.key.padEnd(16)} ${p.name}`)
      console.log(`     ${p.description}`)
    }
    console.log('')
    console.log(`Use --name <pattern> to see details, --detail for full JSON.`)
  }
}

async function cmdDecompose(options) {
  const { pattern = 'generic', input, format = 'json', depth = 3, name } = options

  // Read input
  let inputText = null
  if (input) {
    try {
      inputText = readInput(input)
    } catch (e) {
      // If it's not a file, treat it as the topic text
      inputText = input
    }
  }

  // Generate tree
  const tree = decompose(inputText, pattern, { depth: parseInt(depth), projectName: name })

  // Output in requested format
  const output = exportTree(tree, format)
  console.log(output)
}

async function cmdExport(options) {
  const { input, format = 'markdown', output: outputPath, pretty = true } = options

  if (!input) {
    console.error('Error: --input is required (path to tree JSON file)')
    process.exit(1)
  }

  // Read and parse tree
  const content = readInput(input)
  const tree = parseJSON(content)

  // Export
  const exported = exportTree(tree, format, { pretty: pretty !== 'false' })

  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), exported)
    console.log(`Exported to ${outputPath}`)
  } else {
    console.log(exported)
  }
}

async function cmdValidate(options) {
  const { input, format = 'text' } = options

  if (!input) {
    console.error('Error: --input is required (path to tree JSON file)')
    process.exit(1)
  }

  // Read and parse tree
  const content = readInput(input)
  const tree = parseJSON(content)

  // Validate
  const result = validate(tree)

  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Validation Report for: ${tree.name}`)
    console.log('='.repeat(40))
    console.log(`Pattern: ${result.pattern}`)
    console.log(`Score: ${result.score}/100 (${result.scoreLabel})`)
    console.log(`Valid: ${result.valid ? 'Yes' : 'No'}`)
    console.log('')
    console.log('Structure:')
    console.log(`  Total nodes: ${result.structure.total}`)
    console.log(`  Phases: ${result.structure.phase}`)
    console.log(`  Items: ${result.structure.item}`)
    console.log(`  Subtasks: ${result.structure.subtask}`)
    console.log(`  Max depth: ${result.structure.maxDepth}`)
    console.log(`  Balanced: ${result.structure.isBalanced ? 'Yes' : 'No'}`)
    console.log('')

    if (result.issues.total > 0) {
      console.log(`Issues (${result.issues.total}):`)
      for (const issue of result.details) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`  ${icon} ${issue.message}`)
        console.log(`     at: ${issue.path}`)
      }
      console.log('')
    }

    if (result.suggestions.length > 0) {
      console.log('Suggestions:')
      for (const suggestion of result.suggestions) {
        console.log(`  → ${suggestion}`)
      }
    }
  }
}

async function cmdPush(options) {
  const { input, port = 3456, token, host = 'localhost' } = options

  if (!input) {
    console.error('Error: --input is required (path to tree JSON file)')
    process.exit(1)
  }

  // Check connection first
  console.log(`Checking TreeListy connection at ${host}:${port}...`)
  const status = await checkConnection({ port: parseInt(port), host })

  if (!status.available) {
    console.error(`Cannot connect to TreeListy.`)
    console.error('Make sure TreeListy is open in your browser with MCP bridge enabled.')
    console.error(`Reason: ${status.reason}`)
    process.exit(1)
  }

  console.log('Connected. Pushing tree...')

  // Read and parse tree
  const content = readInput(input)
  const tree = parseJSON(content)

  try {
    const result = await push(tree, { port: parseInt(port), token, host })
    console.log(`✅ ${result.message}`)
    console.log(`   Tree ID: ${result.treeId}`)
    console.log(`   Nodes: ${result.nodeCount}`)
  } catch (e) {
    console.error(`❌ Push failed: ${e.message}`)
    process.exit(1)
  }
}

function cmdHelp() {
  console.log(`
TreeListy CLI v${VERSION}
Hierarchical decomposition and project planning for OpenClaw agents

COMMANDS:
  patterns              List all 21 available patterns
    --name <key>        Show details for a specific pattern
    --detail            Output full JSON schema

  decompose             Create structured tree from text input
    --pattern <key>     Pattern to apply (default: generic)
    --input <text|file> Topic text or file path (or stdin)
    --name <name>       Override the root node name
    --depth <1-4>       Maximum depth (default: 3)
    --format <fmt>      Output format: json, markdown, mermaid

  export                Convert tree JSON to other formats
    --input <file>      Path to tree JSON file (required)
    --format <fmt>      Output format: json, markdown, mermaid, csv, checklist, html
    --output <file>     Write to file instead of stdout

  validate              Check tree structure and quality
    --input <file>      Path to tree JSON file (required)
    --format <fmt>      Output format: text, json

  push                  Send tree to running TreeListy instance
    --input <file>      Path to tree JSON file (required)
    --port <port>       WebSocket port (default: 3456)
    --token <token>     Session token for authentication
    --host <host>       Host address (default: localhost)

  help                  Show this help message
  version               Show version

EXAMPLES:
  # List all patterns
  node treelisty-cli.js patterns

  # Create a WBS for a project
  node treelisty-cli.js decompose --pattern wbs --input "Build a SaaS product"

  # Create tree from structured input
  echo "# My Project
  ## Phase 1
  - Task A
  - Task B" | node treelisty-cli.js decompose --format json

  # Export tree to Mermaid diagram
  node treelisty-cli.js export --input tree.json --format mermaid

  # Validate tree structure
  node treelisty-cli.js validate --input tree.json

  # Push tree to live TreeListy
  node treelisty-cli.js push --input tree.json --port 3456
`)
}

function cmdVersion() {
  console.log(`TreeListy CLI v${VERSION}`)
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)
  const { command, options } = parseArgs(args)

  try {
    switch (command) {
      case 'patterns':
        await cmdPatterns(options)
        break
      case 'decompose':
        await cmdDecompose(options)
        break
      case 'export':
        await cmdExport(options)
        break
      case 'validate':
        await cmdValidate(options)
        break
      case 'push':
        await cmdPush(options)
        break
      case 'help':
      case '--help':
      case '-h':
        cmdHelp()
        break
      case 'version':
      case '--version':
      case '-v':
        cmdVersion()
        break
      default:
        if (!command) {
          cmdHelp()
        } else {
          console.error(`Unknown command: ${command}`)
          console.log('Run "treelisty-cli help" for usage.')
          process.exit(1)
        }
    }
  } catch (e) {
    console.error(`Error: ${e.message}`)
    process.exit(1)
  }
}

main()
