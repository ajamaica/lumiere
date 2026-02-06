#!/usr/bin/env node

/**
 * List all discovered projects
 */

const { discoverProjects } = require('./discover');

/**
 * Format project list for display
 */
function formatProjectList(projects) {
  let output = '\n=== Available Projects ===\n\n';

  projects.forEach((p, i) => {
    const status = p.valid ? '✓' : '✗';
    output += `${status} [${i + 1}] ${p.name}\n`;
    output += `    Root: ${p.root}\n`;
    output += `    Lock: ${p.lockFile}\n`;

    if (p.ignore && p.ignore.length > 0) {
      output += `    Ignore: ${p.ignore.join(', ')}\n`;
    }

    output += '\n';
  });

  return output;
}

/**
 * Main function
 */
if (require.main === module) {
  const { discoverProjects } = require('./discover');

  // Discover all projects
  const { projects, searchLocations, count } = discoverProjects();

  console.log(formatProjectList(projects));
  console.log(`\nTotal: ${count} projects`);
  console.log(`Searched: ${searchLocations.length} locations:`);
  console.log(searchLocations.map(loc => `  - ${loc}`).join('\n'));
}

module.exports = { formatProjectList };
