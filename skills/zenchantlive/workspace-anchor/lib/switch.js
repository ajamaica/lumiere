#!/usr/bin/env node

/**
 * Project switching - Change active project context
 * Updates session context, not persistent state
 */

const { getCurrentProject } = require('./validate');

/**
 * Switch to a new project
 */
function switchProject(projectName) {
  // Discover all projects
  const { discoverProjects } = require('./discover');
  const { projects } = discoverProjects();

  // Find target project
  const target = projects.find(p => p.name === projectName);

  if (!target) {
    return {
      success: false,
      error: `Project not found: ${projectName}`
    };
  }

  // Validate project is valid
  if (!target.valid) {
    return {
      success: false,
      error: `Project is not valid: ${projectName}`
    };
  }

  return {
    success: true,
    project: target,
    message: `Switched to project: ${target.name}`
  };
}

/**
 * Main function
 */
if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.error('Usage: node switch.js <project-name>');
    console.error('\nTo see available projects, run:');
    console.error('  node ../lib/list.js');
    process.exit(1);
  }

  const result = switchProject(projectName);

  if (result.success) {
    console.log(`\n✅ ${result.message}`);
    console.log(`\nRoot: ${result.project.root}`);
    console.log(`Lock: ${result.project.lockFile}`);
    console.log(`\nContext updated. Use [PROJECT: ${result.project.name}] in tasks.`);
  } else {
    console.error(`\n❌ ${result.error}`);
    process.exit(1);
  }
}

module.exports = { switchProject };
