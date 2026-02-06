#!/usr/bin/env node
/**
 * AIRC Skill - IRC client for OpenClaw agents
 */

import { appendFileSync, existsSync,readFileSync, writeFileSync } from 'fs';
import { createConnection } from 'net';
import { dirname, join } from 'path';
import { connect as tlsConnect } from 'tls';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config.json');
const STATE_PATH = join(__dirname, 'state.json');
const MESSAGES_PATH = join(__dirname, 'messages.jsonl');

// Load config
let config = {
  server: 'localhost',
  port: 6667,
  tls: false,
  nick: 'OpenClawAgent',
  username: 'openclaw',
  realname: 'OpenClaw Agent',
  channels: ['#lobby'],
  autoReconnect: true
};

if (existsSync(CONFIG_PATH)) {
  try {
    config = { ...config, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {
    console.error('Warning: Could not parse config.json, using defaults');
  }
}

class IRCClient {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.socket = null;
    this.nick = this.config.nick;
    this.registered = false;
    this.buffer = '';
    this.channels = new Set();
    this.messageHandlers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const connectFn = this.config.tls ? tlsConnect : createConnection;
      const connectOpts = {
        host: this.config.server,
        port: this.config.port,
        rejectUnauthorized: this.config.tls ? this.config.verifyTLS !== false : undefined
      };

      this.socket = connectFn(connectOpts, () => {
        this.send(`NICK ${this.nick}`);
        this.send(`USER ${this.config.username} 0 * :${this.config.realname}`);
      });

      this.socket.setEncoding('utf8');

      this.socket.on('data', (data) => {
        this.buffer += data;
        const lines = this.buffer.split('\r\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          if (line) this.handleLine(line);
        }
      });

      this.socket.on('error', (err) => {
        if (!this.registered) {
          reject(err);
        } else {
          this.emit({ type: 'error', message: err.message });
        }
      });

      this.socket.on('close', () => {
        this.emit({ type: 'disconnected' });
      });

      // Wait for registration
      const regHandler = (msg) => {
        if (msg.type === 'registered') {
          this.removeHandler(regHandler);
          resolve(this);
        }
      };
      this.onMessage(regHandler);

      // Timeout
      setTimeout(() => {
        if (!this.registered) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  send(line) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(line + '\r\n');
    }
  }

  handleLine(line) {
    let prefix = null;
    let idx = 0;

    if (line.startsWith(':')) {
      const spaceIdx = line.indexOf(' ');
      prefix = line.slice(1, spaceIdx);
      idx = spaceIdx + 1;
    }

    const rest = line.slice(idx);
    const trailingIdx = rest.indexOf(' :');
    let params;

    if (trailingIdx !== -1) {
      params = rest.slice(0, trailingIdx).split(' ').filter(Boolean);
      params.push(rest.slice(trailingIdx + 2));
    } else {
      params = rest.split(' ').filter(Boolean);
    }

    const command = params.shift()?.toUpperCase();

    switch (command) {
      case 'PING':
        this.send(`PONG :${params[0]}`);
        break;

      case '001': // Welcome
        this.registered = true;
        this.emit({ type: 'registered', nick: this.nick, server: prefix });
        // Auto-join configured channels
        for (const chan of this.config.channels) {
          this.join(chan);
        }
        break;

      case '433': // Nick in use
        this.nick = this.nick + '_';
        this.send(`NICK ${this.nick}`);
        break;

      case 'PRIVMSG':
        const fromNick = prefix?.split('!')[0];
        this.emit({
          type: 'message',
          time: new Date().toISOString(),
          from: fromNick,
          target: params[0],
          text: params[1],
          private: !params[0].startsWith('#')
        });
        break;

      case 'JOIN':
        const joinNick = prefix?.split('!')[0];
        const joinChan = params[0];
        if (joinNick === this.nick) {
          this.channels.add(joinChan);
        }
        this.emit({ type: 'join', time: new Date().toISOString(), nick: joinNick, channel: joinChan });
        break;

      case 'PART':
        const partNick = prefix?.split('!')[0];
        const partChan = params[0];
        if (partNick === this.nick) {
          this.channels.delete(partChan);
        }
        this.emit({ type: 'part', time: new Date().toISOString(), nick: partNick, channel: partChan, reason: params[1] });
        break;

      case 'QUIT':
        this.emit({ type: 'quit', time: new Date().toISOString(), nick: prefix?.split('!')[0], reason: params[0] });
        break;

      case 'NICK':
        const oldNick = prefix?.split('!')[0];
        const newNick = params[0];
        if (oldNick === this.nick) {
          this.nick = newNick;
        }
        this.emit({ type: 'nick', time: new Date().toISOString(), oldNick, newNick });
        break;

      case 'KICK':
        this.emit({
          type: 'kick',
          time: new Date().toISOString(),
          channel: params[0],
          nick: params[1],
          by: prefix?.split('!')[0],
          reason: params[2]
        });
        break;

      case '353': // NAMES
        this.emit({ type: 'names', channel: params[2], names: params[3].split(' ') });
        break;

      case 'ERROR':
        this.emit({ type: 'error', message: params[0] });
        break;
    }
  }

  emit(msg) {
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  removeHandler(handler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  join(channel) {
    this.send(`JOIN ${channel}`);
  }

  part(channel, reason) {
    this.send(`PART ${channel}${reason ? ' :' + reason : ''}`);
  }

  say(target, message) {
    this.send(`PRIVMSG ${target} :${message}`);
  }

  quit(reason = 'Goodbye') {
    this.send(`QUIT :${reason}`);
    this.socket?.end();
  }

  disconnect() {
    this.socket?.destroy();
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  const parseArgs = () => {
    const opts = {};
    for (let i = 1; i < args.length; i += 2) {
      if (args[i]?.startsWith('--')) {
        opts[args[i].slice(2)] = args[i + 1];
      }
    }
    return opts;
  };

  const opts = parseArgs();

  switch (cmd) {
    case 'connect': {
      const clientConfig = { ...config };
      if (opts.nick) clientConfig.nick = opts.nick;
      if (opts.server) clientConfig.server = opts.server;
      if (opts.port) clientConfig.port = parseInt(opts.port);
      if (opts.channel) clientConfig.channels = [opts.channel];

      const client = new IRCClient(clientConfig);
      
      client.onMessage((msg) => {
        console.log(JSON.stringify(msg));
      });

      try {
        await client.connect();
        console.error(`Connected as ${client.nick}`);
        
        // Keep alive
        process.on('SIGINT', () => {
          client.quit('SIGINT');
          process.exit(0);
        });
      } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'send': {
      const client = new IRCClient(config);
      
      try {
        await client.connect();
        
        if (opts.channel) {
          client.join(opts.channel);
          // Wait a moment for join
          await new Promise(r => setTimeout(r, 500));
          client.say(opts.channel, opts.message);
        } else if (opts.nick) {
          client.say(opts.nick, opts.message);
        } else {
          console.error('Need --channel or --nick');
          process.exit(1);
        }
        
        // Wait for message to send
        await new Promise(r => setTimeout(r, 500));
        client.quit();
        process.exit(0);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'listen': {
      const timeout = parseInt(opts.timeout) || 60;
      const channel = opts.channel || '#lobby';
      
      const client = new IRCClient({ ...config, channels: [channel] });
      
      client.onMessage((msg) => {
        if (msg.type === 'message' || msg.type === 'join' || msg.type === 'part') {
          console.log(JSON.stringify(msg));
        }
      });

      try {
        await client.connect();
        console.error(`Listening on ${channel} for ${timeout}s...`);
        
        setTimeout(() => {
          client.quit();
          process.exit(0);
        }, timeout * 1000);
        
        process.on('SIGINT', () => {
          client.quit();
          process.exit(0);
        });
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'join': {
      // Quick join and exit
      const client = new IRCClient(config);
      await client.connect();
      client.join(opts.channel);
      await new Promise(r => setTimeout(r, 1000));
      client.quit();
      break;
    }

    case 'part': {
      const client = new IRCClient(config);
      await client.connect();
      client.part(opts.channel, opts.reason);
      await new Promise(r => setTimeout(r, 1000));
      client.quit();
      break;
    }

    default:
      console.log(`AIRC Skill - IRC client for OpenClaw

Usage:
  node irc.js connect [--nick NAME] [--channel #CHAN] [--server HOST] [--port PORT]
  node irc.js send --channel "#lobby" --message "Hello!"
  node irc.js send --nick "someone" --message "Hey"
  node irc.js listen [--channel #CHAN] [--timeout SECONDS]
  node irc.js join --channel "#general"
  node irc.js part --channel "#general" [--reason "bye"]

Config: ${CONFIG_PATH}
`);
  }
}

main().catch(console.error);
