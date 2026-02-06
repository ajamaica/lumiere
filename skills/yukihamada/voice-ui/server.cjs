// OpenClaw Voice UI Server - CLI Integration
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8765;
const OPENCLAW = '/Users/yuki/.nvm/versions/node/v22.22.0/bin/openclaw';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve static files
  if (req.method === 'GET') {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // API key endpoint
  if (req.method === 'GET' && req.url === '/api/key') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ key: OPENAI_KEY }));
    return;
  }

  // Chat API - calls openclaw agent CLI
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        console.log(`👤 User: ${message}`);

        const response = await callOpenClaw(message);
        console.log(`🤖 Crow: ${response.substring(0, 100)}...`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response }));

      } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function callOpenClaw(message) {
  return new Promise((resolve, reject) => {
    // Add context hint for UI changes
    let fullMessage = message;
    if (message.includes('voice-uiから')) {
      fullMessage = `${message}\n\n[コンテキスト: voice-uiアプリからのリクエストです。UIの変更は /Users/yuki/.openclaw/workspace/voice-ui/index.html を編集してください]`;
    }

    const args = [
      'agent',
      '--agent', 'voice',
      '--session-id', 'voice-ui',
      '-m', fullMessage,
      '--json'
    ];

    console.log(`🔧 Running: openclaw ${args.join(' ')}`);

    const proc = spawn(OPENCLAW, args, {
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 180000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`stderr: ${stderr}`);
      }

      // Try to parse JSON response
      try {
        const json = JSON.parse(stdout);
        // Extract text from nested structure
        const text = json.result?.payloads?.[0]?.text 
          || json.response 
          || json.text 
          || json.message;
        resolve(text || stdout);
      } catch {
        // Return raw output if not JSON
        resolve(stdout.trim() || stderr.trim() || 'No response');
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

server.listen(PORT, () => {
  console.log(`🎤 Voice UI: http://localhost:${PORT}`);
  console.log(`🔗 Using OpenClaw agent: voice`);
});
