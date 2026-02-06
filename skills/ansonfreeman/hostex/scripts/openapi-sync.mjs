#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const OPENAPI_URL = 'https://hostex.io/open_api/v3/config.json';

async function main() {
  const res = await fetch(OPENAPI_URL);
  if (!res.ok) throw new Error(`Failed to fetch OpenAPI: ${res.status}`);
  const json = await res.json();

  const outDir = path.resolve('skills/hostex/references');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'openapi.json');
  await fs.writeFile(outPath, JSON.stringify(json, null, 2));

  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
