/**
 * AgentChat Daemon
 * Persistent connection with file-based inbox/outbox
 * Supports multiple instances with different identities
 */

import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

import { AgentChatClient } from './client.js';
import { DEFAULT_IDENTITY_PATH,Identity } from './identity.js';
import { appendReceipt, DEFAULT_RECEIPTS_PATH,shouldStoreReceipt } from './receipts.js';

// Base directory (cwd-relative for project-local storage)
const AGENTCHAT_DIR = path.join(process.cwd(), '.agentchat');
const DAEMONS_DIR = path.join(AGENTCHAT_DIR, 'daemons');

// Default instance name
const DEFAULT_INSTANCE = 'default';

const DEFAULT_CHANNELS = ['#general', '#agents'];
const MAX_INBOX_LINES = 1000;
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_TIME = 10 * 60 * 1000; // 10 minutes default
const OUTBOX_POLL_INTERVAL = 500; // 500ms

/**
 * Get paths for a daemon instance
 */
export function getDaemonPaths(instanceName = DEFAULT_INSTANCE) {
  const instanceDir = path.join(DAEMONS_DIR, instanceName);
  return {
    dir: instanceDir,
    inbox: path.join(instanceDir, 'inbox.jsonl'),
    outbox: path.join(instanceDir, 'outbox.jsonl'),
    log: path.join(instanceDir, 'daemon.log'),
    pid: path.join(instanceDir, 'daemon.pid'),
    newdata: path.join(instanceDir, 'newdata')  // Semaphore for new messages
  };
}

export class AgentChatDaemon {
  constructor(options = {}) {
    this.server = options.server;
    this.identityPath = options.identity || DEFAULT_IDENTITY_PATH;
    this.channels = options.channels || DEFAULT_CHANNELS;
    this.instanceName = options.name || DEFAULT_INSTANCE;
    this.maxReconnectTime = options.maxReconnectTime || MAX_RECONNECT_TIME;

    // Get instance-specific paths
    this.paths = getDaemonPaths(this.instanceName);

    this.client = null;
    this.running = false;
    this.reconnecting = false;
    this.reconnectStartTime = null; // Track when reconnection attempts started
    this.outboxWatcher = null;
    this.outboxPollInterval = null;
    this.lastOutboxSize = 0;
  }

  async _ensureDir() {
    await fsp.mkdir(this.paths.dir, { recursive: true });
  }

  _log(level, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // Append to log file
    try {
      fs.appendFileSync(this.paths.log, line);
    } catch {
      // Directory might not exist yet
    }

    // Also output to console if not background
    if (level === 'error') {
      console.error(line.trim());
    } else {
      console.log(line.trim());
    }
  }

  async _appendToInbox(msg) {
    const line = JSON.stringify(msg) + '\n';

    // Append to inbox
    await fsp.appendFile(this.paths.inbox, line);

    // Touch semaphore file to signal new data
    await fsp.writeFile(this.paths.newdata, Date.now().toString());

    // Check if we need to truncate (ring buffer)
    await this._truncateInbox();
  }

  async _truncateInbox() {
    try {
      const content = await fsp.readFile(this.paths.inbox, 'utf-8');
      const lines = content.trim().split('\n');

      if (lines.length > MAX_INBOX_LINES) {
        // Keep only the last MAX_INBOX_LINES
        const newLines = lines.slice(-MAX_INBOX_LINES);
        await fsp.writeFile(this.paths.inbox, newLines.join('\n') + '\n');
        this._log('info', `Truncated inbox to ${MAX_INBOX_LINES} lines`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this._log('error', `Failed to truncate inbox: ${err.message}`);
      }
    }
  }

  async _saveReceiptIfParty(completeMsg) {
    try {
      // Get our agent ID
      const ourAgentId = this.client?.agentId;
      if (!ourAgentId) {
        return;
      }

      // Check if we should store this receipt
      if (shouldStoreReceipt(completeMsg, ourAgentId)) {
        await appendReceipt(completeMsg, DEFAULT_RECEIPTS_PATH);
        this._log('info', `Saved receipt for proposal ${completeMsg.proposal_id}`);
      }
    } catch (err) {
      this._log('error', `Failed to save receipt: ${err.message}`);
    }
  }

  async _processOutbox() {
    try {
      // Check if outbox exists
      try {
        await fsp.access(this.paths.outbox);
      } catch {
        return; // No outbox file
      }

      const content = await fsp.readFile(this.paths.outbox, 'utf-8');
      if (!content.trim()) return;

      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const msg = JSON.parse(line);

          if (msg.to && msg.content) {
            // Join channel if needed
            if (msg.to.startsWith('#') && !this.client.channels.has(msg.to)) {
              await this.client.join(msg.to);
              this._log('info', `Joined ${msg.to} for outbound message`);
            }

            await this.client.send(msg.to, msg.content);
            this._log('info', `Sent message to ${msg.to}: ${msg.content.substring(0, 50)}...`);
          } else {
            this._log('warn', `Invalid outbox message: ${line}`);
          }
        } catch (err) {
          this._log('error', `Failed to process outbox line: ${err.message}`);
        }
      }

      // Truncate outbox after processing
      await fsp.writeFile(this.paths.outbox, '');

    } catch (err) {
      if (err.code !== 'ENOENT') {
        this._log('error', `Outbox error: ${err.message}`);
      }
    }
  }

  _startOutboxWatcher() {
    // Use polling instead of fs.watch for reliability
    this.outboxPollInterval = setInterval(() => {
      if (this.client && this.client.connected) {
        this._processOutbox();
      }
    }, OUTBOX_POLL_INTERVAL);

    // Also try fs.watch for immediate response (may not work on all platforms)
    try {
      // Ensure outbox file exists
      if (!fs.existsSync(this.paths.outbox)) {
        fs.writeFileSync(this.paths.outbox, '');
      }

      this.outboxWatcher = fs.watch(this.paths.outbox, (eventType) => {
        if (eventType === 'change' && this.client && this.client.connected) {
          this._processOutbox();
        }
      });
    } catch (err) {
      this._log('warn', `fs.watch not available, using polling only: ${err.message}`);
    }
  }

  _stopOutboxWatcher() {
    if (this.outboxPollInterval) {
      clearInterval(this.outboxPollInterval);
      this.outboxPollInterval = null;
    }
    if (this.outboxWatcher) {
      this.outboxWatcher.close();
      this.outboxWatcher = null;
    }
  }

  async _connect() {
    this._log('info', `Connecting to ${this.server}...`);

    this.client = new AgentChatClient({
      server: this.server,
      identity: this.identityPath
    });

    // Set up event handlers
    this.client.on('message', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('agent_joined', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('agent_left', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('proposal', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('accept', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('reject', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('complete', async (msg) => {
      await this._appendToInbox(msg);
      // Save receipt if we're a party to this completion
      await this._saveReceiptIfParty(msg);
    });

    this.client.on('dispute', async (msg) => {
      await this._appendToInbox(msg);
    });

    this.client.on('disconnect', () => {
      this._log('warn', 'Disconnected from server');
      if (this.running && !this.reconnecting) {
        this._scheduleReconnect();
      }
    });

    this.client.on('error', (err) => {
      this._log('error', `Client error: ${err.message || JSON.stringify(err)}`);
    });

    try {
      await this.client.connect();
      this._log('info', `Connected as ${this.client.agentId}`);

      // Join channels
      for (const channel of this.channels) {
        try {
          await this.client.join(channel);
          this._log('info', `Joined ${channel}`);
        } catch (err) {
          this._log('error', `Failed to join ${channel}: ${err.message}`);
        }
      }

      return true;
    } catch (err) {
      this._log('error', `Connection failed: ${err.message}`);
      return false;
    }
  }

  _scheduleReconnect() {
    if (!this.running || this.reconnecting) return;

    // Start tracking reconnect time if this is the first attempt
    if (!this.reconnectStartTime) {
      this.reconnectStartTime = Date.now();
    }

    // Check if we've exceeded max reconnect time
    const elapsed = Date.now() - this.reconnectStartTime;
    if (elapsed >= this.maxReconnectTime) {
      this._log('error', `Max reconnect time (${this.maxReconnectTime / 1000 / 60} minutes) exceeded. Giving up.`);
      this._log('info', 'Daemon will exit. Restart manually or use a process manager.');
      this.stop();
      return;
    }

    this.reconnecting = true;
    const remaining = Math.round((this.maxReconnectTime - elapsed) / 1000);
    this._log('info', `Reconnecting in ${RECONNECT_DELAY / 1000} seconds... (${remaining}s until timeout)`);

    setTimeout(async () => {
      this.reconnecting = false;
      if (this.running) {
        const connected = await this._connect();
        if (connected) {
          // Reset reconnect timer on successful connection
          this.reconnectStartTime = null;
          this._log('info', 'Reconnected successfully');
        } else {
          this._scheduleReconnect();
        }
      }
    }, RECONNECT_DELAY);
  }

  async start() {
    this.running = true;

    // Ensure instance directory exists
    await this._ensureDir();

    // Write PID file
    await fsp.writeFile(this.paths.pid, process.pid.toString());
    this._log('info', `Daemon starting (PID: ${process.pid}, instance: ${this.instanceName})`);

    // Initialize inbox if it doesn't exist
    try {
      await fsp.access(this.paths.inbox);
    } catch {
      await fsp.writeFile(this.paths.inbox, '');
    }

    // Connect to server
    const connected = await this._connect();
    if (!connected) {
      this._scheduleReconnect();
    }

    // Start watching outbox
    this._startOutboxWatcher();

    // Handle shutdown signals
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    this._log('info', 'Daemon started');
    this._log('info', `Inbox: ${this.paths.inbox}`);
    this._log('info', `Outbox: ${this.paths.outbox}`);
    this._log('info', `Log: ${this.paths.log}`);
  }

  async stop() {
    this._log('info', 'Daemon stopping...');
    this.running = false;

    this._stopOutboxWatcher();

    if (this.client) {
      this.client.disconnect();
    }

    // Remove PID file
    try {
      await fsp.unlink(this.paths.pid);
    } catch {
      // Ignore if already gone
    }

    this._log('info', 'Daemon stopped');
    process.exit(0);
  }
}

/**
 * Check if daemon instance is running
 */
export async function isDaemonRunning(instanceName = DEFAULT_INSTANCE) {
  const paths = getDaemonPaths(instanceName);

  try {
    const pid = await fsp.readFile(paths.pid, 'utf-8');
    const pidNum = parseInt(pid.trim());

    // Check if process is running
    try {
      process.kill(pidNum, 0);
      return { running: true, pid: pidNum, instance: instanceName };
    } catch {
      // Process not running, clean up stale PID file
      await fsp.unlink(paths.pid);
      return { running: false, instance: instanceName };
    }
  } catch {
    return { running: false, instance: instanceName };
  }
}

/**
 * Stop a daemon instance
 */
export async function stopDaemon(instanceName = DEFAULT_INSTANCE) {
  const status = await isDaemonRunning(instanceName);
  if (!status.running) {
    return { stopped: false, reason: 'Daemon not running', instance: instanceName };
  }

  const paths = getDaemonPaths(instanceName);

  try {
    process.kill(status.pid, 'SIGTERM');

    // Wait a bit for clean shutdown
    await new Promise(r => setTimeout(r, 1000));

    // Check if still running
    try {
      process.kill(status.pid, 0);
      // Still running, force kill
      process.kill(status.pid, 'SIGKILL');
    } catch {
      // Process gone, good
    }

    // Clean up PID file
    try {
      await fsp.unlink(paths.pid);
    } catch {
      // Ignore
    }

    return { stopped: true, pid: status.pid, instance: instanceName };
  } catch (err) {
    return { stopped: false, reason: err.message, instance: instanceName };
  }
}

/**
 * Get daemon instance status
 */
export async function getDaemonStatus(instanceName = DEFAULT_INSTANCE) {
  const status = await isDaemonRunning(instanceName);
  const paths = getDaemonPaths(instanceName);

  if (!status.running) {
    return {
      running: false,
      instance: instanceName
    };
  }

  // Get additional info
  let inboxLines = 0;
  let lastMessage = null;

  try {
    const content = await fsp.readFile(paths.inbox, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    inboxLines = lines.length;

    if (lines.length > 0) {
      try {
        lastMessage = JSON.parse(lines[lines.length - 1]);
      } catch {
        // Ignore parse errors
      }
    }
  } catch {
    // No inbox
  }

  return {
    running: true,
    instance: instanceName,
    pid: status.pid,
    inboxPath: paths.inbox,
    outboxPath: paths.outbox,
    logPath: paths.log,
    inboxLines,
    lastMessage
  };
}

/**
 * List all daemon instances
 */
export async function listDaemons() {
  const instances = [];

  try {
    const entries = await fsp.readdir(DAEMONS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const status = await isDaemonRunning(entry.name);
        instances.push({
          name: entry.name,
          running: status.running,
          pid: status.pid || null
        });
      }
    }
  } catch {
    // No daemons directory
  }

  return instances;
}

/**
 * Stop all running daemons
 */
export async function stopAllDaemons() {
  const instances = await listDaemons();
  const results = [];

  for (const instance of instances) {
    if (instance.running) {
      const result = await stopDaemon(instance.name);
      results.push(result);
    }
  }

  return results;
}

// Export for CLI (backwards compatibility with default paths)
export const INBOX_PATH = getDaemonPaths(DEFAULT_INSTANCE).inbox;
export const OUTBOX_PATH = getDaemonPaths(DEFAULT_INSTANCE).outbox;
export const LOG_PATH = getDaemonPaths(DEFAULT_INSTANCE).log;
export const PID_PATH = getDaemonPaths(DEFAULT_INSTANCE).pid;
export { DEFAULT_CHANNELS, DEFAULT_INSTANCE };
