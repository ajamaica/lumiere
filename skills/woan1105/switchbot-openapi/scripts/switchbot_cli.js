#!/usr/bin/env node
// Minimal SwitchBot OpenAPI CLI (Node.js)
// Requires env: SWITCHBOT_TOKEN, SWITCHBOT_SECRET
// Usage:
//   node scripts/switchbot_cli.js list
//   node scripts/switchbot_cli.js status <deviceId>
//   node scripts/switchbot_cli.js cmd <deviceId> <command> [--pos 50] [--temp 24] [...]

const crypto = require('crypto');
const https = require('https');

function baseUrl() {
  const region = (process.env.SWITCHBOT_REGION || 'global').toLowerCase();
  // SwitchBot currently uses the same base; keep switch for future routing
  switch (region) {
    case 'global':
    case 'na':
    case 'eu':
    case 'jp':
    default:
      return 'https://api.switch-bot.com';
  }
}

function headers() {
  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;
  if (!token || !secret) {
    console.error('Missing SWITCHBOT_TOKEN or SWITCHBOT_SECRET');
    process.exit(2);
  }
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const sign = crypto
    .createHmac('sha256', secret)
    .update(token + t + nonce)
    .digest('base64');
  return {
    'Content-Type': 'application/json; charset=utf8',
    'Authorization': token,
    't': t,
    'nonce': nonce,
    'sign': sign,
  };
}

function request(method, path, body) {
  const data = body ? JSON.stringify(body) : undefined;
  const opts = new URL(baseUrl() + path);
  return new Promise((resolve, reject) => {
    const req = https.request({
      method,
      hostname: opts.hostname,
      path: opts.pathname + (opts.search || ''),
      headers: { ...headers(), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          const obj = buf ? JSON.parse(buf) : {};
          resolve(obj);
        } catch (e) {
          resolve(buf);
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      out[k] = v || true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const [cmd, a1, a2] = args._;
  if (!cmd || cmd === 'help') {
    console.log('Commands:\n list\n status <deviceId>\n cmd <deviceId> <command> [--pos 50] [--temp 24] [--speed 1]');
    process.exit(0);
  }
  if (cmd === 'list') {
    return request('GET', '/v1.1/devices').then((obj)=>{
      console.log(JSON.stringify(obj, null, 2));
    }).catch((e)=>{ console.error('HTTP error:', e.message); process.exit(1); });
  }
  if (cmd === 'status') {
    if (!a1) { console.error('status requires <deviceId>'); process.exit(2); }
    return request('GET', `/v1.1/devices/${a1}/status`).then((obj)=>{
      console.log(JSON.stringify(obj, null, 2));
    }).catch((e)=>{ console.error('HTTP error:', e.message); process.exit(1); });
  }
  if (cmd === 'cmd') {
    const deviceId = a1;
    const command = a2;
    if (!deviceId || !command) { console.error('cmd requires <deviceId> <command>'); process.exit(2); }

    // Preflight: fetch device list and verify cloud/hub readiness
    return request('GET', '/v1.1/devices').then((obj)=>{
      const list = (obj && obj.body && obj.body.deviceList) || [];
      const dev = list.find(d => d.deviceId === deviceId);
      if (!dev) {
        console.error(`Device ${deviceId} not found. Run: list`);
        process.exit(3);
      }
      const cloud = dev.enableCloudService === true;
      const hasHub = !!(dev.hubDeviceId && dev.hubDeviceId !== '' && dev.hubDeviceId !== '000000000000');
      const btTypes = ['Bot','Smart Lock','Smart Lock Pro','Blind Tilt','Curtain'];
      const isBt = btTypes.includes(dev.deviceType);
      if (isBt && (!cloud || !hasHub)) {
        console.error(`Preflight failed: ${dev.deviceName || deviceId} (${dev.deviceType}) requires a Hub bound and Cloud Services enabled. Current: enableCloudService=${dev.enableCloudService}, hubDeviceId='${dev.hubDeviceId||''}'. Fix in SwitchBot app, then retry.`);
        process.exit(4);
      }

      let parameter = 'default';
      // raw parameter override (string)
      if (args.param) {
        parameter = String(args.param);
      }
      // JSON parameter override (object)
      if (args.param_json) {
        try { parameter = JSON.parse(args.param_json); } catch { console.error('Invalid --param_json JSON'); process.exit(5); }
      }
      if (command === 'setPosition' && !args.param && !args.param_json) {
        const pos = args.pos || args.position || 50;
        parameter = `${pos}`;
      }
      if (command === 'setTemperature' && !args.param && !args.param_json) {
        const temp = args.temp || 24;
        parameter = `${temp}`;
      }
      // Some models (e.g., Robot Vacuum K10+ Pro Combo) require commandType 'customize'
      const isVac = (dev.deviceType||'').toLowerCase().includes('robot vacuum') || (dev.deviceType||'').toLowerCase().includes('k10');
      const vacCmds = new Set(['startClean','pause','dock','setVolume','changeParam']);
      let commandType = (isVac && vacCmds.has(command)) ? 'customize' : 'command';
      if (args.ctype) commandType = String(args.ctype);
      const body = { commandType, command, parameter };
      return request('POST', `/v1.1/devices/${deviceId}/commands`, body).then((resp)=>{
        // If cloud accepted but device offline, API may still say success. Add a hint.
        if (resp && resp.statusCode === 100) {
          console.log(JSON.stringify(resp, null, 2));
          if (isBt && (dev.enableCloudService !== true || !hasHub)) {
            console.warn('Note: Cloud accepted the request, but device may not actuate without Hub + Cloud Services.');
          }
        } else if (resp && resp.statusCode === 160) {
          // Unknown command – provide guidance, esp. for Robot Vacuums
          console.log(JSON.stringify(resp, null, 2));
          const dt = (dev.deviceType||'').toLowerCase();
          if (dt.includes('vacuum')) {
            console.warn('This robot vacuum model may not expose direct commands via OpenAPI v1.1. Create a Scene in the SwitchBot app (e.g., "Vacuum Start") and execute it via /v1.1/scenes/{id}/execute.');
          } else {
            console.warn('Unknown command for this device. Check device-specific command names or use a Scene.');
          }
        } else {
          console.log(JSON.stringify(resp, null, 2));
        }
      });
    }).catch((e)=>{ console.error('HTTP error:', e.message); process.exit(1); });
  }
  console.error('Unknown command');
  process.exit(1);
}

main();
