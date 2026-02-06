#!/usr/bin/env node
/**
 * basecred query — fetch a unified reputation profile for a wallet address.
 *
 * Usage:  node scripts/query.mjs <0x-address>
 *
 * Env (loaded from <workspace>/.env or shell):
 *   TALENT_PROTOCOL_API_KEY
 *   NEYNAR_API_KEY
 *
 * Output: JSON to stdout (matches basecred-sdk unified profile schema).
 */

import fs   from 'fs';
import path from 'path';

// ---------- locate workspace (where node_modules/basecred-sdk lives) ----------
function findWorkspace() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'node_modules', 'basecred-sdk'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

const WORKSPACE = findWorkspace();
if (!WORKSPACE) {
  console.error('basecred-sdk not found. Run `npm i basecred-sdk` in your workspace first.');
  process.exit(1);
}

// Dynamic import so ESM resolution hits the right node_modules
const sdkPath = path.join(WORKSPACE, 'node_modules', 'basecred-sdk', 'dist', 'index.js');
const { getUnifiedProfile } = await import(sdkPath);

// ---------- env helpers ----------
function loadDotEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      for (const line of fs.readFileSync(candidate, 'utf8').trim().split('\n')) {
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!(key in process.env)) process.env[key] = val;
      }
      break;
    }
    dir = path.dirname(dir);
  }
}

loadDotEnv();

// ---------- validate ----------
const address = process.argv[2];
if (!address || !address.startsWith('0x')) {
  console.error('Usage: node scripts/query.mjs <0x-address>');
  process.exit(1);
}

const talentKey  = process.env.TALENT_PROTOCOL_API_KEY;
const neynarKey  = process.env.NEYNAR_API_KEY;

if (!talentKey) {
  console.error('Missing TALENT_PROTOCOL_API_KEY in .env or environment.');
  process.exit(1);
}

// ---------- build config ----------
const config = {
  ethos: {
    baseUrl:  'https://api.ethos.network',
    clientId: 'basecred@0.1.0',
  },
  talent: {
    baseUrl: 'https://api.talentprotocol.com',
    apiKey:  talentKey,
  },
};

if (neynarKey) {
  config.farcaster = {
    enabled:        true,
    neynarApiKey:   neynarKey,
    qualityThreshold: 0.5,
  };
}

// ---------- fetch & print ----------
const profile = await getUnifiedProfile(address, config);
console.log(JSON.stringify(profile, null, 2));
