#!/usr/bin/env node

/**
 * Create new .project-lock files for arbitrary project paths
 */

const fs = require('fs');
const path = require('path');

// Load defaults
const defaultsPath = path.join(__dirname, '../config/defaults.json');
let defaults;

try {
  defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
} catch (e) {
  defaults = {
    paths: {
      CLAWD_ROOT: '~/clawd',
      PROJECTS_DIR: '~/projects',
      USER_HOME: '~'
    }
  };
}

const { expandPath } = require('./discover');

/**
 * Generate .project-lock file content
 */
function generateLockFileContent(rootPath, options) {
  const root = expandPath(rootPath);
  const name = options.name || path.basename(root);

  // Validate root exists
  if (!fs.existsSync(root)) {
    return {
      error: `Root path does not exist: ${root}`
    };
  }

  const content = {
    NAME: name,
    ROOT: root,
    IGNORE: options.ignore || defaults.defaultIgnorePatterns
  };

  return {
    name,
    root,
    lockPath: path.join(root, '.project-lock'),
    content: JSON.stringify(content, null, 2),
    error: null
  };
}

/**
 * Create .project-lock file
 */
function createLockFile(rootPath, options = {}) {
  const result = generateLockFileContent(rootPath, options);

  if (result.error) {
    return result;
  }

  try {
    fs.writeFileSync(result.lockPath, result.content);
    return {
      name: result.name,
      root: result.root,
      lockFile: result.lockPath,
      error: null
    };
  } catch (e) {
    return {
      name: result.name,
      root: result.root,
      lockFile: result.lockPath,
      error: `Failed to write lock file: ${e.message}`
    };
  }
}

/**
 * Main function
 */
if (require.main === module) {
  const rootPath = process.argv[2];
  let name = null;

  // Parse args
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === '--name') {
      name = process.argv[++i];
    }
  }

  if (!rootPath) {
    console.error('Usage: node create.js <root-path> [--name <project-name>]');
    console.error('\nExamples:');
    console.error('  node create.js ~/projects/my-app');
    console.error('  node create.js ~/projects/my-app --name "my-project"');
    console.error('  node create.js /home/jordan/work/project --name "work-project"');
    process.exit(1);
  }

  const result = createLockFile(rootPath, { name });

  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Project lock file created:`);
  console.log(`\nName: ${result.name}`);
  console.log(`Root: ${result.root}`);
  console.log(`Lock: ${result.lockFile}`);
  console.log(`\nTo switch to this project:`);
  console.log(`  [PROJECT: ${result.name}]`);
}

module.exports = { createLockFile, generateLockFileContent };
