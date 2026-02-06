/**
 * AgentChat Identity Integration Tests
 * Tests for identity features with server
 * Run with: node --test test/identity.integration.test.js
 */

import assert from 'node:assert';
import { after,before, describe, test } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { AgentChatClient } from '../lib/client.js';
import { Identity } from '../lib/identity.js';
import { AgentChatServer } from '../lib/server.js';

describe('AgentChat with Identity', () => {
  let server;
  const PORT = 16668;
  const SERVER_URL = `ws://localhost:${PORT}`;
  const testDir = path.join(os.tmpdir(), `agentchat-identity-test-${Date.now()}`);

  before(async () => {
    await fs.mkdir(testDir, { recursive: true });
    server = new AgentChatServer({ port: PORT });
    server.start();
  });

  after(async () => {
    server.stop();
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  test('client with identity gets stable ID', async () => {
    // Create identity file
    const identity = Identity.generate('persistent-agent');
    const identityPath = path.join(testDir, 'test-identity.json');
    await identity.save(identityPath);

    // First connection
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      identity: identityPath
    });
    await client1.connect();
    const id1 = client1.agentId;
    client1.disconnect();

    // Wait a bit
    await new Promise(r => setTimeout(r, 100));

    // Second connection with same identity
    const client2 = new AgentChatClient({
      server: SERVER_URL,
      identity: identityPath
    });
    await client2.connect();
    const id2 = client2.agentId;
    client2.disconnect();

    // Should have same ID
    assert.equal(id1, id2);
  });

  test('ephemeral clients get different IDs', async () => {
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      name: 'ephemeral-1'
    });
    await client1.connect();
    const id1 = client1.agentId;
    client1.disconnect();

    await new Promise(r => setTimeout(r, 100));

    const client2 = new AgentChatClient({
      server: SERVER_URL,
      name: 'ephemeral-2'
    });
    await client2.connect();
    const id2 = client2.agentId;
    client2.disconnect();

    // Different IDs (overwhelming probability)
    assert.notEqual(id1, id2);
  });

  test('signed messages include signature', async () => {
    const identity = Identity.generate('signing-agent');
    const identityPath = path.join(testDir, 'signing-identity.json');
    await identity.save(identityPath);

    const sender = new AgentChatClient({
      server: SERVER_URL,
      identity: identityPath
    });

    const receiver = new AgentChatClient({
      server: SERVER_URL,
      name: 'receiver'
    });

    await sender.connect();
    await receiver.connect();
    await sender.join('#general');
    await receiver.join('#general');

    const received = new Promise((resolve) => {
      receiver.on('message', (msg) => {
        if (msg.content === 'signed hello') {
          resolve(msg);
        }
      });
    });

    await sender.send('#general', 'signed hello');

    const msg = await received;

    assert.equal(msg.content, 'signed hello');
    assert.ok(msg.sig, 'Message should have signature');

    sender.disconnect();
    receiver.disconnect();
  });

  test('duplicate identity connection kicks old connection', async () => {
    const identity = Identity.generate('unique-agent');
    const identityPath = path.join(testDir, 'unique-identity.json');
    await identity.save(identityPath);

    // First connection
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      identity: identityPath
    });
    await client1.connect();
    const originalId = client1.agentId;

    // Track if client1 receives disconnect
    let client1Disconnected = false;
    client1.on('error', () => {
      client1Disconnected = true;
    });
    client1.on('close', () => {
      client1Disconnected = true;
    });

    // Second connection with same identity should succeed (kicking the first)
    const client2 = new AgentChatClient({
      server: SERVER_URL,
      identity: identityPath
    });

    await client2.connect();

    // Client2 should have the same agent ID
    assert.equal(client2.agentId, originalId, 'New connection should get same agent ID');

    // Give time for client1 to receive disconnect
    await new Promise(r => setTimeout(r, 100));

    // Client1 should have been disconnected
    assert.ok(client1Disconnected || !client1.connected, 'Old connection should be kicked');

    // Cleanup
    if (client1.connected) client1.disconnect();
    client2.disconnect();
  });
});
