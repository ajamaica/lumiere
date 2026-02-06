#!/usr/bin/env node

/**
 * Project Lock Manager CLI
 * General project management using environment-based naming
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT_DIR = __dirname;

/**
 * Run a sub-command
 */
function runCommand(cmd, args = []) {
  // Use absolute path to avoid module resolution issues
  const scriptPath = path.resolve(SCRIPT_DIR, 'cli.js');
  const nodeArgs = ['node', scriptPath, ...args];

  try {
    const result = spawnSync('node', nodeArgs, {
      stdio: 'inherit',
      env: { ...process.env }
    });

    if (result.status !== 0) {
      console.error(`Command failed with code ${result.status}`);
      process.exit(1);
    }

    return result.stdout.trim();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main CLI
 */
function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  const commands = {
    'discover': 'Find all projects with .project-lock files',
    'list': 'List all discovered projects',
    'create': 'Create a new .project-lock file',
    'switch': 'Switch active project context',
    'validate': 'Validate a path operation against project rules',
    'status': 'Show current project and lock file info',
    'help': 'Show this help message'
  };

  if (!command || !commands[command]) {
    console.log('Project Lock Manager - General project management\n');
    console.log('\nCommands:\n');
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(12)} - ${desc}`);
    });
    console.log('\nUsage: node cli.js <command> [args...]\n');
    console.log('\nExamples:');
    console.log('  node cli.js discover');
    console.log('  node cli.js create ~/projects/my-app');
    console.log('  node cli.js create ~/projects/my-app --name "my-project"');
    console.log('  node cli.js switch stacean-repo');
    console.log('  node cli.js validate /home/clawdbot/stacean-repo/app/');
    process.exit(0);
  }

  const output = runCommand(command, args);

  if (output) console.log(output);
}

if (require.main === module) {
  main();
}

module.exports = { runCommand };
