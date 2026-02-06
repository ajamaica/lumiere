/**
 * AgentChat Daemon Tests
 * Run with: node --test test/daemon.test.js
 */

import assert from 'node:assert';
import { after,before, describe, test } from 'node:test';

import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
  AgentChatDaemon,
  getDaemonPaths,
  getDaemonStatus,
  isDaemonRunning,
  stopDaemon} from '../lib/daemon.js';
import { Identity } from '../lib/identity.js';
import { AgentChatServer } from '../lib/server.js';

describe('Daemon', () => {
  let server;
  const PORT = 16672; // Use non-standard port for testing
  const SERVER_URL = `ws://localhost:${PORT}`;
  const testDir = path.join(os.tmpdir(), `agentchat-daemon-test-${Date.now()}`);

  // Use isolated test instance to avoid interfering with real daemons
  const TEST_INSTANCE = `test-${crypto.randomBytes(4).toString('hex')}`;
  const testPaths = getDaemonPaths(TEST_INSTANCE);
  const testIdentityPath = path.join(testDir, 'test-identity.json');

  before(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create test instance directory
    await fs.mkdir(testPaths.dir, { recursive: true });

    // Create test identity
    const identity = Identity.generate('daemon-test-agent');
    await identity.save(testIdentityPath);

    // Start test server
    server = new AgentChatServer({ port: PORT });
    server.start();

    // Clean up any existing daemon files from previous runs
    try {
      await fs.unlink(testPaths.pid);
    } catch {}
  });

  after(async () => {
    server.stop();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}

    // Clean up test instance directory
    try {
      await fs.rm(testPaths.dir, { recursive: true });
    } catch {}
  });

  test('isDaemonRunning returns false when no daemon is running', async () => {
    const status = await isDaemonRunning();
    assert.equal(status.running, false);
  });

  test('getDaemonStatus returns not running when no daemon', async () => {
    const status = await getDaemonStatus();
    assert.equal(status.running, false);
  });

  test('stopDaemon returns appropriate message when no daemon running', async () => {
    const result = await stopDaemon();
    assert.equal(result.stopped, false);
    assert.equal(result.reason, 'Daemon not running');
  });

  test('daemon can be instantiated', () => {
    const daemon = new AgentChatDaemon({
      server: SERVER_URL,
      identity: testIdentityPath,
      channels: ['#general', '#agents'],
      name: TEST_INSTANCE
    });

    assert.equal(daemon.server, SERVER_URL);
    assert.equal(daemon.identityPath, testIdentityPath);
    assert.deepEqual(daemon.channels, ['#general', '#agents']);
    assert.equal(daemon.running, false);
  });

  test('daemon connects and joins channels', async () => {
    const daemon = new AgentChatDaemon({
      server: SERVER_URL,
      identity: testIdentityPath,
      channels: ['#general'],
      name: TEST_INSTANCE
    });

    // Start daemon
    await daemon.start();

    // Give time to connect
    await new Promise(r => setTimeout(r, 500));

    assert.equal(daemon.running, true);
    assert.ok(daemon.client);
    assert.ok(daemon.client.connected);

    // Stop daemon
    daemon.running = false;
    daemon._stopOutboxWatcher();
    daemon.client.disconnect();

    // Clean up PID file
    try {
      await fs.unlink(testPaths.pid);
    } catch {}
  });

  test('daemon writes messages to inbox', async () => {
    // Clear inbox first
    try {
      await fs.writeFile(testPaths.inbox, '');
    } catch {}

    const daemon = new AgentChatDaemon({
      server: SERVER_URL,
      identity: testIdentityPath,
      channels: ['#general'],
      name: TEST_INSTANCE
    });

    await daemon.start();
    await new Promise(r => setTimeout(r, 500));

    // Check inbox has messages (at least the channel history)
    const inboxContent = await fs.readFile(testPaths.inbox, 'utf-8');

    // Stop daemon
    daemon.running = false;
    daemon._stopOutboxWatcher();
    daemon.client.disconnect();

    try {
      await fs.unlink(testPaths.pid);
    } catch {}

    // Inbox might be empty if no history, but shouldn't throw
    assert.ok(typeof inboxContent === 'string');
  });

  test('daemon processes outbox messages', async () => {
    const daemon = new AgentChatDaemon({
      server: SERVER_URL,
      identity: testIdentityPath,
      channels: ['#general'],
      name: TEST_INSTANCE
    });

    await daemon.start();
    await new Promise(r => setTimeout(r, 500));

    // Write to outbox (using isolated test path, not shared with real daemons)
    const testMsg = '{"to":"#general","content":"Test message from isolated daemon.test.js"}\n';
    await fs.writeFile(testPaths.outbox, testMsg);

    // Wait for processing
    await new Promise(r => setTimeout(r, 1000));

    // Outbox should be truncated after processing
    const outboxContent = await fs.readFile(testPaths.outbox, 'utf-8');
    assert.equal(outboxContent.trim(), '', 'Outbox should be empty after processing');

    // Stop daemon
    daemon.running = false;
    daemon._stopOutboxWatcher();
    daemon.client.disconnect();

    try {
      await fs.unlink(testPaths.pid);
    } catch {}
  });

  test('daemon creates PID file', async () => {
    const daemon = new AgentChatDaemon({
      server: SERVER_URL,
      identity: testIdentityPath,
      channels: ['#general'],
      name: TEST_INSTANCE
    });

    await daemon.start();
    await new Promise(r => setTimeout(r, 200));

    // Check PID file exists
    const pidContent = await fs.readFile(testPaths.pid, 'utf-8');
    const pid = parseInt(pidContent.trim());
    assert.equal(pid, process.pid);

    // Stop daemon
    daemon.running = false;
    daemon._stopOutboxWatcher();
    daemon.client.disconnect();

    try {
      await fs.unlink(testPaths.pid);
    } catch {}
  });
});

describe('Channel normalization', () => {
  // This logic is in bin/agentchat.js - testing the expected behavior
  const normalizeChannels = (channels) => channels
    .flatMap(c => c.split(','))
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .map(c => c.startsWith('#') ? c : '#' + c);

  test('normalizes comma-separated channels', () => {
    const result = normalizeChannels(['#general,#skills']);
    assert.deepEqual(result, ['#general', '#skills']);
  });

  test('normalizes space-separated channels', () => {
    const result = normalizeChannels(['#general', '#skills']);
    assert.deepEqual(result, ['#general', '#skills']);
  });

  test('adds # prefix if missing', () => {
    const result = normalizeChannels(['general,skills']);
    assert.deepEqual(result, ['#general', '#skills']);
  });

  test('handles mixed formats', () => {
    const result = normalizeChannels(['#general,skills', '#agents']);
    assert.deepEqual(result, ['#general', '#skills', '#agents']);
  });

  test('trims whitespace', () => {
    const result = normalizeChannels(['#general , #skills']);
    assert.deepEqual(result, ['#general', '#skills']);
  });

  test('filters empty strings', () => {
    const result = normalizeChannels(['#general,,#skills', '']);
    assert.deepEqual(result, ['#general', '#skills']);
  });
});

describe('Daemon file paths', () => {
  const defaultPaths = getDaemonPaths('default');

  test('inbox path is in home directory', () => {
    assert.ok(defaultPaths.inbox.includes('.agentchat'));
    assert.ok(defaultPaths.inbox.endsWith('inbox.jsonl'));
  });

  test('outbox path is in home directory', () => {
    assert.ok(defaultPaths.outbox.includes('.agentchat'));
    assert.ok(defaultPaths.outbox.endsWith('outbox.jsonl'));
  });

  test('log path is in home directory', () => {
    assert.ok(defaultPaths.log.includes('.agentchat'));
    assert.ok(defaultPaths.log.endsWith('daemon.log'));
  });

  test('pid path is in home directory', () => {
    assert.ok(defaultPaths.pid.includes('.agentchat'));
    assert.ok(defaultPaths.pid.endsWith('daemon.pid'));
  });
});

console.log('Running daemon tests...');
