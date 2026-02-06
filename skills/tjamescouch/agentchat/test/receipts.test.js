/**
 * Tests for receipts module
 */

import assert from 'node:assert';
import { afterEach,beforeEach, describe, it } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
  appendReceipt,
  exportReceipts,
  filterByAgent,
  getCounterparties,
  getStats,
  readReceipts,
  ReceiptStore,
  shouldStoreReceipt} from '../lib/receipts.js';

// Test directory
const TEST_DIR = path.join(os.tmpdir(), 'agentchat-receipts-test');
const TEST_RECEIPTS_PATH = path.join(TEST_DIR, 'receipts.jsonl');

// Sample test receipts
const sampleReceipts = [
  {
    type: 'COMPLETE',
    proposal_id: 'prop_001',
    completed_by: '@agent1',
    completed_at: 1700000000000,
    proof: 'tx:abc123',
    proposal: {
      from: '@agent1',
      to: '@agent2',
      task: 'Test task 1',
      amount: 0.05,
      currency: 'SOL'
    },
    sig: 'sig1'
  },
  {
    type: 'COMPLETE',
    proposal_id: 'prop_002',
    completed_by: '@agent2',
    completed_at: 1700001000000,
    proof: 'tx:def456',
    proposal: {
      from: '@agent2',
      to: '@agent3',
      task: 'Test task 2',
      amount: 100,
      currency: 'USDC'
    },
    sig: 'sig2'
  }
];

describe('Receipts', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Clean up any existing file
    try {
      await fs.unlink(TEST_RECEIPTS_PATH);
    } catch {
      // File doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  });

  it('appendReceipt creates file and adds receipt', async () => {
    const receipt = sampleReceipts[0];
    const stored = await appendReceipt(receipt, TEST_RECEIPTS_PATH);

    assert.ok(stored.stored_at, 'Should add stored_at timestamp');
    assert.strictEqual(stored.proposal_id, receipt.proposal_id);

    // Verify file was created
    const content = await fs.readFile(TEST_RECEIPTS_PATH, 'utf-8');
    const parsed = JSON.parse(content.trim());
    assert.strictEqual(parsed.proposal_id, receipt.proposal_id);
  });

  it('readReceipts returns empty array when file does not exist', async () => {
    const receipts = await readReceipts(path.join(TEST_DIR, 'nonexistent.jsonl'));
    assert.deepStrictEqual(receipts, []);
  });

  it('readReceipts parses JSONL file correctly', async () => {
    // Write test receipts
    for (const r of sampleReceipts) {
      await appendReceipt(r, TEST_RECEIPTS_PATH);
    }

    const receipts = await readReceipts(TEST_RECEIPTS_PATH);
    assert.strictEqual(receipts.length, 2);
    assert.strictEqual(receipts[0].proposal_id, 'prop_001');
    assert.strictEqual(receipts[1].proposal_id, 'prop_002');
  });

  it('filterByAgent returns receipts where agent is party', () => {
    const filtered = filterByAgent(sampleReceipts, '@agent2');
    assert.strictEqual(filtered.length, 2); // agent2 is in both

    const filtered2 = filterByAgent(sampleReceipts, '@agent1');
    assert.strictEqual(filtered2.length, 1); // agent1 only in first

    const filtered3 = filterByAgent(sampleReceipts, '@agent3');
    assert.strictEqual(filtered3.length, 1); // agent3 only in second
  });

  it('filterByAgent handles agent IDs with or without @', () => {
    const withAt = filterByAgent(sampleReceipts, '@agent1');
    const withoutAt = filterByAgent(sampleReceipts, 'agent1');
    assert.strictEqual(withAt.length, withoutAt.length);
  });

  it('getCounterparties returns unique counterparties', () => {
    const counterparties = getCounterparties(sampleReceipts, '@agent2');
    assert.ok(counterparties.includes('@agent1'));
    assert.ok(counterparties.includes('@agent3'));
    assert.ok(!counterparties.includes('@agent2'));
  });

  it('getStats returns correct statistics', () => {
    const stats = getStats(sampleReceipts);

    assert.strictEqual(stats.count, 2);
    assert.ok(stats.dateRange);
    assert.ok(stats.currencies.SOL);
    assert.ok(stats.currencies.USDC);
    assert.strictEqual(stats.currencies.SOL.count, 1);
    assert.strictEqual(stats.currencies.SOL.totalAmount, 0.05);
  });

  it('getStats filters by agent when provided', () => {
    const stats = getStats(sampleReceipts, '@agent1');

    assert.strictEqual(stats.count, 1);
    assert.ok(stats.counterparties.includes('@agent2'));
  });

  it('exportReceipts exports as JSON', () => {
    const output = exportReceipts(sampleReceipts, 'json');
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.length, 2);
  });

  it('exportReceipts exports as YAML-like format', () => {
    const output = exportReceipts(sampleReceipts, 'yaml');
    assert.ok(output.includes('receipts:'));
    assert.ok(output.includes('proposal_id: prop_001'));
  });

  it('shouldStoreReceipt returns true when agent is party', () => {
    const completeMsg = sampleReceipts[0];

    assert.ok(shouldStoreReceipt(completeMsg, '@agent1'));
    assert.ok(shouldStoreReceipt(completeMsg, '@agent2'));
    assert.ok(shouldStoreReceipt(completeMsg, 'agent1')); // without @
    assert.ok(!shouldStoreReceipt(completeMsg, '@agent3'));
  });

  it('ReceiptStore loads and manages receipts', async () => {
    const store = new ReceiptStore(TEST_RECEIPTS_PATH);

    // Initially empty
    const initial = await store.getAll();
    assert.strictEqual(initial.length, 0);

    // Add receipts
    await store.add(sampleReceipts[0]);
    await store.add(sampleReceipts[1]);

    // Should have both
    const all = await store.getAll();
    assert.strictEqual(all.length, 2);

    // Get stats
    const stats = await store.getStats();
    assert.strictEqual(stats.count, 2);
  });
});
