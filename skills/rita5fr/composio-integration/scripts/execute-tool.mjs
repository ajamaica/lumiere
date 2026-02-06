#!/usr/bin/env node
// Composio v3 API - Execute Tool
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
const BASE = "https://backend.composio.dev/api/v3";

async function executeTool(tool_slug, { user_id, connected_account_id, arguments: args }) {
  const res = await fetch(`${BASE}/tools/execute/${tool_slug}`, {
    method: 'POST',
    headers: {
      'x-api-key': COMPOSIO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id,
      connected_account_id,
      arguments: args
    })
  });

  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// Usage: node execute-tool.mjs <tool_slug> <connected_account_id> '<json_args>'
const [tool_slug, connected_account_id, argsJson] = process.argv.slice(2);

if (!tool_slug || !connected_account_id) {
  console.error('Usage: node execute-tool.mjs <tool_slug> <connected_account_id> \'<json_args>\'');
  console.error('\nExample:');
  console.error('  node execute-tool.mjs gmail_search_email aa5460b3-4171-4a38-a3c2-791abb3849ec \'{"maxResults":5}\'');
  process.exit(1);
}

const args = argsJson ? JSON.parse(argsJson) : {};

console.log(`🚀 Executing: ${tool_slug}`);
console.log(`📎 Account: ${connected_account_id}`);
console.log(`📋 Args: ${JSON.stringify(args, null, 2)}\n`);

executeTool(tool_slug, {
  user_id: 'sid-main',
  connected_account_id,
  arguments: args
})
  .then(result => {
    console.log('✅ Success!\n');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
