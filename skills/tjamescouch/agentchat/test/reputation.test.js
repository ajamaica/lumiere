/**
 * Tests for ELO-based reputation module
 */

import assert from 'node:assert';
import { afterEach,beforeEach, describe, it } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
  calculateCompletionGain,
  calculateDisputeLoss,
  calculateExpected,
  DEFAULT_RATING,
  ELO_DIVISOR,
  getEffectiveK,
  getKFactor,
  ReputationStore} from '../lib/reputation.js';

// Test directory
const TEST_DIR = path.join(os.tmpdir(), 'agentchat-reputation-test');
const TEST_RATINGS_PATH = path.join(TEST_DIR, 'ratings.json');

describe('ELO Calculations', () => {
  it('calculateExpected returns 0.5 for equal ratings', () => {
    const expected = calculateExpected(1200, 1200);
    assert.strictEqual(expected, 0.5);
  });

  it('calculateExpected returns higher value for higher-rated self', () => {
    const expected = calculateExpected(1400, 1200);
    assert.ok(expected > 0.5);
    assert.ok(expected < 1);
  });

  it('calculateExpected returns lower value for lower-rated self', () => {
    const expected = calculateExpected(1000, 1200);
    assert.ok(expected < 0.5);
    assert.ok(expected > 0);
  });

  it('calculateExpected follows standard ELO formula', () => {
    // 200 point difference should give ~0.76 expected for higher rated
    const expected = calculateExpected(1400, 1200);
    const formula = 1 / (1 + Math.pow(10, (1200 - 1400) / 400));
    assert.strictEqual(expected, formula);
  });

  it('getKFactor returns 32 for new agents', () => {
    assert.strictEqual(getKFactor(0), 32);
    assert.strictEqual(getKFactor(29), 32);
  });

  it('getKFactor returns 24 for intermediate agents', () => {
    assert.strictEqual(getKFactor(30), 24);
    assert.strictEqual(getKFactor(99), 24);
  });

  it('getKFactor returns 16 for established agents', () => {
    assert.strictEqual(getKFactor(100), 16);
    assert.strictEqual(getKFactor(1000), 16);
  });

  it('getEffectiveK returns base K when no amount', () => {
    assert.strictEqual(getEffectiveK(32, 0), 32);
    assert.strictEqual(getEffectiveK(32, null), 32);
  });

  it('getEffectiveK increases K for higher amounts', () => {
    const baseK = 32;
    const withAmount = getEffectiveK(baseK, 100);
    assert.ok(withAmount > baseK);
  });

  it('getEffectiveK caps multiplier at 3x', () => {
    const baseK = 32;
    const massive = getEffectiveK(baseK, 1000000);
    assert.ok(massive <= baseK * 3);
  });

  it('calculateCompletionGain gives more for higher-rated counterparty', () => {
    const gainFromHigher = calculateCompletionGain(1200, 1400, 32);
    const gainFromLower = calculateCompletionGain(1200, 1000, 32);
    assert.ok(gainFromHigher > gainFromLower);
  });

  it('calculateCompletionGain minimum is 1', () => {
    const gain = calculateCompletionGain(2000, 800, 16);
    assert.ok(gain >= 1);
  });

  it('calculateDisputeLoss returns negative value', () => {
    const loss = calculateDisputeLoss(1200, 1200, 32);
    assert.ok(loss < 0);
  });

  it('calculateDisputeLoss is larger when expected to succeed', () => {
    const lossWhenFavored = calculateDisputeLoss(1400, 1200, 32);
    const lossWhenUnderdog = calculateDisputeLoss(1000, 1200, 32);
    // Favored player loses more (more negative)
    assert.ok(lossWhenFavored < lossWhenUnderdog);
  });
});

describe('ReputationStore', () => {
  let store;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    try {
      await fs.unlink(TEST_RATINGS_PATH);
    } catch {
      // File doesn't exist
    }
    store = new ReputationStore(TEST_RATINGS_PATH);
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('getRating returns default for new agent', async () => {
    const rating = await store.getRating('@newagent');
    assert.strictEqual(rating.rating, DEFAULT_RATING);
    assert.strictEqual(rating.transactions, 0);
    assert.strictEqual(rating.isNew, true);
  });

  it('getRating normalizes agent ID', async () => {
    const withAt = await store.getRating('@agent1');
    const withoutAt = await store.getRating('agent1');
    assert.strictEqual(withAt.agentId, withoutAt.agentId);
  });

  it('processCompletion increases both ratings', async () => {
    const receipt = {
      type: 'COMPLETE',
      proposal: {
        from: '@agent1',
        to: '@agent2',
        amount: 10
      }
    };

    const changes = await store.processCompletion(receipt);

    assert.ok(changes['@agent1'].change > 0);
    assert.ok(changes['@agent2'].change > 0);
    assert.strictEqual(changes['@agent1'].newRating, DEFAULT_RATING + changes['@agent1'].change);
    assert.strictEqual(changes['@agent2'].newRating, DEFAULT_RATING + changes['@agent2'].change);
  });

  it('processCompletion increments transaction count', async () => {
    const receipt = {
      type: 'COMPLETE',
      proposal: { from: '@agent1', to: '@agent2' }
    };

    await store.processCompletion(receipt);

    const rating1 = await store.getRating('@agent1');
    const rating2 = await store.getRating('@agent2');

    assert.strictEqual(rating1.transactions, 1);
    assert.strictEqual(rating2.transactions, 1);
  });

  it('processDispute with disputed_by penalizes counterparty', async () => {
    const receipt = {
      type: 'DISPUTE',
      proposal: { from: '@agent1', to: '@agent2' },
      disputed_by: '@agent1' // agent1 disputed, so agent2 is at fault
    };

    const changes = await store.processDispute(receipt);

    // Agent2 (at fault) should lose rating
    assert.ok(changes['@agent2'].change < 0);
    // Agent1 (winner) should gain some
    assert.ok(changes['@agent1'].change > 0);
  });

  it('processDispute without disputed_by penalizes both', async () => {
    const receipt = {
      type: 'DISPUTE',
      proposal: { from: '@agent1', to: '@agent2' }
      // No disputed_by = mutual fault
    };

    const changes = await store.processDispute(receipt);

    assert.ok(changes['@agent1'].change < 0);
    assert.ok(changes['@agent2'].change < 0);
  });

  it('updateRatings routes to correct handler', async () => {
    const completeReceipt = {
      type: 'COMPLETE',
      proposal: { from: '@agent1', to: '@agent2' }
    };

    const disputeReceipt = {
      type: 'DISPUTE',
      proposal: { from: '@agent3', to: '@agent4' }
    };

    const completeChanges = await store.updateRatings(completeReceipt);
    const disputeChanges = await store.updateRatings(disputeReceipt);

    assert.ok(completeChanges['@agent1'].change > 0); // Completion = gain
    assert.ok(disputeChanges['@agent3'].change < 0);  // Dispute = loss
  });

  it('getLeaderboard returns sorted results', async () => {
    // Create some ratings
    await store.processCompletion({
      type: 'COMPLETE',
      proposal: { from: '@agent1', to: '@agent2', amount: 100 }
    });
    await store.processCompletion({
      type: 'COMPLETE',
      proposal: { from: '@agent1', to: '@agent3', amount: 100 }
    });

    const leaderboard = await store.getLeaderboard(10);

    assert.ok(leaderboard.length > 0);
    // Should be sorted descending
    for (let i = 1; i < leaderboard.length; i++) {
      assert.ok(leaderboard[i - 1].rating >= leaderboard[i].rating);
    }
  });

  it('recalculateFromReceipts rebuilds ratings', async () => {
    const receipts = [
      { type: 'COMPLETE', proposal: { from: '@a', to: '@b' }, completed_at: 1000 },
      { type: 'COMPLETE', proposal: { from: '@b', to: '@c' }, completed_at: 2000 },
      { type: 'COMPLETE', proposal: { from: '@a', to: '@c' }, completed_at: 3000 }
    ];

    await store.recalculateFromReceipts(receipts);

    const ratingA = await store.getRating('@a');
    const ratingB = await store.getRating('@b');
    const ratingC = await store.getRating('@c');

    assert.strictEqual(ratingA.transactions, 2);
    assert.strictEqual(ratingB.transactions, 2);
    assert.strictEqual(ratingC.transactions, 2);
  });

  it('getStats returns correct statistics', async () => {
    await store.processCompletion({
      type: 'COMPLETE',
      proposal: { from: '@agent1', to: '@agent2' }
    });

    const stats = await store.getStats();

    assert.strictEqual(stats.totalAgents, 2);
    assert.strictEqual(stats.totalTransactions, 2); // Each agent gets 1 transaction
    assert.ok(stats.averageRating >= DEFAULT_RATING); // Both gained
  });

  it('rating floor is 100', async () => {
    // Give an agent a very low rating by losing many disputes
    for (let i = 0; i < 50; i++) {
      await store.processDispute({
        type: 'DISPUTE',
        proposal: { from: '@loser', to: `@winner${i}` },
        disputed_by: `@winner${i}`
      });
    }

    const rating = await store.getRating('@loser');
    assert.ok(rating.rating >= 100);
  });
});

describe('K-factor transitions', () => {
  let store;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    try {
      await fs.unlink(TEST_RATINGS_PATH);
    } catch {
      // File doesn't exist
    }
    store = new ReputationStore(TEST_RATINGS_PATH);
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('agent K-factor decreases as transactions increase', async () => {
    const k1 = await store.getAgentKFactor('@newagent');
    assert.strictEqual(k1, 32);

    // Simulate 30+ transactions
    for (let i = 0; i < 35; i++) {
      await store.processCompletion({
        type: 'COMPLETE',
        proposal: { from: '@newagent', to: `@other${i}` }
      });
    }

    const k2 = await store.getAgentKFactor('@newagent');
    assert.strictEqual(k2, 24);
  });
});

describe('ELO Staking', () => {
  let store;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    try {
      await fs.unlink(TEST_RATINGS_PATH);
    } catch {
      // File doesn't exist
    }
    store = new ReputationStore(TEST_RATINGS_PATH);
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('rejects stake exceeding available ELO', async () => {
    // New agent has 1200 rating, minimum floor is 100
    // Available = 1200 - 100 = 1100
    const result = await store.canStake('@agent1', 1200);
    assert.strictEqual(result.canStake, false);
    assert.ok(result.reason.includes('Insufficient ELO'));
  });

  it('rejects stake that would drop below minimum rating', async () => {
    // Available is rating - 100 (minimum floor)
    // For new agent: 1200 - 100 = 1100
    const available = await store.getAvailableRating('@agent1');
    assert.strictEqual(available, 1100);

    // Trying to stake exactly available should work
    const canStakeAvailable = await store.canStake('@agent1', 1100);
    assert.strictEqual(canStakeAvailable.canStake, true);

    // Trying to stake more than available should fail
    const canStakeMore = await store.canStake('@agent1', 1101);
    assert.strictEqual(canStakeMore.canStake, false);
  });

  it('allows multiple concurrent stakes', async () => {
    // Create first escrow with 500 stake
    const result1 = await store.createEscrow(
      'prop_1',
      { agent_id: '@agent1', stake: 500 },
      { agent_id: '@agent2', stake: 0 }
    );
    assert.strictEqual(result1.success, true);

    // Agent1 should have 500 escrowed
    const escrowed = store.getEscrowedAmount('@agent1');
    assert.strictEqual(escrowed, 500);

    // Available should now be 1200 - 500 - 100 = 600
    const available = await store.getAvailableRating('@agent1');
    assert.strictEqual(available, 600);

    // Create second escrow with another 300 stake
    const result2 = await store.createEscrow(
      'prop_2',
      { agent_id: '@agent1', stake: 300 },
      { agent_id: '@agent3', stake: 0 }
    );
    assert.strictEqual(result2.success, true);

    // Total escrowed should be 800
    const totalEscrowed = store.getEscrowedAmount('@agent1');
    assert.strictEqual(totalEscrowed, 800);
  });

  it('creates escrow on accept', async () => {
    const result = await store.createEscrow(
      'prop_test',
      { agent_id: '@alice', stake: 50 },
      { agent_id: '@bob', stake: 50 }
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.escrow);
    assert.strictEqual(result.escrow.status, 'active');
    assert.strictEqual(result.escrow.from.stake, 50);
    assert.strictEqual(result.escrow.to.stake, 50);
  });

  it('returns stakes on completion', async () => {
    // Create escrow
    await store.createEscrow(
      'prop_complete',
      { agent_id: '@alice', stake: 100 },
      { agent_id: '@bob', stake: 100 }
    );

    // Process completion
    const changes = await store.processCompletion({
      type: 'COMPLETE',
      proposal_id: 'prop_complete',
      proposal: { from: '@alice', to: '@bob' }
    });

    // Check escrow was settled
    const escrow = store.getEscrow('prop_complete');
    assert.strictEqual(escrow.status, 'settled');
    assert.strictEqual(escrow.settlement_reason, 'completed');

    // Check stakes were returned (not deducted from ratings)
    assert.ok(changes._escrow);
    assert.strictEqual(changes._escrow.settlement, 'returned');
    assert.strictEqual(changes._escrow.proposer_stake, 100);
    assert.strictEqual(changes._escrow.acceptor_stake, 100);
  });

  it('transfers stake to winner on dispute', async () => {
    // Create escrow
    await store.createEscrow(
      'prop_dispute',
      { agent_id: '@alice', stake: 100 },
      { agent_id: '@bob', stake: 50 }
    );

    // Process dispute where bob disputed (alice at fault)
    const changes = await store.processDispute({
      type: 'DISPUTE',
      proposal_id: 'prop_dispute',
      proposal: { from: '@alice', to: '@bob' },
      disputed_by: '@bob'
    });

    // Check escrow was settled
    const escrow = store.getEscrow('prop_dispute');
    assert.strictEqual(escrow.status, 'settled');
    assert.strictEqual(escrow.settlement_reason, 'disputed');

    // Check stake was transferred
    assert.ok(changes._escrow);
    assert.strictEqual(changes._escrow.settlement, 'transferred');
    assert.strictEqual(changes._escrow.transferred_to, '@bob');
    assert.strictEqual(changes._escrow.transferred_amount, 100);
  });

  it('burns both stakes on mutual fault', async () => {
    // Create escrow
    await store.createEscrow(
      'prop_mutual',
      { agent_id: '@alice', stake: 75 },
      { agent_id: '@bob', stake: 75 }
    );

    // Process dispute without disputed_by (mutual fault)
    const changes = await store.processDispute({
      type: 'DISPUTE',
      proposal_id: 'prop_mutual',
      proposal: { from: '@alice', to: '@bob' }
      // No disputed_by = mutual fault
    });

    // Check escrow was settled
    const escrow = store.getEscrow('prop_mutual');
    assert.strictEqual(escrow.status, 'settled');

    // Check both stakes burned
    assert.ok(changes._escrow);
    assert.strictEqual(changes._escrow.settlement, 'burned');
    assert.strictEqual(changes._escrow.burned_amount, 150);
  });

  it('handles asymmetric stakes', async () => {
    // Alice stakes 100, Bob stakes 0
    const result = await store.createEscrow(
      'prop_asym',
      { agent_id: '@alice', stake: 100 },
      { agent_id: '@bob', stake: 0 }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.escrow.from.stake, 100);
    assert.strictEqual(result.escrow.to.stake, 0);

    // Only alice should have escrowed funds
    const aliceEscrowed = store.getEscrowedAmount('@alice');
    const bobEscrowed = store.getEscrowedAmount('@bob');
    assert.strictEqual(aliceEscrowed, 100);
    assert.strictEqual(bobEscrowed, 0);
  });

  it('releases stakes on expiration', async () => {
    // Create escrow
    await store.createEscrow(
      'prop_expire',
      { agent_id: '@alice', stake: 50 },
      { agent_id: '@bob', stake: 50 },
      Date.now() + 1000 // expires in 1 second
    );

    // Release the escrow (simulating expiration)
    const releaseResult = store.releaseEscrow('prop_expire');

    assert.strictEqual(releaseResult.released, true);
    assert.strictEqual(releaseResult.escrow.status, 'released');
    assert.strictEqual(releaseResult.escrow.settlement_reason, 'expired');

    // Stakes should no longer be escrowed
    const aliceEscrowed = store.getEscrowedAmount('@alice');
    const bobEscrowed = store.getEscrowedAmount('@bob');
    assert.strictEqual(aliceEscrowed, 0);
    assert.strictEqual(bobEscrowed, 0);
  });

  it('includes stakes in completion result', async () => {
    // Create escrow with stakes
    await store.createEscrow(
      'prop_receipt',
      { agent_id: '@alice', stake: 25 },
      { agent_id: '@bob', stake: 30 }
    );

    // Process completion
    const changes = await store.processCompletion({
      type: 'COMPLETE',
      proposal_id: 'prop_receipt',
      proposal: { from: '@alice', to: '@bob' }
    });

    // Verify escrow info is included
    assert.ok(changes._escrow);
    assert.strictEqual(changes._escrow.proposer_stake, 25);
    assert.strictEqual(changes._escrow.acceptor_stake, 30);
  });
});
