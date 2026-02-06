/**
 * Proposal Integration Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { AgentChatClient } from '../lib/client.js';
import { Identity } from '../lib/identity.js';
import { AgentChatServer } from '../lib/server.js';

const TEST_PORT = 16670;
const TEST_SERVER = `ws://localhost:${TEST_PORT}`;

describe('Proposals', () => {
  let server;
  let aliceIdentityPath;
  let bobIdentityPath;

  before(async () => {
    // Create temp directory for test identities
    const tmpDir = path.join(os.tmpdir(), `agentchat-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    aliceIdentityPath = path.join(tmpDir, 'alice.json');
    bobIdentityPath = path.join(tmpDir, 'bob.json');

    // Generate test identities
    const alice = Identity.generate('alice');
    await alice.save(aliceIdentityPath);

    const bob = Identity.generate('bob');
    await bob.save(bobIdentityPath);

    // Start server
    server = new AgentChatServer({ port: TEST_PORT, logMessages: false });
    server.start();
  });

  after(async () => {
    server.stop();
    // Clean up temp files
    try {
      await fs.unlink(aliceIdentityPath);
      await fs.unlink(bobIdentityPath);
      await fs.rmdir(path.dirname(aliceIdentityPath));
    } catch {
      // Ignore cleanup errors
    }
  });

  it('can send and receive a proposal', async () => {
    const alice = new AgentChatClient({ server: TEST_SERVER, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: TEST_SERVER, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    // Set up listener for Bob
    const proposalReceived = new Promise((resolve) => {
      bob.on('proposal', resolve);
    });

    // Alice sends proposal
    const proposal = await alice.propose(bob.agentId, {
      task: 'Test task',
      amount: 1.5,
      currency: 'SOL',
      payment_code: 'alice-code',
      expires: 60
    });

    assert.ok(proposal.id, 'Proposal should have an ID');
    assert.strictEqual(proposal.task, 'Test task');
    assert.strictEqual(proposal.amount, 1.5);

    // Bob should receive it
    const received = await proposalReceived;
    assert.strictEqual(received.id, proposal.id);
    assert.strictEqual(received.task, 'Test task');

    alice.disconnect();
    bob.disconnect();
  });

  it('can accept a proposal', async () => {
    const alice = new AgentChatClient({ server: TEST_SERVER, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: TEST_SERVER, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    // Alice sends proposal
    const proposal = await alice.propose(bob.agentId, {
      task: 'Accept test',
      amount: 2,
      currency: 'USDC'
    });

    // Set up listener for Alice
    const acceptReceived = new Promise((resolve) => {
      alice.on('accept', resolve);
    });

    // Bob accepts
    const response = await bob.accept(proposal.id, 'bob-payment-code');
    assert.strictEqual(response.status, 'accepted');

    // Alice should receive accept notification
    const received = await acceptReceived;
    assert.strictEqual(received.proposal_id, proposal.id);
    assert.strictEqual(received.status, 'accepted');
    assert.strictEqual(received.payment_code, 'bob-payment-code');

    alice.disconnect();
    bob.disconnect();
  });

  it('can reject a proposal', async () => {
    const alice = new AgentChatClient({ server: TEST_SERVER, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: TEST_SERVER, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    const proposal = await alice.propose(bob.agentId, {
      task: 'Reject test'
    });

    const rejectReceived = new Promise((resolve) => {
      alice.on('reject', resolve);
    });

    const response = await bob.reject(proposal.id, 'Not interested');
    assert.strictEqual(response.status, 'rejected');

    const received = await rejectReceived;
    assert.strictEqual(received.proposal_id, proposal.id);
    assert.strictEqual(received.reason, 'Not interested');

    alice.disconnect();
    bob.disconnect();
  });

  it('can complete a proposal', async () => {
    const alice = new AgentChatClient({ server: TEST_SERVER, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: TEST_SERVER, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    const proposal = await alice.propose(bob.agentId, { task: 'Complete test' });
    await bob.accept(proposal.id);

    const completeReceived = new Promise((resolve) => {
      alice.on('complete', resolve);
    });

    const response = await bob.complete(proposal.id, 'tx:abc123');
    assert.strictEqual(response.status, 'completed');

    const received = await completeReceived;
    assert.strictEqual(received.proposal_id, proposal.id);
    assert.strictEqual(received.proof, 'tx:abc123');

    alice.disconnect();
    bob.disconnect();
  });

  it('can dispute a proposal', async () => {
    const alice = new AgentChatClient({ server: TEST_SERVER, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: TEST_SERVER, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    const proposal = await alice.propose(bob.agentId, { task: 'Dispute test' });
    await bob.accept(proposal.id);

    const disputeReceived = new Promise((resolve) => {
      bob.on('dispute', resolve);
    });

    const response = await alice.dispute(proposal.id, 'Work not delivered');
    assert.strictEqual(response.status, 'disputed');

    const received = await disputeReceived;
    assert.strictEqual(received.proposal_id, proposal.id);
    assert.strictEqual(received.reason, 'Work not delivered');

    alice.disconnect();
    bob.disconnect();
  });

  it('requires identity for proposals', async () => {
    // Client without identity
    const noIdentity = new AgentChatClient({ server: TEST_SERVER, name: 'no-id' });
    await noIdentity.connect();

    await assert.rejects(
      async () => {
        await noIdentity.propose('@someone', { task: 'test' });
      },
      /persistent identity/i
    );

    noIdentity.disconnect();
  });
});
