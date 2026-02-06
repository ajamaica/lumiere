#!/usr/bin/env node
/**
 * table.test.mjs - Unit tests for table image generator
 * Run: node table.test.mjs
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TABLE_CMD = join(__dirname, 'table.mjs');
const OUT_DIR = '/tmp/table-test-output';

let passed = 0;
let failed = 0;

function run(args, stdin = null) {
  const cmd = `node ${TABLE_CMD} ${args}`;
  const opts = { encoding: 'utf8', cwd: __dirname };
  if (stdin) opts.input = stdin;
  return execSync(cmd, opts);
}

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

function cleanup(path) {
  if (existsSync(path)) unlinkSync(path);
}

// Ensure output dir
execSync(`mkdir -p ${OUT_DIR}`);

// ─── Test Suite ──────────────────────────────────────────

console.log('\n📋 Table Image Generator Tests\n');

// 1. Basic generation
console.log('1. Basic table generation');
{
  const out = `${OUT_DIR}/basic.png`;
  cleanup(out);
  run(`--data '[{"Name":"Alice","Score":95}]' --output ${out}`);
  assert(existsSync(out), 'Creates output file');
  const size = readFileSync(out).length;
  assert(size > 500, `File has content (${size} bytes)`);
  assert(out.endsWith('.png'), 'Output is PNG');
}

// 2. Dark mode
console.log('2. Dark mode');
{
  const out = `${OUT_DIR}/dark.png`;
  cleanup(out);
  run(`--data '[{"A":"1","B":"2"}]' --dark --output ${out}`);
  assert(existsSync(out), 'Dark mode generates file');
  const size = readFileSync(out).length;
  assert(size > 500, `Dark mode has content (${size} bytes)`);
}

// 3. Light mode
console.log('3. Light mode (default)');
{
  const out = `${OUT_DIR}/light.png`;
  cleanup(out);
  run(`--data '[{"A":"1","B":"2"}]' --output ${out}`);
  assert(existsSync(out), 'Light mode generates file');
}

// 4. Title
console.log('4. Title support');
{
  const out = `${OUT_DIR}/title.png`;
  cleanup(out);
  run(`--data '[{"X":"1"}]' --title "My Title" --output ${out}`);
  assert(existsSync(out), 'Title table generates');
}

// 5. Compact mode
console.log('5. Compact mode');
{
  const outNormal = `${OUT_DIR}/normal.png`;
  const outCompact = `${OUT_DIR}/compact.png`;
  cleanup(outNormal); cleanup(outCompact);
  run(`--data '[{"A":"1","B":"2","C":"3"}]' --output ${outNormal}`);
  run(`--data '[{"A":"1","B":"2","C":"3"}]' --compact --output ${outCompact}`);
  const normalSize = readFileSync(outNormal).length;
  const compactSize = readFileSync(outCompact).length;
  assert(existsSync(outCompact), 'Compact mode generates');
  assert(compactSize <= normalSize, `Compact is smaller or equal (${compactSize} vs ${normalSize})`);
}

// 6. Stdin input
console.log('6. Stdin input');
{
  const out = `${OUT_DIR}/stdin.png`;
  cleanup(out);
  run(`--output ${out}`, '[{"Via":"stdin","Works":"yes"}]');
  assert(existsSync(out), 'Stdin input works');
}

// 7. --data-file input
console.log('7. --data-file input');
{
  const dataFile = `${OUT_DIR}/input.json`;
  const out = `${OUT_DIR}/datafile.png`;
  writeFileSync(dataFile, '[{"From":"file","It\'s":"working"}]');
  cleanup(out);
  run(`--data-file ${dataFile} --output ${out}`);
  assert(existsSync(out), '--data-file works');
  assert(existsSync(out), 'Handles apostrophes in data');
}

// 8. RTL auto-detection (Hebrew)
console.log('8. RTL auto-detection');
{
  const out = `${OUT_DIR}/rtl.png`;
  cleanup(out);
  const data = JSON.stringify([{"שם":"דני","גיל":28}]);
  writeFileSync(`${OUT_DIR}/rtl.json`, data);
  run(`--data-file ${OUT_DIR}/rtl.json --output ${out}`);
  assert(existsSync(out), 'Hebrew RTL generates');
}

// 9. RTL manual flag
console.log('9. RTL manual flag');
{
  const out = `${OUT_DIR}/rtl-manual.png`;
  cleanup(out);
  run(`--data '[{"A":"1","B":"2"}]' --rtl --output ${out}`);
  assert(existsSync(out), '--rtl flag works');
}

// 10. Multiple rows
console.log('10. Multiple rows');
{
  const out = `${OUT_DIR}/multirow.png`;
  cleanup(out);
  const data = JSON.stringify(Array.from({length: 20}, (_, i) => ({Row: i+1, Value: Math.random().toFixed(2)})));
  writeFileSync(`${OUT_DIR}/multi.json`, data);
  run(`--data-file ${OUT_DIR}/multi.json --output ${out}`);
  assert(existsSync(out), '20-row table generates');
  const size = readFileSync(out).length;
  assert(size > 2000, `Large table has substantial content (${size} bytes)`);
}

// 11. Custom columns & headers
console.log('11. Custom columns and headers');
{
  const out = `${OUT_DIR}/custom-cols.png`;
  cleanup(out);
  run(`--data '[{"a":"1","b":"2","c":"3"}]' --columns "a,c" --headers "Alpha,Charlie" --output ${out}`);
  assert(existsSync(out), 'Custom columns/headers work');
}

// 12. Column alignment
console.log('12. Column alignment');
{
  const out = `${OUT_DIR}/align.png`;
  cleanup(out);
  run(`--data '[{"Left":"L","Center":"C","Right":"R"}]' --align "l,c,r" --output ${out}`);
  assert(existsSync(out), 'Custom alignment works');
}

// 13. No stripe
console.log('13. No stripe mode');
{
  const out = `${OUT_DIR}/no-stripe.png`;
  cleanup(out);
  run(`--data '[{"A":"1"},{"A":"2"},{"A":"3"}]' --no-stripe --output ${out}`);
  assert(existsSync(out), '--no-stripe works');
}

// 14. Custom header color
console.log('14. Custom header color');
{
  const out = `${OUT_DIR}/custom-header.png`;
  cleanup(out);
  run(`--data '[{"X":"1"}]' --header-color "#4CAF50" --output ${out}`);
  assert(existsSync(out), 'Custom header color works');
}

// 15. Error: no data
console.log('15. Error handling: no data');
{
  let errored = false;
  try {
    run(`--output ${OUT_DIR}/shouldfail.png`);
  } catch (e) {
    errored = true;
  }
  assert(errored, 'Fails gracefully with no data');
}

// 16. Error: invalid JSON
console.log('16. Error handling: invalid JSON');
{
  let errored = false;
  try {
    run(`--data 'not json' --output ${OUT_DIR}/shouldfail2.png`);
  } catch (e) {
    errored = true;
  }
  assert(errored, 'Fails on invalid JSON');
}

// 17. Single column table
console.log('17. Single column table');
{
  const out = `${OUT_DIR}/single-col.png`;
  cleanup(out);
  run(`--data '[{"Name":"Solo"}]' --output ${out}`);
  assert(existsSync(out), 'Single column works');
}

// 18. Numeric-only data
console.log('18. Numeric data alignment');
{
  const out = `${OUT_DIR}/numeric.png`;
  cleanup(out);
  run(`--data '[{"Value":100},{"Value":200},{"Value":300}]' --output ${out}`);
  assert(existsSync(out), 'Numeric-only table generates');
}

// ─── Summary ──────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'─'.repeat(40)}\n`);

// Cleanup
execSync(`rm -rf ${OUT_DIR}`);

process.exit(failed > 0 ? 1 : 0);
