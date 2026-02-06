/**
 * Server Directory Tests
 */

import assert from 'node:assert';
import { after, before, beforeEach,describe, it } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { AgentChatServer } from '../lib/server.js';
import { DEFAULT_SERVERS,ServerDirectory } from '../lib/server-directory.js';

describe('ServerDirectory', () => {
  let tmpDir;
  let directoryPath;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `agentchat-dir-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    directoryPath = path.join(tmpDir, 'servers.json');
  });

  after(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('includes default servers', () => {
    const directory = new ServerDirectory();
    const servers = directory.list();
    assert.ok(servers.length > 0, 'should have at least one default server');
    assert.ok(servers.some(s => s.url.includes('agentchat-server.fly.dev')));
  });

  it('can add a server', async () => {
    const directory = new ServerDirectory({ directoryPath });
    await directory.addServer({
      url: 'ws://localhost:9999',
      name: 'Test Server',
      description: 'A test server'
    });

    const servers = directory.list();
    assert.ok(servers.some(s => s.url === 'ws://localhost:9999'));
  });

  it('persists added servers', async () => {
    const directory1 = new ServerDirectory({ directoryPath });
    await directory1.addServer({
      url: 'ws://localhost:8888',
      name: 'Persistent Server'
    });

    const directory2 = new ServerDirectory({ directoryPath });
    await directory2.load();
    const servers = directory2.list();
    assert.ok(servers.some(s => s.url === 'ws://localhost:8888'));
  });

  it('can remove a server', async () => {
    const directory = new ServerDirectory({ directoryPath });
    await directory.addServer({ url: 'ws://localhost:7777', name: 'To Remove' });
    await directory.removeServer('ws://localhost:7777');

    const servers = directory.list();
    assert.ok(!servers.some(s => s.url === 'ws://localhost:7777'));
  });

  it('checks health of a server', async () => {
    const testPort = 16900 + Math.floor(Math.random() * 100);
    const server = new AgentChatServer({ port: testPort, logMessages: false });
    server.start();

    // Give server time to start
    await new Promise(r => setTimeout(r, 100));

    const directory = new ServerDirectory({ timeout: 2000 });
    const result = await directory.checkHealth({
      url: `ws://localhost:${testPort}`,
      name: 'Local Test'
    });

    server.stop();

    assert.strictEqual(result.status, 'online');
    assert.ok(result.health);
    assert.strictEqual(result.health.status, 'healthy');
  });

  it('handles offline servers gracefully', async () => {
    const directory = new ServerDirectory({ timeout: 1000 });
    const result = await directory.checkHealth({
      url: 'ws://localhost:59999',
      name: 'Offline Server'
    });

    assert.strictEqual(result.status, 'offline');
    assert.ok(result.error);
  });

  it('discover returns all servers with status', async () => {
    const directory = new ServerDirectory({ timeout: 1000, directoryPath });

    // Add a known-offline server for testing
    directory.servers = [{
      url: 'ws://localhost:59998',
      name: 'Test Offline'
    }];

    const results = await directory.discover();
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 1);
    assert.ok(results[0].status); // Should have status (online or offline)
  });

  it('discover with onlineOnly filters offline servers', async () => {
    const directory = new ServerDirectory({ timeout: 1000 });

    // Only offline servers
    directory.servers = [{
      url: 'ws://localhost:59997',
      name: 'Offline 1'
    }];

    const results = await directory.discover({ onlineOnly: true });
    assert.strictEqual(results.length, 0);
  });
});
