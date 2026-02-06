/**
 * AgentChat Message History Integration Tests
 * Tests for message replay/history feature (slower due to rate limiting)
 * Run with: node --test test/history.integration.test.js
 */

import assert from 'node:assert';
import { after,before, describe, test } from 'node:test';

import { AgentChatClient } from '../lib/client.js';
import { AgentChatServer } from '../lib/server.js';

describe('Message History', () => {
  let server;
  const PORT = 16672;
  const SERVER_URL = `ws://localhost:${PORT}`;

  before(() => {
    server = new AgentChatServer({ port: PORT });
    server.start();
  });

  after(() => {
    server.stop();
  });

  test('new joiners receive message history with replay flag', async () => {
    // First client sends some messages
    const client1 = new AgentChatClient({
      server: SERVER_URL,
      name: 'sender'
    });

    await client1.connect();
    await client1.join('#general');

    // Send a few messages
    await client1.send('#general', 'history message 1');
    await new Promise(r => setTimeout(r, 1100)); // Wait for rate limit
    await client1.send('#general', 'history message 2');

    // Second client joins and should receive history
    const client2 = new AgentChatClient({
      server: SERVER_URL,
      name: 'joiner'
    });

    const replayedMessages = [];
    client2.on('message', (msg) => {
      if (msg.replay) {
        replayedMessages.push(msg);
      }
    });

    await client2.connect();
    await client2.join('#general');

    // Give time for replay messages to arrive
    await new Promise(r => setTimeout(r, 100));

    // Should have received at least our 2 messages as replay
    assert.ok(replayedMessages.length >= 2, `Expected at least 2 replay messages, got ${replayedMessages.length}`);
    assert.ok(replayedMessages.every(m => m.replay === true), 'All replayed messages should have replay flag');
    assert.ok(replayedMessages.some(m => m.content === 'history message 1'), 'Should contain history message 1');
    assert.ok(replayedMessages.some(m => m.content === 'history message 2'), 'Should contain history message 2');

    client1.disconnect();
    client2.disconnect();
  });
});
