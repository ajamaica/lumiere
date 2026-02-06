#!/usr/bin/env node
/**
 * Side_Peace 🍒 — Minimal secret handoff (zero deps)
 *
 * Human opens URL → submits secret → agent reads from temp file
 * Secret NEVER appears in stdout. Fully auditable.
 */

const http = require('http')
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Parse args
const args = process.argv.slice(2)
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : def
}

const PORT = parseInt(getArg('port', '3000'))
const LABEL = getArg('label', 'Secret')
const OUTPUT = getArg(
  'output',
  path.join(os.tmpdir(), `side-peace-${crypto.randomBytes(8).toString('hex')}.secret`),
)

// Get local IPs
const getLocalIPs = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)

// HTML form
const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Side_Peace</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:400px;margin:60px auto;padding:20px;background:#111;color:#eee;text-align:center}
  .cherry{font-size:120px;margin:0 0 10px;line-height:1}
  h1{margin:0 0 8px;color:#fff;font-size:32px;letter-spacing:2px}
  .label{color:#888;margin:0 0 24px;font-size:14px}
  textarea{width:100%;height:120px;padding:12px;border:1px solid #333;border-radius:8px;font-size:16px;font-family:monospace;background:#1a1a1a;color:#fff;resize:vertical;box-sizing:border-box;text-align:left}
  textarea:focus{outline:none;border-color:#666}
  button{width:100%;padding:14px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px}
  button:hover{background:#b91c1c}
  .done{text-align:center;color:#22c55e;font-size:18px;margin-top:40px}
</style></head>
<body>
  <div class="cherry">🍒</div>
  <h1>Side_Peace</h1>
  <p class="label">${LABEL}</p>
  <form method="POST" id="f">
    <textarea name="secret" placeholder="Paste secret here..." autofocus required></textarea>
    <button type="submit">Submit Secret</button>
  </form>
  <script>
    document.getElementById('f').onsubmit=async e=>{
      e.preventDefault();
      const s=e.target.secret.value;
      await fetch('/',{method:'POST',body:s});
      document.body.innerHTML='<div class="done">✓ Sent! You can close this tab.</div>';
    };
  </script>
</body></html>`

// Server
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  } else if (req.method === 'POST') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      res.writeHead(200)
      res.end('ok')

      // Write secret to file (NOT stdout!)
      fs.writeFileSync(OUTPUT, body.trim(), { mode: 0o600 })

      console.log(`\n✓ Secret received and saved.`)
      console.log(`  File: ${OUTPUT}`)
      console.log(`  (Secret is NOT printed to stdout for security)`)

      server.close(() => process.exit(0))
    })
  }
})

// Start
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs()
  console.log(`🍒 Side_Peace waiting...`)
  console.log(`   Label: ${LABEL}`)
  console.log(`   Output: ${OUTPUT}\n`)
  console.log(`   Local:    http://localhost:${PORT}`)
  ips.forEach((ip) => console.log(`   Network:  http://${ip}:${PORT}`))
  console.log(`\nWaiting for secret...`)
})
