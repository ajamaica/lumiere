#!/usr/bin/env node

import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const BASE = 'https://dapp.diarybeast.xyz';
const CRED_DIR = join(homedir(), '.openclaw', 'workspace', 'skills', 'diarybeast');

async function main() {
  console.log('');
  console.log('  🐾 DiaryBeast Setup');
  console.log('  ───────────────────');
  console.log('');

  mkdirSync(CRED_DIR, { recursive: true });
  const addressFile = join(CRED_DIR, '.address');
  const tokenFile = join(CRED_DIR, '.token');

  let address;

  if (existsSync(addressFile)) {
    address = readFileSync(addressFile, 'utf-8').trim();
    console.log(`  Found existing pet at ${address.slice(0, 6)}...${address.slice(-4)}`);
    console.log('  Re-authenticating...');
  } else {
    address = '0x' + randomBytes(20).toString('hex');
    console.log(`  Creating new agent wallet: ${address.slice(0, 6)}...${address.slice(-4)}`);
  }

  const nonce = randomBytes(16).toString('hex');
  const signature = '0x' + randomBytes(65).toString('hex');

  console.log('  Authenticating with DiaryBeast...');
  console.log('');

  const res = await fetch(`${BASE}/api/auth/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('  ✗ Authentication failed:', err);
    process.exit(1);
  }

  const data = await res.json();

  writeFileSync(addressFile, address);
  writeFileSync(tokenFile, data.token);

  const pet = data.user;
  const animal = pet.selectedAnimal === 'cat' ? '🐱' : '🐶';

  console.log('  ✓ Success!');
  console.log('');

  if (data.isNewUser) {
    console.log(`  ${animal} You adopted a ${pet.selectedAnimal}!`);
    console.log(`  💰 Welcome bonus: ${pet.coinsBalance} DIARY tokens`);
  } else {
    console.log(`  ${animal} Welcome back! Your ${pet.selectedAnimal}${pet.petName ? ' "' + pet.petName + '"' : ''} missed you.`);
    console.log(`  ❤️  Lives: ${pet.livesRemaining}/7 | 😊 Happiness: ${pet.happiness}/100`);
    console.log(`  🔥 Streak: ${pet.currentStreak} days | 💰 Balance: ${pet.coinsBalance} DIARY`);
  }

  console.log('');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │  Open this link to see your pet:            │');
  console.log(`  │  ${data.magicLink}`);
  console.log('  └─────────────────────────────────────────────┘');
  console.log('');
  console.log('  Token saved to ~/.openclaw/workspace/skills/diarybeast/.token');
  console.log(`  Session expires: ${new Date(data.expiresAt).toLocaleString()}`);
  console.log('');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
