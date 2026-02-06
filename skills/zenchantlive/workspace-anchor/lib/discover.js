#!/usr/bin/env node

/**
 * Project Discovery - Finds all projects with .project-lock files
 * Uses environment variables and multiple search locations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load defaults
const defaultsPath = path.resolve(__dirname, '../config/defaults.json');
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
    additionalRoots: []
  };
}

/**
 * Expand environment variables (~, $HOME, etc.)
 */
function expandPath(p) {
  if (!p) return p;

  if (p.startsWith('~/')) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    return p.replace('~', home);
  }

  if (p.startsWith('$HOME/')) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    return p.replace('$HOME', home);
  }

  if (p.startsWith('$USERPROFILE/')) {
    const home = process.env.USERPROFILE || '.';
    return p.replace('$USERPROFILE', home);
  }

  // Expand env vars like $CLAWD_ROOT
  const envVarMatch = p.match(/^\$([A-Z_]+)/);
  if (envVarMatch) {
    const value = process.env[envVarMatch[1]];
    if (value) {
      return value;
    }
  }

  return p;
}

/**
 * Get all search locations for projects
 */
function getSearchLocations() {
  const locations = [];

  // Primary locations from defaults
  locations.push(expandPath(defaults.paths.CLAWD_ROOT));
  locations.push(expandPath(defaults.paths.PROJECTS_DIR));

  // User home
  const userHome = expandPath(defaults.paths.USER_HOME);
  locations.push(userHome);

  // Additional configured roots
  defaults.additionalRoots.forEach(root => {
    locations.push(expandPath(root));
  });

  // Dedupe while preserving order
  const seen = new Set();
  return locations.filter(loc => {
    const expanded = expandPath(loc);
    if (seen.has(expanded)) return false;
    seen.add(expanded);
    return true;
  });
}

/**
 * Find all .project-lock files recursively
 */
function findLockFiles(searchLocations) {
  const projects = new Map();

  searchLocations.forEach(location => {
    const expanded = expandPath(location);
    if (!fs.existsSync(expanded)) return;

    try {
      // Find all .project-lock files
      const lockFiles = execSync(
        `find "${expanded}" -name ".project-lock" -type f 2>/dev/null`,
        { encoding: 'utf8' }
      ).trim().split('\n').filter(f => f.trim());

      lockFiles.forEach(lockFile => {
        const content = fs.readFileSync(lockFile, 'utf8');
        const rootPath = path.dirname(lockFile);

        // Parse → actual lock file format
        const lines = content.split('\n');
        let name = null;
        let root = null;
        const ignore = [];

        lines.forEach(line => {
          const trimmed = line.trim();

          // Skip comments
          if (trimmed.startsWith('#')) return;

          // Parse NAME:
          if (trimmed.startsWith('NAME:')) {
            name = trimmed.split(':', 2)[1].trim();
          }
          // Parse ROOT:
          else if (trimmed.startsWith('ROOT:')) {
            root = expandPath(trimmed.split(':', 2)[1].trim());
          }
          // Parse IGNORE (multiple values per line or one per line)
          else if (trimmed.startsWith('IGNORE:')) {
            const values = trimmed.split(':', 2)[1].trim();
            // Space-separated or line-separated
            values.split(/[\s,]+/).forEach(val => {
              const value = val.trim();
              if (value) ignore.push(value);
            });
          }
        });

        if (name && root) {
          // Validate root exists
          if (fs.existsSync(root)) {
            projects.set(name, {
              name,
              root,
              lockFile,
              valid: true,
              ignore
            });
          }
        }
      });
    } catch (e) {
      // Skip errors
    }
  });

  return projects;
}

/**
 * Main discovery function
 */
function discoverProjects() {
  const searchLocations = getSearchLocations();
  const projects = findLockFiles(searchLocations);

  // Sort by name for consistent output
  const sorted = Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    projects: sorted,
    searchLocations: searchLocations,
    count: sorted.length
  };
}

if (require.main === module) {
  const action = process.argv[2] || 'discover';

  if (action === 'discover') {
    const result = discoverProjects();
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'list') {
    const result = discoverProjects();
    console.log('\n=== Available Projects ===\n');

    result.projects.forEach((p, i) => {
      const status = p.valid ? '✓' : '✗';
      console.log(`${status} [${i + 1}] ${p.name}`);
      console.log(`    Root: ${p.root}`);
      console.log(`    Lock: ${p.lockFile}`);
      console.log('');
    });

    console.log(`\nTotal: ${result.count} projects`);
    console.log(`Searched: ${result.searchLocations.length} locations`);
  } else {
    console.error('Usage: node discover.js <action>');
    console.error('\nActions:');
    console.error('  discover, list');
    process.exit(1);
  }
}

module.exports = { discoverProjects, expandPath, getSearchLocations };
