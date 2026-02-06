#!/usr/bin/env node
/**
 * Interactive first-time setup.
 * Stores WPS Time / NetTime credentials into macOS Keychain.
 *
 * Services used by this skill (preferred):
 * - wpstime-punchclock.company  (secret = company/common id)
 * - wpstime-punchclock          (account = username, secret = password)
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execFileAsync = promisify(execFile);

const SERVICES = {
  company: 'wpstime-punchclock.company',
  account: 'wpstime-punchclock'
};

function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer ?? '').trim());
    });
  });
}

async function promptHidden(question) {
  // Best-effort hidden input for passwords in a TTY.
  // Falls back to visible input if stdin isn't a TTY.
  if (!process.stdin.isTTY) {
    return await promptLine(question);
  }

  return await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = true;

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        // Don’t echo typed chars; keep the prompt.
        if (stringToWrite.startsWith(question)) rl.output.write(stringToWrite);
        return;
      }
      rl.output.write(stringToWrite);
    };

    rl.question(question, (answer) => {
      rl.stdoutMuted = false;
      rl.close();
      resolve((answer ?? '').trim());
    });
  });
}

async function keychainUpsertCompany(companyId) {
  // Store as generic password; we keep account empty/constant.
  await execFileAsync('security', [
    'add-generic-password',
    '-U',
    '-s', SERVICES.company,
    '-a', 'company',
    '-w', companyId
  ]);
}

async function keychainUpsertAccount(username, password) {
  await execFileAsync('security', [
    'add-generic-password',
    '-U',
    '-s', SERVICES.account,
    '-a', username,
    '-w', password
  ]);
}

async function main() {
  console.log('WPS Time / NetTime — First-time setup (macOS Keychain)');
  console.log('This will store credentials locally in your Keychain (not in files).');
  console.log('');

  const companyId = await promptLine('Company ID (txtLoginAlias): ');
  const username = await promptLine('Username (txtLoginUserID): ');
  const password = await promptHidden('Password (txtLoginPassword): ');

  if (!companyId || !username || !password) {
    console.error('Error: companyId/username/password cannot be empty.');
    process.exitCode = 1;
    return;
  }

  await keychainUpsertCompany(companyId);
  await keychainUpsertAccount(username, password);

  console.log('');
  console.log('OK. Saved to Keychain services:');
  console.log(`- ${SERVICES.company}`);
  console.log(`- ${SERVICES.account} (account = ${username})`);
  console.log('');
  console.log('Next: run a status check:');
  console.log('  node ./scripts/punchclock.mjs --action status');
}

main().catch((err) => {
  console.error('Setup failed:', err?.message ?? String(err));
  process.exitCode = 1;
});
