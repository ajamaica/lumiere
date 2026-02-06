/**
 * Agent Presence Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import { AgentChatClient } from '../lib/client.js';
import { AgentChatServer } from '../lib/server.js';

describe('Agent Presence', () => {
  let server;
  let testPort;
  let testServer;

  before(() => {
    testPort = 16950 + Math.floor(Math.random() * 50);
    testServer = `ws://localhost:${testPort}`;
    server = new AgentChatServer({ port: testPort, logMessages: false });
    server.start();
  });

  after(() => {
    server.stop();
  });

  it('agents default to online presence', async () => {
    const client = new AgentChatClient({ server: testServer, name: 'test-agent' });
    await client.connect();
    await client.join('#general');

    // Set up listener BEFORE sending request - listen for 'agents' event
    const agentsPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client.removeListener('agents', handler);
        resolve(msg);
      };
      client.on('agents', handler);
    });

    client.sendRaw({ type: 'LIST_AGENTS', channel: '#general' });
    const agentsMsg = await agentsPromise;

    const myAgent = agentsMsg.list.find(a => a.name === 'test-agent');
    assert.ok(myAgent, 'Agent should be in list');
    assert.strictEqual(myAgent.presence, 'online');

    client.disconnect();
  });

  it('can set presence to away', async () => {
    const client = new AgentChatClient({ server: testServer, name: 'away-agent' });
    await client.connect();
    await client.join('#general');

    // Set presence
    client.sendRaw({ type: 'SET_PRESENCE', status: 'away', status_text: 'Be right back' });
    await new Promise(r => setTimeout(r, 50));

    // Listen for 'agents' event
    const agentsPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client.removeListener('agents', handler);
        resolve(msg);
      };
      client.on('agents', handler);
    });

    client.sendRaw({ type: 'LIST_AGENTS', channel: '#general' });
    const agentsMsg = await agentsPromise;

    const myAgent = agentsMsg.list.find(a => a.name === 'away-agent');
    assert.strictEqual(myAgent.presence, 'away');
    assert.strictEqual(myAgent.status_text, 'Be right back');

    client.disconnect();
  });

  it('can set presence to busy', async () => {
    const client = new AgentChatClient({ server: testServer, name: 'busy-agent' });
    await client.connect();
    await client.join('#general');

    client.sendRaw({ type: 'SET_PRESENCE', status: 'busy' });
    await new Promise(r => setTimeout(r, 50));

    const agentsPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client.removeListener('agents', handler);
        resolve(msg);
      };
      client.on('agents', handler);
    });

    client.sendRaw({ type: 'LIST_AGENTS', channel: '#general' });
    const agentsMsg = await agentsPromise;

    const myAgent = agentsMsg.list.find(a => a.name === 'busy-agent');
    assert.strictEqual(myAgent.presence, 'busy');

    client.disconnect();
  });

  it('broadcasts presence changes to channel members', async () => {
    // Test presence broadcast by checking server state after change
    const client1 = new AgentChatClient({ server: testServer, name: 'broadcaster' });
    const client2 = new AgentChatClient({ server: testServer, name: 'listener' });

    await client1.connect();
    await client2.connect();

    await client1.join('#general');
    await client2.join('#general');

    // Client1 changes presence
    client1.sendRaw({ type: 'SET_PRESENCE', status: 'away', status_text: 'AFK' });
    await new Promise(r => setTimeout(r, 50));

    // Client2 checks agent list - should see client1 as away
    const agentsPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client2.removeListener('agents', handler);
        resolve(msg);
      };
      client2.on('agents', handler);
    });

    client2.sendRaw({ type: 'LIST_AGENTS', channel: '#general' });
    const agentsMsg = await agentsPromise;

    const broadcaster = agentsMsg.list.find(a => a.name === 'broadcaster');
    assert.ok(broadcaster, 'Broadcaster should be in list');
    assert.strictEqual(broadcaster.presence, 'away');
    assert.strictEqual(broadcaster.status_text, 'AFK');

    client1.disconnect();
    client2.disconnect();
  });

  it('rejects invalid presence status', async () => {
    const client = new AgentChatClient({ server: testServer, name: 'invalid-status' });
    await client.connect();

    // Listen for 'error' event
    const errorPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client.removeListener('error', handler);
        resolve(msg);
      };
      client.on('error', handler);
    });

    client.sendRaw({ type: 'SET_PRESENCE', status: 'invalid-status' });

    const errorMsg = await errorPromise;
    assert.ok(errorMsg.message.includes('Invalid presence status'));

    client.disconnect();
  });

  it('requires authentication for presence', async () => {
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket(testServer);

    await new Promise((resolve) => ws.on('open', resolve));

    const errorPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ERROR') {
          clearTimeout(timeout);
          resolve(msg);
        }
      });
    });

    ws.send(JSON.stringify({ type: 'SET_PRESENCE', status: 'away' }));

    const errorMsg = await errorPromise;
    assert.strictEqual(errorMsg.code, 'AUTH_REQUIRED');

    ws.close();
  });
});
