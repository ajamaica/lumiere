#!/usr/bin/env node
// Composio v3 API - List Tools
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
const BASE = "https://backend.composio.dev/api/v3";

async function listTools({ toolkit_slug, search, cursor, limit = 50 } = {}) {
  const url = new URL(`${BASE}/tools`);
  
  // CRITICAL: No deprecated tools
  url.searchParams.set('include_deprecated', 'false');
  url.searchParams.set('toolkit_versions', 'latest');
  
  if (toolkit_slug) url.searchParams.set('toolkit_slug', toolkit_slug);
  if (search) url.searchParams.set('search', search);
  if (limit) url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-key': COMPOSIO_API_KEY }
  });

  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// Parse CLI args
const args = process.argv.slice(2);
const toolkit_slug = args[0];
const search = args[1];

listTools({ toolkit_slug, search, limit: 20 })
  .then(data => {
    if (data.items) {
      console.log(`Found ${data.items.length} tools:\n`);
      data.items.forEach(tool => {
        console.log(`  ${tool.slug}`);
        console.log(`    Name: ${tool.name}`);
        console.log(`    Toolkit: ${tool.toolkit?.slug || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
