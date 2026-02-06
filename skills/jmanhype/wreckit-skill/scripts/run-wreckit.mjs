import { spawn } from 'child_process';

/**
 * Wreckit Skill Wrapper for Clawdbot
 * Version: 1.1.0 (jmanhype fork)
 * 
 * This script bridges Clawdbot/ClawdHub intents to the Wreckit CLI.
 * It enforces headless operation and Cattle Mode (Sandbox) by default.
 */

const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
}

// Helper to find the "ID" either from --id or as a positional arg
function resolveId(cmd) {
  const explicitId = getArg('--id');
  if (explicitId) return explicitId;
  
  // If not flagged, take the first arg that doesn't start with --
  // skipping the command itself
  const positionals = args.filter(a => !a.startsWith('--'));
  // Example: node run-wreckit.mjs --command run 096
  // positionals = ['096']
  return positionals.length > 0 ? positionals[0] : null;
}

const command = getArg('--command') || args.find(a => !a.startsWith('--'));
const mode = getArg('--mode') || 'cattle'; 

if (!command || command === '--help' || command === '-h') {
  console.log("Wreckit Skill Wrapper v1.1.0");
  console.log("Usage: node run-wreckit.mjs --command <cmd> [args...]");
  console.log("\nCommands supported:");
  console.log("  status, run, ideas, dream, doctor, strategy, products, rollback, next, learn, summarize, geneticist, init");
  process.exit(1);
}

const wreckitArgs = [];

// 1. Global Flags (Pre-command)
const cwd = getArg('--cwd');
const parallel = getArg('--parallel');
const verbose = getArg('--verbose');
const dryRun = getArg('--dry-run');

if (cwd) wreckitArgs.push('--cwd', cwd);
if (parallel) wreckitArgs.push('--parallel', parallel);
if (verbose) wreckitArgs.push('--verbose');
if (dryRun) wreckitArgs.push('--dry-run');

// Headless enforcement
wreckitArgs.push('--no-tui');

// 2. Mode Selection
if (mode === 'pet') {
  wreckitArgs.push('--rlm'); 
} else {
  wreckitArgs.push('--sandbox'); 
}

// 3. Command Mapping
const id = resolveId(command);

switch (command) {
  case 'status':
    wreckitArgs.push('status');
    break;
    
  case 'run':
    if (!id) {
      console.error("Error: Item ID is required for 'run' (e.g. --id 096 or just '096')");
      process.exit(1);
    }
    wreckitArgs.push('run', id);
    break;

  case 'ideas':
    wreckitArgs.push('ideas');
    break;
    
  case 'dream':
    wreckitArgs.push('dream');
    const max = getArg('--max-items') || '3';
    wreckitArgs.push('--max-items', max);
    break;
    
  case 'doctor':
    wreckitArgs.push('doctor');
    wreckitArgs.push('--fix');
    break;

  case 'strategy':
    wreckitArgs.push('strategy');
    break;

  case 'products':
    wreckitArgs.push('products', 'init');
    break;

  case 'init':
    wreckitArgs.push('init');
    break;
    
  case 'rollback':
    if (!id) {
      console.error("Error: Item ID is required for 'rollback'");
      process.exit(1);
    }
    wreckitArgs.push('rollback', id);
    if (getArg('--force')) wreckitArgs.push('--force');
    break;

  case 'next':
    wreckitArgs.push('next');
    break;

  case 'learn':
    wreckitArgs.push('learn');
    if (getArg('--item')) wreckitArgs.push('--item', getArg('--item'));
    if (getArg('--phase')) wreckitArgs.push('--phase', getArg('--phase'));
    if (getArg('--all')) wreckitArgs.push('--all');
    if (getArg('--output')) wreckitArgs.push('--output', getArg('--output'));
    if (getArg('--review')) wreckitArgs.push('--review');
    break;

  case 'summarize':
    wreckitArgs.push('summarize');
    if (getArg('--item')) wreckitArgs.push('--item', getArg('--item'));
    if (getArg('--phase')) wreckitArgs.push('--phase', getArg('--phase'));
    if (getArg('--all')) wreckitArgs.push('--all');
    break;

  case 'geneticist':
    wreckitArgs.push('geneticist');
    if (getArg('--auto-merge')) wreckitArgs.push('--auto-merge');
    if (getArg('--time-window')) wreckitArgs.push('--time-window', getArg('--time-window'));
    if (getArg('--min-errors')) wreckitArgs.push('--min-errors', getArg('--min-errors'));
    break;
    
default:
    // If we don't recognize it, try passing it as a raw command (Power User feature)
    console.warn(`⚠️  Warning: Unrecognized command '${command}'. Attempting raw pass-through.`);
    wreckitArgs.push(command);
    // Add any remaining args
    const remaining = args.filter(a => a !== '--command' && a !== command && a !== mode);
    wreckitArgs.push(...remaining);
}

// 4. Execution
console.log(`🤖 Wreckit Wrapper v1.1.0 [Mode: ${mode.toUpperCase()}]`);
console.log(`🚀 Executing: wreckit ${wreckitArgs.join(' ')}`);

const child = spawn('wreckit', wreckitArgs, {
  stdio: 'inherit',
  shell: true      
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ Wreckit ${command} completed successfully.`);
  } else {
    console.log(`\n❌ Wreckit exited with code ${code}.`);
    process.exit(code);
  }
});

child.on('error', (err) => {
  console.error(`Failed to start Wreckit: ${err.message}`);
  process.exit(1);
});