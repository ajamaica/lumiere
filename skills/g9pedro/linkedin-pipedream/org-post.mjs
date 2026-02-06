#!/usr/bin/env node
/**
 * LinkedIn Organization Post Helper
 * 
 * Workaround for Pipedream MCP "tool name too long" bug.
 * Use this script to post as an organization.
 * 
 * Usage:
 *   node org-post.mjs "Your post content here"
 *   node org-post.mjs --org 105382747 "Your post content"
 * 
 * Credentials loaded from ~/.config/pdauth/config.json
 */

import { PipedreamClient } from '@pipedream/sdk';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load config from pdauth
const configPath = join(homedir(), '.config', 'pdauth', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

// Defaults - customize as needed
const DEFAULTS = {
  userId: 'telegram:5439689035',
  orgId: '105382747',  // Versatly
  authProvisionId: 'apn_4vhLGx4',  // LinkedIn account
};

const client = new PipedreamClient({
  projectEnvironment: config.environment || 'development',
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  projectId: config.projectId,
});

async function postAsOrg(text, options = {}) {
  const { orgId = DEFAULTS.orgId, userId = DEFAULTS.userId, authProvisionId = DEFAULTS.authProvisionId } = options;
  
  console.log(`📝 Posting to organization ${orgId}...`);
  console.log(`   User: ${userId}`);
  console.log(`   Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  
  try {
    const result = await client.actions.run({
      id: 'linkedin-create-text-post-organization',
      externalUserId: userId,
      configuredProps: {
        linkedin: { authProvisionId },
        organizationId: orgId,
        text: text,
      },
    });
    
    console.log('\n✅ Posted successfully!');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('\n❌ Failed to post:', error.message);
    throw error;
  }
}

// CLI handling
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
LinkedIn Organization Post Helper

Usage:
  node org-post.mjs "Your post content"
  node org-post.mjs --org 105382747 "Your post content"
  node org-post.mjs --user telegram:123456 --org 105382747 "Content"

Options:
  --org <id>     Organization ID (default: ${DEFAULTS.orgId})
  --user <id>    Pipedream user ID (default: ${DEFAULTS.userId})
  --help         Show this help

Examples:
  node org-post.mjs "Excited to announce our new product! 🚀"
  node org-post.mjs --org 105382747 "Company update post"
`);
  process.exit(0);
}

// Parse arguments
let text = '';
let orgId = DEFAULTS.orgId;
let userId = DEFAULTS.userId;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--org' && args[i + 1]) {
    orgId = args[++i];
  } else if (args[i] === '--user' && args[i + 1]) {
    userId = args[++i];
  } else if (!args[i].startsWith('--')) {
    text = args[i];
  }
}

if (!text) {
  console.error('❌ No post content provided');
  process.exit(1);
}

postAsOrg(text, { orgId, userId }).catch(() => process.exit(1));
