/**
 * Identity Verification Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import fs from 'fs';
import os from 'os';
import path from 'path';

import { AgentChatClient } from '../lib/client.js';
import { Identity } from '../lib/identity.js';
import { AgentChatServer } from '../lib/server.js';

describe('Identity Verification', () => {
  let server;
  let testPort;
  let testServer;
  let tempDir;
  let identity1;
  let identity2;

  before(async () => {
    testPort = 16980 + Math.floor(Math.random() * 20);
    testServer = `ws://localhost:${testPort}`;
    server = new AgentChatServer({ port: testPort, logMessages: false });
    server.start();

    // Create temp directory for identity files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-verify-test-'));

    // Create two identities for testing
    identity1 = Identity.generate('verifier');
    await identity1.save(path.join(tempDir, 'verifier.json'));

    identity2 = Identity.generate('target');
    await identity2.save(path.join(tempDir, 'target.json'));
  });

  after(() => {
    server.stop();
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('can verify an agent with persistent identity', async () => {
    const client1 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'verifier.json')
    });
    const client2 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'target.json')
    });

    await client1.connect();
    await client2.connect();

    // Enable auto-verification on client2
    client2.enableAutoVerification(true);

    // Verify client2 from client1
    const result = await client1.verify(client2.agentId);

    assert.strictEqual(result.verified, true);
    assert.ok(result.pubkey, 'Should return pubkey');
    assert.ok(result.pubkey.includes('PUBLIC KEY'), 'Pubkey should be PEM format');

    client1.disconnect();
    client2.disconnect();
  });

  it('verification fails for agent without pubkey', async () => {
    const client1 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'verifier.json')
    });
    const client2 = new AgentChatClient({
      server: testServer,
      name: 'ephemeral-agent' // No identity
    });

    await client1.connect();
    await client2.connect();

    // Try to verify ephemeral agent - should fail
    const errorPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client1.removeListener('error', handler);
        resolve(msg);
      };
      client1.on('error', handler);
    });

    client1.sendRaw({
      type: 'VERIFY_REQUEST',
      target: client2.agentId,
      nonce: 'test-nonce-12345678'
    });

    const errorMsg = await errorPromise;
    assert.strictEqual(errorMsg.code, 'NO_PUBKEY');

    client1.disconnect();
    client2.disconnect();
  });

  it('verification fails for non-existent agent', async () => {
    const client1 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'verifier.json')
    });

    await client1.connect();

    const errorPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client1.removeListener('error', handler);
        resolve(msg);
      };
      client1.on('error', handler);
    });

    client1.sendRaw({
      type: 'VERIFY_REQUEST',
      target: '@nonexistent',
      nonce: 'test-nonce-12345678'
    });

    const errorMsg = await errorPromise;
    assert.strictEqual(errorMsg.code, 'AGENT_NOT_FOUND');

    client1.disconnect();
  });

  it('verification fails with invalid signature', async () => {
    const client1 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'verifier.json')
    });
    const client2 = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'target.json')
    });

    await client1.connect();
    await client2.connect();

    // Don't use auto-verification - manually respond with invalid signature
    const requestPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      const handler = (msg) => {
        if (msg.nonce && msg.request_id && msg.from) {
          clearTimeout(timeout);
          client2.removeListener('verify_request', handler);
          resolve(msg);
        }
      };
      client2.on('verify_request', handler);
    });

    // Start verification
    const verifyPromise = client1.verify(client2.agentId);

    // Wait for request on client2
    const request = await requestPromise;

    // Send invalid signature response
    client2.sendRaw({
      type: 'VERIFY_RESPONSE',
      request_id: request.request_id,
      nonce: request.nonce,
      sig: 'invalid-signature-not-base64!'
    });

    // Should get verification failed result
    const result = await verifyPromise;
    assert.strictEqual(result.verified, false);
    assert.ok(result.reason.includes('failed'), 'Should indicate failure reason');

    client1.disconnect();
    client2.disconnect();
  });

  it('requires authentication for verification requests', async () => {
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

    ws.send(JSON.stringify({
      type: 'VERIFY_REQUEST',
      target: '@someagent',
      nonce: 'test-nonce-12345678'
    }));

    const errorMsg = await errorPromise;
    assert.strictEqual(errorMsg.code, 'AUTH_REQUIRED');

    ws.close();
  });

  it('can disable auto-verification', async () => {
    const client = new AgentChatClient({
      server: testServer,
      identity: path.join(tempDir, 'target.json')
    });

    await client.connect();

    // Enable then disable
    client.enableAutoVerification(true);
    assert.ok(client._autoVerifyHandler, 'Handler should be set');

    client.enableAutoVerification(false);
    assert.strictEqual(client._autoVerifyHandler, null, 'Handler should be removed');

    client.disconnect();
  });

  it('handles verification timeout', async () => {
    // Create a server with very short timeout for testing
    const shortTimeoutServer = new AgentChatServer({
      port: testPort + 1,
      logMessages: false,
      verificationTimeoutMs: 500 // 500ms timeout
    });
    shortTimeoutServer.start();

    const client1 = new AgentChatClient({
      server: `ws://localhost:${testPort + 1}`,
      identity: path.join(tempDir, 'verifier.json')
    });
    const client2 = new AgentChatClient({
      server: `ws://localhost:${testPort + 1}`,
      identity: path.join(tempDir, 'target.json')
    });

    await client1.connect();
    await client2.connect();

    // Don't enable auto-verification - let it timeout
    const failedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 2000);
      const handler = (msg) => {
        clearTimeout(timeout);
        client1.removeListener('verify_failed', handler);
        resolve(msg);
      };
      client1.on('verify_failed', handler);
    });

    // Send verification request
    client1.sendRaw({
      type: 'VERIFY_REQUEST',
      target: client2.agentId,
      nonce: 'test-nonce-12345678'
    });

    const failed = await failedPromise;
    assert.ok(failed.reason.includes('timed out'), 'Should indicate timeout');

    client1.disconnect();
    client2.disconnect();
    shortTimeoutServer.stop();
  });
});
