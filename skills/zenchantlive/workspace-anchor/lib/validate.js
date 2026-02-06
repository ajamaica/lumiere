#!/usr/bin/env node

/**
 * Path validation - Check if operations are allowed for current project
 * Integrates with existing project-enforcer.sh for compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    },
    defaultIgnorePatterns: [
      'node_modules',
      '.git',
      '.next',
      '.venv'
    ]
  };
}

const { expandPath } = require('./discover');

/**
 * Get current project from lock file
 */
function getCurrentProject() {
  const enforcerScript = path.join(__dirname, '../../../bin/project-enforcer.sh');

  if (!fs.existsSync(enforcerScript)) {
    return {
      error: 'Enforcer script not found',
      project: null
    };
  }

  try {
    // Find .project-lock file for current session project
    const output = execSync('bash -c "cat ~/clawd/.project-lock | grep ROOT:" | sed \'s/ROOT: //\'"', { encoding: 'utf8' }).trim();

    if (!output) {
      return {
        error: 'No current project set',
        project: null
      };
    }

    const currentRoot = expandPath(output);

    // Try to find the actual lock file location
    const lockFiles = execSync(
      `find "${currentRoot}" -name ".project-lock" 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(f => f.trim());

    if (lockFiles.length === 0) {
      return {
        error: 'No lock file found',
        project: {
          root: currentRoot,
          lockFile: null
        }
      };
    }

    const lockFile = lockFiles[0];
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

    return {
      error: null,
      project: {
        name: content.NAME,
        root: currentRoot,
        lockFile,
        ignore: content.IGNORE || []
      }
    };
  } catch (e) {
    return {
      error: `Failed to read project info: ${e.message}`,
      project: null
    };
  }
}

/**
 * Check if path is allowed (within project)
 */
function validatePath(targetPath, currentProject) {
  if (!currentProject) {
    return {
      allowed: false,
      reason: 'No current project set',
      status: 'WARN'
    };
  }

  const targetAbs = path.resolve(expandPath(targetPath));

  // Check if target is within current project root
  const currentRoot = currentProject.root;
  const targetRelative = path.relative(currentRoot, targetAbs);

  // If target starts with ../, it's outside current project
  if (targetRelative.startsWith('..') || !targetRelative.startsWith(currentRoot)) {
    return {
      allowed: false,
      reason: 'Path outside current project',
      status: 'BLOCK'
    };
  }

  // Check IGNORE patterns
  if (currentProject.ignore && currentProject.ignore.length > 0) {
    for (const pattern of currentProject.ignore) {
      if (targetAbs.includes(pattern) || path.basename(targetAbs).includes(pattern)) {
        return {
          allowed: false,
          reason: `Path matches IGNORE pattern: ${pattern}`,
          status: 'WARN'
        };
      }
    }
  }

  // If we get here, path is allowed
  return {
    allowed: true,
    reason: 'Path is within current project',
    status: 'ALLOW'
  };
}

/**
 * Use existing enforcer for validation (compatibility)
 */
function validateWithEnforcer(targetPath) {
  const enforcerScript = path.join(__dirname, '../../../bin/project-enforcer.sh');

  if (!fs.existsSync(enforcerScript)) {
    console.error('Enforcer script not found');
    return {
      result: 'UNKNOWN',
      reason: 'Enforcer not available'
    };
  }

  try {
    const output = execSync(
      `bash "${enforcerScript}" "${targetPath}" current`,
      { encoding: 'utf8' }
    ).trim();

    return {
      result: output.split(' ')[0] || 'UNKNOWN',
      reason: output.includes('BLOCK') ? output : null
    };
  } catch (e) {
    return {
      result: 'ERROR',
      reason: e.message
    };
  }
}

/**
 * Main function
 */
if (require.main === module) {
  const action = process.argv[2] || 'status';
  const targetPath = process.argv[3];

  if (action === 'status') {
    const project = getCurrentProject();

    if (project.error) {
      console.log(`Status: ${project.error}`);
    } else {
      console.log(`\n=== Current Project ===\n`);
      console.log(`Name: ${project.project.name}`);
      console.log(`Root: ${project.project.root}`);
      console.log(`Lock: ${project.project.lockFile}`);
      console.log(`Ignore: ${project.project.ignore.join(', ') || '(none)'}`);
    }
  } else if (action === 'validate') {
    if (!targetPath) {
      console.error('Usage: node validate.js validate <target-path>');
      process.exit(1);
    }

    const project = getCurrentProject();

    if (project.error) {
      console.error(`Cannot validate: ${project.error}`);
      process.exit(1);
    }

    const validation = validatePath(targetPath, project.project);
    const enforcerResult = validateWithEnforcer(targetPath);

    console.log(`\n=== Path Validation ===\n`);
    console.log(`Target: ${targetPath}`);
    console.log(`Validation: ${validation.status} - ${validation.reason}`);
    console.log(`Enforcer: ${enforcerResult.result} ${enforcerResult.reason ? '(' + enforcerResult.reason + ')' : ''}`);

    // Exit code based on result
    if (validation.status === 'BLOCK') {
      process.exit(1);
    }
  } else {
    console.error('Usage: node validate.js <action>');
    console.error('\nActions:');
    console.error('  status - Show current project info');
    console.error('  validate <path> - Validate a path');
    process.exit(1);
  }
}

module.exports = { validatePath, validateWithEnforcer, getCurrentProject };
