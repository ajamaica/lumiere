#!/usr/bin/env node
/**
 * build-tar.mjs — Build skill distribution tarball
 *
 * Usage:
 *   npm run build:tar
 *   node scripts/build-tar.mjs
 *
 * Output: dist/clawdvine-skill.tar.gz
 *
 * No external dependencies — uses Node.js built-in zlib + tar-stream pattern
 */

import { createWriteStream, createReadStream, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { createGzip } from 'zlib';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OUTPUT = join(DIST, 'clawdvine-skill.tar.gz');

// Files/dirs to include in the tarball
const INCLUDE = [
  'SKILL.md',
  'README.md',
  'metadata.json',
  'package.json',
  'scripts/sign-siwe.mjs',
  'scripts/check-balance.mjs',
  'scripts/x402-generate.mjs',
  'references/api-reference.md',
];

// Ensure dist directory exists
mkdirSync(DIST, { recursive: true });

// Use tar command (available on macOS/Linux)
const filesToInclude = INCLUDE.filter(f => {
  try {
    statSync(join(ROOT, f));
    return true;
  } catch {
    console.warn(`⚠️  Skipping missing file: ${f}`);
    return false;
  }
});

const tarCmd = `tar -czf "${OUTPUT}" ${filesToInclude.map(f => `"${f}"`).join(' ')}`;

try {
  execSync(tarCmd, { cwd: ROOT, stdio: 'inherit' });
  const stats = statSync(OUTPUT);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`\n✅ Built: ${OUTPUT}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Files: ${filesToInclude.length}`);
  console.log(`\nIncluded:`);
  filesToInclude.forEach(f => console.log(`   - ${f}`));
} catch (err) {
  console.error('❌ Failed to build tarball:', err.message);
  process.exit(1);
}
