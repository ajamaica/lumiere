#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync,readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the latest version from git tags or package.json
 * @returns {string|null} Version string or null if not found
 */
function getLatestVersion() {
  // Try git first
  try {
    const version = execSync('git describe --tags --abbrev=0', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (version) {
      return version;
    }
  } catch (error) {
    // Git command failed, try package.json
  }

  // Try package.json
  try {
    const packageJsonPath = join(__dirname, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.version) {
        return `v${packageJson.version}`;
      }
    }
  } catch (error) {
    // package.json not found or invalid
  }

  return null;
}

/**
 * Initialize or access the SQLite database and create scores table if needed
 * @returns {{db: DatabaseSync, created: boolean}|null} Object with database instance and created flag, or null on failure
 */
function initDatabase() {
  try {
    const dbPath = join(__dirname, 'skill-data.db');
    const dbExists = existsSync(dbPath);
    const database = new DatabaseSync(dbPath);
    
    // Create scores table if it doesn't exist
    database.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        score REAL NOT NULL
      )
    `);
    
    return { db: database, created: !dbExists };
  } catch (error) {
    return null;
  }
}

/**
 * Run check logic and return version and database
 * @param {boolean} silent - If true, suppress success messages
 * @returns {{version: string, db: DatabaseSync}|null} Object with version and db, or null on failure
 */
function runCheck(silent = false) {
  // Get latest version
  const version = getLatestVersion();
  
  if (!version) {
    console.error('Failed to retrieve the latest version');
    return null;
  }
  
  if (!silent) {
    console.log(`latest version found = ${version}`);
  }
  
  // Initialize/check database
  const dbResult = initDatabase();
  
  if (!dbResult) {
    console.error('failed to access info db');
    return null;
  }
  
  if (!silent) {
    console.log(dbResult.created ? 'info db created' : 'info db found');
  }
  
  return { version, db: dbResult.db };
}

/**
 * Handle the --check command
 */
function handleCheck() {
  const result = runCheck();
  
  if (!result) {
    process.exit(1);
  }
  
  result.db.close();
  process.exit(0);
}

/**
 * Calculate average scores per version
 * @param {DatabaseSync} db - Database instance
 * @returns {Array<{version: string, average: number, count: number}>} Array of versions with averages and counts
 */
function getVersionAverages(db) {
  const query = db.prepare(`
    SELECT version, AVG(score) as average, COUNT(*) as count
    FROM scores
    GROUP BY version
    ORDER BY id DESC
    LIMIT 10
  `);
  
  const results = query.all();
  return results;
}

/**
 * Display score history and averages
 * @param {DatabaseSync} db - Database instance
 * @param {string} version - Current version
 */
function displayScoreHistory(db, version) {
  // Get version averages
  const averages = getVersionAverages(db);
  
  console.log('');
  
  // Display history
  console.log('-- Tool Scores history --');
  averages.forEach(row => {
    const isCurrent = row.version === version;
    const currentLabel = isCurrent ? ' - current' : '';
    console.log(`${row.version}${currentLabel} : ${Math.round(row.average)}%  (${row.count} uses)`);
  });
  
  console.log('');
  console.log('==');
  
  // Display current version average
  const currentAverage = averages.find(row => row.version === version);
  if (currentAverage) {
    console.log(`Current Skill version average score = ${Math.round(currentAverage.average)}%`);
  }
}

/**
 * Handle the --insert command
 * @param {string} scoreInput - Score value between 0-100 (can include % symbol)
 */
function handleInsert(scoreInput) {
  // Remove % symbol if present
  const cleanScore = typeof scoreInput === 'string' ? scoreInput.replace('%', '') : scoreInput;
  const score = parseFloat(cleanScore);
  
  // Validate score
  if (isNaN(score) || score < 0 || score > 100) {
    console.error('Error: Score must be a number between 0 and 100');
    process.exit(1);
  }
  
  // Run check logic silently
  const result = runCheck(true);
  
  if (!result) {
    process.exit(1);
  }
  
  const { version, db } = result;
  
  try {
    // Insert the new score
    const insert = db.prepare('INSERT INTO scores (version, score) VALUES (?, ?)');
    insert.run(version, score);
    
    // Display score history
    displayScoreHistory(db, version);
    
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Failed to insert score:', error.message);
    db.close();
    process.exit(1);
  }
}

/**
 * Handle the --list command
 */
function handleList() {
  // Run check logic silently
  const result = runCheck(true);
  
  if (!result) {
    process.exit(1);
  }
  
  const { version, db } = result;
  
  // Display score history
  displayScoreHistory(db, version);
  
  db.close();
  process.exit(0);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--check')) {
  handleCheck();
} else if (args[0] === '--insert') {
  const scoreInput = args[1];
  handleInsert(scoreInput);
} else if (args.includes('--list')) {
  handleList();
} else {
  console.log('Usage:');
  console.log('  node score.js --check');
  console.log('  node score.js --insert <score>');
  console.log('  node score.js --list');
  process.exit(1);
}
