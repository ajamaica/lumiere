#!/usr/bin/env node
/**
 * OpenClaw Sync Server
 * 
 * A secure file sync server for syncing notes between Clawdbot and Obsidian.
 * 
 * Security:
 * - All paths must be within the configured workspace
 * - Path traversal attacks are blocked
 * - Requires authentication via Bearer token
 * - Only configured subdirectories are accessible
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

// Configuration (can be overridden via environment variables)
const CONFIG = {
  port: parseInt(process.env.SYNC_PORT || '18790'),
  // Bind address: localhost only for security (expose via Tailscale serve)
  bind: process.env.SYNC_BIND || 'localhost',
  workspace: process.env.SYNC_WORKSPACE || '/data/clawdbot',
  token: process.env.SYNC_TOKEN || process.env.CLAWDBOT_TOKEN || '',
  // Only these subdirectories can be synced (relative to workspace)
  allowedPaths: (process.env.SYNC_ALLOWED_PATHS || 'notes,memory').split(',').map(p => p.trim()),
};

// Validate configuration
if (!CONFIG.token) {
  console.error('Error: SYNC_TOKEN or CLAWDBOT_TOKEN environment variable required');
  process.exit(1);
}

console.log('OpenClaw Sync Server');
console.log('====================');
console.log(`Workspace: ${CONFIG.workspace}`);
console.log(`Allowed paths: ${CONFIG.allowedPaths.join(', ')}`);
console.log(`Bind: ${CONFIG.bind}:${CONFIG.port}`);
console.log('');

/**
 * Validate and resolve a path, ensuring it's within allowed directories
 */
function validatePath(requestPath) {
  // Normalize and clean the path
  const cleaned = path.normalize(requestPath).replace(/^\/+/, '');
  
  // Check for path traversal attempts
  if (cleaned.includes('..') || path.isAbsolute(requestPath)) {
    return { valid: false, error: 'Invalid path: traversal not allowed' };
  }
  
  // Check if path starts with an allowed directory
  const pathParts = cleaned.split(path.sep);
  const rootDir = pathParts[0];
  
  if (!CONFIG.allowedPaths.includes(rootDir)) {
    return { 
      valid: false, 
      error: `Access denied: '${rootDir}' is not in allowed paths [${CONFIG.allowedPaths.join(', ')}]` 
    };
  }
  
  const fullPath = path.join(CONFIG.workspace, cleaned);
  
  // Double-check the resolved path is within workspace
  if (!fullPath.startsWith(CONFIG.workspace)) {
    return { valid: false, error: 'Invalid path: outside workspace' };
  }
  
  return { valid: true, path: fullPath, relativePath: cleaned };
}

/**
 * Get file metadata
 */
async function getFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const hash = createHash('md5').update(content).digest('hex');
    
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
      hash,
    };
  } catch (err) {
    return null;
  }
}

/**
 * List files in a directory recursively
 */
async function listFiles(dirPath, basePath = '') {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const relativePath = path.join(basePath, entry.name);
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const subFiles = await listFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Only sync markdown files
        const metadata = await getFileMetadata(fullPath);
        files.push({
          path: relativePath,
          ...metadata,
        });
      }
    }
  } catch (err) {
    // Directory doesn't exist or isn't readable
  }
  
  return files;
}

/**
 * Handle HTTP requests
 */
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Bearer token required' }));
    return;
  }
  
  const token = authHeader.slice(7);
  if (token !== CONFIG.token) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: Invalid token' }));
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const endpoint = url.pathname;
  
  try {
    // GET /sync/list?path=notes
    if (req.method === 'GET' && endpoint === '/sync/list') {
      const syncPath = url.searchParams.get('path') || '';
      const validation = validatePath(syncPath || CONFIG.allowedPaths[0]);
      
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }
      
      const files = await listFiles(validation.path);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        path: validation.relativePath,
        files 
      }));
      return;
    }
    
    // GET /sync/read?path=notes/foo.md
    if (req.method === 'GET' && endpoint === '/sync/read') {
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing path parameter' }));
        return;
      }
      
      const validation = validatePath(filePath);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }
      
      try {
        const content = await fs.readFile(validation.path, 'utf-8');
        const metadata = await getFileMetadata(validation.path);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          path: validation.relativePath,
          content,
          ...metadata,
        }));
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }
    
    // POST /sync/write?path=notes/foo.md
    if (req.method === 'POST' && endpoint === '/sync/write') {
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing path parameter' }));
        return;
      }
      
      const validation = validatePath(filePath);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }
      
      // Read request body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      
      const data = JSON.parse(body);
      const { content, expectedHash } = data;
      
      if (typeof content !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing content in request body' }));
        return;
      }
      
      // Check for conflicts if expectedHash provided
      if (expectedHash) {
        const currentMeta = await getFileMetadata(validation.path);
        if (currentMeta && currentMeta.hash !== expectedHash) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Conflict: file has been modified',
            currentHash: currentMeta.hash,
            expectedHash,
            currentModified: currentMeta.modified,
          }));
          return;
        }
      }
      
      // Ensure parent directory exists
      const parentDir = path.dirname(validation.path);
      await fs.mkdir(parentDir, { recursive: true });
      
      // Write file
      await fs.writeFile(validation.path, content, 'utf-8');
      const metadata = await getFileMetadata(validation.path);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        path: validation.relativePath,
        ...metadata,
      }));
      return;
    }
    
    // GET /sync/status - Health check
    if (req.method === 'GET' && endpoint === '/sync/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        workspace: CONFIG.workspace,
        allowedPaths: CONFIG.allowedPaths,
      }));
      return;
    }
    
    // Unknown endpoint
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (err) {
    console.error('Error handling request:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Start server
const server = http.createServer(handleRequest);
server.listen(CONFIG.port, CONFIG.bind, () => {
  console.log(`Sync server listening on http://${CONFIG.bind}:${CONFIG.port}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /sync/status              - Health check');
  console.log('  GET  /sync/list?path=notes     - List files');
  console.log('  GET  /sync/read?path=notes/x   - Read file');
  console.log('  POST /sync/write?path=notes/x  - Write file');
});
