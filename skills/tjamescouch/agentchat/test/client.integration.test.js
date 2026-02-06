/**
 * AgentChat Client Integration Tests
 * Core client/server communication tests
 * Run with: node --test test/client.integration.test.js
 */

import assert from 'node:assert';
import { after,before, describe, test } from 'node:test';

import { AgentChatClient } from '../lib/client.js';
import { AgentChatServer } from '../lib/server.js';

describe('AgentChat Client', () => {
  let server;
  const PORT = 16667;
  const SERVER_URL = `ws://localhost:${PORT}`;

  before(() => {
    server = new AgentChatServer({ port: PORT });
    server.start();
  });

  after(() => {
    server.stop();
  });

  test('client can connect and identify', async () => {
    const client = new AgentChatClient({
      server: SERVER_URL,
      name: 'test-agent'
    });

    await client.connect();

    assert.ok(client.connected);
    assert.ok(client.agentId);
    assert.ok(client.agentId.startsWith('@'));

    client.disconnect();
  });

  test('client can join channel', async () => {
    const client = new AgentChatClient({
      server: SERVER_URL,
      name: 'test-agent'
    });

    await client.connect();
    const result = await client.join('#general');

    assert.equal(result.channel, '#general');
    assert.ok(Array.isArray(result.agents));

    client.disconnect();
  });

  test('two clients can communicate', async () => {
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      name: 'agent-1'
    });

    const client2 = new AgentChatClient({
      server: SERVER_URL,
      name: 'agent-2'
    });

    await client1.connect();
    await client2.connect();

    await client1.join('#general');
    await client2.join('#general');

    // Set up listener
    const received = new Promise((resolve) => {
      client2.on('message', (msg) => {
        if (msg.content === 'hello from agent-1') {
          resolve(msg);
        }
      });
    });

    // Send message
    await client1.send('#general', 'hello from agent-1');

    // Wait for message
    const msg = await received;

    assert.equal(msg.from, client1.agentId);
    assert.equal(msg.to, '#general');
    assert.equal(msg.content, 'hello from agent-1');

    client1.disconnect();
    client2.disconnect();
  });

  test('direct messages work', async () => {
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      name: 'agent-1'
    });

    const client2 = new AgentChatClient({
      server: SERVER_URL,
      name: 'agent-2'
    });

    await client1.connect();
    await client2.connect();

    // Set up listener
    const received = new Promise((resolve) => {
      client2.on('message', (msg) => {
        if (msg.content === 'private hello') {
          resolve(msg);
        }
      });
    });

    // Send DM
    await client1.dm(client2.agentId, 'private hello');

    // Wait for message
    const msg = await received;

    assert.equal(msg.from, client1.agentId);
    assert.equal(msg.to, client2.agentId);
    assert.equal(msg.content, 'private hello');

    client1.disconnect();
    client2.disconnect();
  });

  test('can list channels', async () => {
    const client = new AgentChatClient({
      server: SERVER_URL,
      name: 'test-agent'
    });

    await client.connect();
    const channels = await client.listChannels();

    assert.ok(Array.isArray(channels));
    assert.ok(channels.some(ch => ch.name === '#general'));
    assert.ok(channels.some(ch => ch.name === '#agents'));

    client.disconnect();
  });

  test('can create private channel', async () => {
    const client = new AgentChatClient({
      server: SERVER_URL,
      name: 'test-agent'
    });

    await client.connect();

    const channelName = `#private-${Date.now()}`;
    await client.createChannel(channelName, true);

    assert.ok(client.channels.has(channelName));

    client.disconnect();
  });
});
