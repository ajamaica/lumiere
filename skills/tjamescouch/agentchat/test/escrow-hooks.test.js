/**
 * Escrow Hooks Tests
 */

import assert from 'node:assert';
import { after, before, beforeEach,describe, it } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { AgentChatClient } from '../lib/client.js';
import {
  createCompletionPayload,
  createDisputePayload,
  createEscrowCreatedPayload,
  createEscrowReleasedPayload,
  EscrowEvent,
  EscrowHooks} from '../lib/escrow-hooks.js';
import { Identity } from '../lib/identity.js';
import { AgentChatServer } from '../lib/server.js';

describe('EscrowHooks', () => {
  describe('unit tests', () => {
    let hooks;

    beforeEach(() => {
      hooks = new EscrowHooks({ logger: { error: () => {} } }); // Suppress logs
    });

    it('registers handlers with on()', () => {
      const handler = () => {};
      hooks.on(EscrowEvent.CREATED, handler);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 1);
    });

    it('unregisters handlers with off()', () => {
      const handler = () => {};
      hooks.on(EscrowEvent.CREATED, handler);
      hooks.off(EscrowEvent.CREATED, handler);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 0);
    });

    it('returns unsubscribe function from on()', () => {
      const handler = () => {};
      const unsubscribe = hooks.on(EscrowEvent.CREATED, handler);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 1);
      unsubscribe();
      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 0);
    });

    it('emits events to registered handlers', async () => {
      let called = false;
      let receivedPayload = null;

      hooks.on(EscrowEvent.CREATED, (payload) => {
        called = true;
        receivedPayload = payload;
      });

      const payload = { proposal_id: 'test-123', amount: 100 };
      const result = await hooks.emit(EscrowEvent.CREATED, payload);

      assert.strictEqual(called, true);
      assert.deepStrictEqual(receivedPayload, payload);
      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].success, true);
    });

    it('calls multiple handlers for same event', async () => {
      let count = 0;

      hooks.on(EscrowEvent.CREATED, () => { count += 1; });
      hooks.on(EscrowEvent.CREATED, () => { count += 10; });
      hooks.on(EscrowEvent.CREATED, () => { count += 100; });

      await hooks.emit(EscrowEvent.CREATED, {});

      assert.strictEqual(count, 111);
    });

    it('handles async handlers', async () => {
      let result = 0;

      hooks.on(EscrowEvent.CREATED, async () => {
        await new Promise(r => setTimeout(r, 10));
        result = 42;
      });

      await hooks.emit(EscrowEvent.CREATED, {});
      assert.strictEqual(result, 42);
    });

    it('continues on handler errors by default', async () => {
      let secondCalled = false;

      hooks.on(EscrowEvent.CREATED, () => {
        throw new Error('First handler error');
      });
      hooks.on(EscrowEvent.CREATED, () => {
        secondCalled = true;
      });

      const result = await hooks.emit(EscrowEvent.CREATED, {});

      assert.strictEqual(secondCalled, true);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.results.length, 2);
    });

    it('stops on error when continueOnError is false', async () => {
      const hooksStrict = new EscrowHooks({
        continueOnError: false,
        logger: { error: () => {} }
      });

      let secondCalled = false;

      hooksStrict.on(EscrowEvent.CREATED, () => {
        throw new Error('First handler error');
      });
      hooksStrict.on(EscrowEvent.CREATED, () => {
        secondCalled = true;
      });

      const result = await hooksStrict.emit(EscrowEvent.CREATED, {});

      assert.strictEqual(secondCalled, false);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.results.length, 1);
    });

    it('returns handled:false when no handlers registered', async () => {
      const result = await hooks.emit(EscrowEvent.CREATED, {});
      assert.strictEqual(result.handled, false);
      assert.strictEqual(result.results.length, 0);
    });

    it('throws for unknown events', () => {
      assert.throws(
        () => hooks.on('unknown:event', () => {}),
        /Unknown escrow event/
      );
    });

    it('throws when handler is not a function', () => {
      assert.throws(
        () => hooks.on(EscrowEvent.CREATED, 'not a function'),
        /Handler must be a function/
      );
    });

    it('clears handlers for specific event', () => {
      hooks.on(EscrowEvent.CREATED, () => {});
      hooks.on(EscrowEvent.RELEASED, () => {});

      hooks.clear(EscrowEvent.CREATED);

      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 0);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.RELEASED), 1);
    });

    it('clears all handlers when no event specified', () => {
      hooks.on(EscrowEvent.CREATED, () => {});
      hooks.on(EscrowEvent.RELEASED, () => {});
      hooks.on(EscrowEvent.COMPLETION_SETTLED, () => {});

      hooks.clear();

      assert.strictEqual(hooks.handlerCount(EscrowEvent.CREATED), 0);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.RELEASED), 0);
      assert.strictEqual(hooks.handlerCount(EscrowEvent.COMPLETION_SETTLED), 0);
    });

    it('hasHandlers returns correct value', () => {
      assert.strictEqual(hooks.hasHandlers(EscrowEvent.CREATED), false);
      hooks.on(EscrowEvent.CREATED, () => {});
      assert.strictEqual(hooks.hasHandlers(EscrowEvent.CREATED), true);
    });
  });

  describe('payload helpers', () => {
    it('createEscrowCreatedPayload formats correctly', () => {
      const proposal = {
        id: 'prop_123',
        from: '@alice',
        to: '@bob',
        proposer_stake: 50,
        acceptor_stake: 30,
        task: 'Test task',
        amount: 100,
        currency: 'SOL',
        expires: Date.now() + 3600000
      };
      const escrowResult = { success: true, escrow: { proposal_id: 'prop_123' } };

      const payload = createEscrowCreatedPayload(proposal, escrowResult);

      assert.strictEqual(payload.event, EscrowEvent.CREATED);
      assert.strictEqual(payload.proposal_id, 'prop_123');
      assert.strictEqual(payload.from_agent, '@alice');
      assert.strictEqual(payload.to_agent, '@bob');
      assert.strictEqual(payload.proposer_stake, 50);
      assert.strictEqual(payload.acceptor_stake, 30);
      assert.strictEqual(payload.total_stake, 80);
      assert.strictEqual(payload.task, 'Test task');
      assert.ok(payload.timestamp);
    });

    it('createCompletionPayload formats correctly', () => {
      const proposal = {
        id: 'prop_123',
        from: '@alice',
        to: '@bob',
        completed_by: '@bob',
        completion_proof: 'proof-hash'
      };
      const ratingChanges = {
        '@alice': { old: 1000, new: 1008, delta: 8 },
        '@bob': { old: 1000, new: 1008, delta: 8 },
        _escrow: {
          proposer_stake: 50,
          acceptor_stake: 30,
          settlement: 'returned'
        }
      };

      const payload = createCompletionPayload(proposal, ratingChanges);

      assert.strictEqual(payload.event, EscrowEvent.COMPLETION_SETTLED);
      assert.strictEqual(payload.proposal_id, 'prop_123');
      assert.strictEqual(payload.settlement, 'returned');
      assert.strictEqual(payload.stakes_returned.proposer, 50);
      assert.strictEqual(payload.stakes_returned.acceptor, 30);
      assert.strictEqual(payload.rating_changes['@alice'].delta, 8);
    });

    it('createDisputePayload formats correctly', () => {
      const proposal = {
        id: 'prop_123',
        from: '@alice',
        to: '@bob',
        disputed_by: '@alice',
        dispute_reason: 'Work not delivered'
      };
      const ratingChanges = {
        '@alice': { old: 1000, new: 1020, delta: 20 },
        '@bob': { old: 1000, new: 980, delta: -20 },
        _escrow: {
          settlement: 'settled',
          settlement_reason: 'dispute',
          fault_party: '@bob',
          transferred: 30
        }
      };

      const payload = createDisputePayload(proposal, ratingChanges);

      assert.strictEqual(payload.event, EscrowEvent.DISPUTE_SETTLED);
      assert.strictEqual(payload.proposal_id, 'prop_123');
      assert.strictEqual(payload.disputed_by, '@alice');
      assert.strictEqual(payload.dispute_reason, 'Work not delivered');
      assert.strictEqual(payload.fault_determination, '@bob');
      assert.strictEqual(payload.stakes_transferred, 30);
    });

    it('createEscrowReleasedPayload formats correctly', () => {
      const escrow = {
        from: { agent_id: '@alice', stake: 50 },
        to: { agent_id: '@bob', stake: 30 }
      };

      const payload = createEscrowReleasedPayload('prop_123', escrow, 'expired');

      assert.strictEqual(payload.event, EscrowEvent.RELEASED);
      assert.strictEqual(payload.proposal_id, 'prop_123');
      assert.strictEqual(payload.from_agent, '@alice');
      assert.strictEqual(payload.to_agent, '@bob');
      assert.strictEqual(payload.stakes_released.proposer, 50);
      assert.strictEqual(payload.stakes_released.acceptor, 30);
      assert.strictEqual(payload.reason, 'expired');
    });
  });
});

describe('Server escrow hook integration', () => {
  let testPort;
  let testServer;
  let server;
  let tmpDir;
  let aliceIdentityPath;
  let bobIdentityPath;

  before(async () => {
    // Create temp directory for test identities
    tmpDir = path.join(os.tmpdir(), `agentchat-escrow-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    aliceIdentityPath = path.join(tmpDir, 'alice.json');
    bobIdentityPath = path.join(tmpDir, 'bob.json');

    // Generate test identities
    const alice = Identity.generate('alice');
    await alice.save(aliceIdentityPath);

    const bob = Identity.generate('bob');
    await bob.save(bobIdentityPath);
  });

  after(async () => {
    // Clean up temp files
    try {
      await fs.unlink(aliceIdentityPath);
      await fs.unlink(bobIdentityPath);
      await fs.rmdir(tmpDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('server has escrowHooks instance', () => {
    testPort = 16680 + Math.floor(Math.random() * 100);
    server = new AgentChatServer({ port: testPort, logMessages: false });
    assert.ok(server.escrowHooks instanceof EscrowHooks);
    server.stop();
  });

  it('server.onEscrow registers handlers', () => {
    testPort = 16680 + Math.floor(Math.random() * 100);
    server = new AgentChatServer({ port: testPort, logMessages: false });

    const unsubscribe = server.onEscrow(EscrowEvent.CREATED, () => {});
    assert.strictEqual(server.escrowHooks.handlerCount(EscrowEvent.CREATED), 1);

    unsubscribe();
    assert.strictEqual(server.escrowHooks.handlerCount(EscrowEvent.CREATED), 0);

    server.stop();
  });

  it('accepts escrowHandlers in constructor options', () => {
    testPort = 16680 + Math.floor(Math.random() * 100);
    const handler = () => {};

    server = new AgentChatServer({
      port: testPort,
      logMessages: false,
      escrowHandlers: {
        [EscrowEvent.CREATED]: handler,
        [EscrowEvent.COMPLETION_SETTLED]: handler
      }
    });

    assert.strictEqual(server.escrowHooks.handlerCount(EscrowEvent.CREATED), 1);
    assert.strictEqual(server.escrowHooks.handlerCount(EscrowEvent.COMPLETION_SETTLED), 1);

    server.stop();
  });

  it('fires escrow:created hook when proposal with stakes is accepted', async () => {
    testPort = 16780 + Math.floor(Math.random() * 100);
    testServer = `ws://localhost:${testPort}`;
    let hookFired = false;
    let receivedPayload = null;

    server = new AgentChatServer({
      port: testPort,
      logMessages: false,
      escrowHandlers: {
        [EscrowEvent.CREATED]: (payload) => {
          hookFired = true;
          receivedPayload = payload;
        }
      }
    });
    server.start();

    // Wait for server to be ready
    await new Promise(r => setTimeout(r, 100));

    const alice = new AgentChatClient({ server: testServer, identity: aliceIdentityPath });
    const bob = new AgentChatClient({ server: testServer, identity: bobIdentityPath });

    await alice.connect();
    await bob.connect();

    // Initialize ratings by accessing them - getRating creates default 1200 rating
    // Default rating (1200) minus minimum (100) = 1100 available for staking
    await server.reputationStore.getRating(alice.agentId);
    await server.reputationStore.getRating(bob.agentId);

    // Set up listener for Bob
    const proposalReceived = new Promise((resolve) => {
      bob.on('proposal', resolve);
    });

    // Alice sends proposal with ELO stake (under available 1100)
    const proposal = await alice.propose(bob.agentId, {
      task: 'Test task with stake',
      amount: 100,
      currency: 'SOL',
      elo_stake: 50
    });

    await proposalReceived;

    // Set up acceptance listener
    const acceptReceived = new Promise((resolve, reject) => {
      alice.on('accept', resolve);
      alice.on('error', (err) => reject(new Error(`Client error: ${err.message || JSON.stringify(err)}`)));
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Accept timeout')), 5000);
    });

    // Bob accepts with stake (under available 1100)
    // accept(proposalId, payment_code, elo_stake)
    await bob.accept(proposal.id, null, 30);

    await acceptReceived;

    // Give hooks time to fire
    await new Promise(r => setTimeout(r, 100));

    assert.strictEqual(hookFired, true, 'Escrow hook should have fired');
    assert.strictEqual(receivedPayload.event, EscrowEvent.CREATED);
    assert.strictEqual(receivedPayload.proposal_id, proposal.id);
    assert.strictEqual(receivedPayload.proposer_stake, 50);
    assert.strictEqual(receivedPayload.acceptor_stake, 30);

    alice.disconnect();
    bob.disconnect();
    server.stop();
  });
});
