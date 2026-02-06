#!/usr/bin/env node
/**
 * WhatsApp Automation Skill - Message Store Service
 * Copyright © 2026 OpenClaw Contributors
 * License: CC BY-ND-NC 4.0 (Non-commercial, no modifications)
 * 
 * Receives webhooks from WAHA and stores messages locally.
 * 
 * TERMS OF USE:
 * - Personal/non-commercial use only
 * - No modifications permitted
 * - No commercial use allowed
 * - See LICENSE.md for full terms
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '.whatsapp-messages');
const MESSAGES_FILE = path.join(MESSAGES_DIR, 'messages.jsonl');

// Ensure directory exists
if (!fs.existsSync(MESSAGES_DIR)) {
  fs.mkdirSync(MESSAGES_DIR, { recursive: true });
}

// Initialize port
const PORT = process.env.WHATSAPP_STORE_PORT || 19000;

// Create HTTP server to receive webhooks
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-*', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle POST webhook
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // WAHA sends event in payload.event (can be 'message' or 'message.any')
        if ((payload.event === 'message' || payload.event === 'message.any') && payload.payload) {
          const msgData = payload.payload;
          const message = {
            timestamp: payload.timestamp || new Date().getTime(),
            event: payload.event,
            contact: msgData.from,
            text: msgData.body || '',
            type: msgData.type || 'text',
            hasMedia: !!msgData.hasMedia,
            session: payload.session,
            raw: msgData
          };

          // Append to JSONL file
          fs.appendFileSync(
            MESSAGES_FILE,
            JSON.stringify(message) + '\n'
          );

          console.log(`✅ Message stored: ${message.contact} - "${message.text.substring(0, 50)}"`);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, stored: true }));
        } else if (payload.event === 'session.status') {
          console.log(`📊 Session status: ${payload.payload?.status || 'unknown'}`);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, stored: false }));
        } else {
          console.log(`❓ Unknown event: ${payload.event}`);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, stored: false }));
        }
      } catch (e) {
        console.error('❌ Error parsing webhook:', e.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      ok: true, 
      messagesFile: MESSAGES_FILE,
      messageCount: countMessages()
    }));
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

function countMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) return 0;
  const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
  return content.split('\n').filter(l => l.trim()).length;
}

server.listen(PORT, () => {
  console.log(`🎯 WhatsApp Message Store running on http://localhost:${PORT}`);
  console.log(`📂 Messages stored in: ${MESSAGES_FILE}`);
  console.log(`\n📨 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (e) => {
  console.error('❌ Server error:', e.message);
  process.exit(1);
});
