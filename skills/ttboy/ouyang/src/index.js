/**
 * Jasper Recall
 * Local RAG system for AI agent memory
 * 
 * This module exports utilities for programmatic access.
 * For CLI usage, use the `jasper-recall` command.
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const BIN_PATH = path.join(os.homedir(), '.local', 'bin');

/**
 * Search the memory index
 * @param {string} query - Search query
 * @param {Object} options - Options { limit, json, verbose }
 * @returns {Array|string} - Search results
 */
function recall(query, options = {}) {
  const args = [query];
  if (options.limit) args.push('-n', options.limit);
  if (options.json) args.push('--json');
  if (options.verbose) args.push('-v');
  
  const recallPath = path.join(BIN_PATH, 'recall');
  const result = execSync(`${recallPath} ${args.map(a => `"${a}"`).join(' ')}`, {
    encoding: 'utf8'
  });
  
  return options.json ? JSON.parse(result) : result;
}

/**
 * Index memory files
 * @returns {string} - Index output
 */
function indexDigests() {
  const scriptPath = path.join(BIN_PATH, 'index-digests');
  return execSync(scriptPath, { encoding: 'utf8' });
}

/**
 * Process session logs into digests
 * @param {Object} options - Options { dryRun, all, recent }
 * @returns {string} - Digest output
 */
function digestSessions(options = {}) {
  const args = [];
  if (options.dryRun) args.push('--dry-run');
  if (options.all) args.push('--all');
  if (options.recent) args.push('--recent', options.recent);
  
  const scriptPath = path.join(BIN_PATH, 'digest-sessions');
  return execSync(`${scriptPath} ${args.join(' ')}`, { encoding: 'utf8' });
}

module.exports = {
  recall,
  indexDigests,
  digestSessions
};
