/**
 * Key Rotation Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import fs from 'fs';
import os from 'os';
import path from 'path';

import { Identity } from '../lib/identity.js';

describe('Key Rotation', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-rotation-test-'));
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('can rotate to a new keypair', () => {
    const identity = Identity.generate('test-agent');
    const oldPubkey = identity.pubkey;
    const oldAgentId = identity.getAgentId();

    const record = identity.rotate();

    assert.notStrictEqual(identity.pubkey, oldPubkey, 'Pubkey should change');
    assert.notStrictEqual(identity.getAgentId(), oldAgentId, 'Agent ID should change');
    assert.strictEqual(record.old_pubkey, oldPubkey, 'Record should contain old pubkey');
    assert.strictEqual(record.new_pubkey, identity.pubkey, 'Record should contain new pubkey');
    assert.ok(record.signature, 'Record should have signature');
    assert.ok(record.timestamp, 'Record should have timestamp');
    assert.strictEqual(identity.rotations.length, 1, 'Should have 1 rotation');
  });

  it('rotation record is verifiable', () => {
    const identity = Identity.generate('test-agent');
    const record = identity.rotate();

    const isValid = Identity.verifyRotation(record);
    assert.strictEqual(isValid, true, 'Rotation should be verifiable');
  });

  it('detects invalid rotation signature', () => {
    const identity = Identity.generate('test-agent');
    const record = identity.rotate();

    // Tamper with the signature
    record.signature = 'invalid-signature';

    const isValid = Identity.verifyRotation(record);
    assert.strictEqual(isValid, false, 'Tampered rotation should fail verification');
  });

  it('detects tampered rotation content', () => {
    const identity = Identity.generate('test-agent');
    const record = identity.rotate();

    // Tamper with the timestamp (use a clearly different value)
    record.timestamp = '1999-01-01T00:00:00.000Z';

    const isValid = Identity.verifyRotation(record);
    assert.strictEqual(isValid, false, 'Tampered content should fail verification');
  });

  it('can perform multiple rotations', () => {
    const identity = Identity.generate('test-agent');
    const originalAgentId = identity.getAgentId();

    identity.rotate();
    identity.rotate();
    identity.rotate();

    assert.strictEqual(identity.rotations.length, 3, 'Should have 3 rotations');
    assert.strictEqual(identity.getOriginalAgentId(), originalAgentId, 'Original ID should be preserved');
  });

  it('verifies rotation chain', () => {
    const identity = Identity.generate('test-agent');

    identity.rotate();
    identity.rotate();

    const result = identity.verifyRotationChain();
    assert.strictEqual(result.valid, true, 'Chain should be valid');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
  });

  it('detects broken rotation chain', () => {
    const identity = Identity.generate('test-agent');
    identity.rotate();
    identity.rotate();

    // Break the chain by tampering with a signature
    identity.rotations[0].signature = 'broken';

    const result = identity.verifyRotationChain();
    assert.strictEqual(result.valid, false, 'Chain should be invalid');
    assert.ok(result.errors.length > 0, 'Should have errors');
  });

  it('saves and loads rotations', async () => {
    const filePath = path.join(tempDir, 'rotated-identity.json');
    const identity = Identity.generate('test-agent');
    const originalAgentId = identity.getAgentId();

    identity.rotate();
    identity.rotate();

    await identity.save(filePath);

    const loaded = await Identity.load(filePath);
    assert.strictEqual(loaded.rotations.length, 2, 'Should preserve rotations');
    assert.strictEqual(loaded.getOriginalAgentId(), originalAgentId, 'Should preserve original ID');

    const result = loaded.verifyRotationChain();
    assert.strictEqual(result.valid, true, 'Loaded chain should be valid');
  });

  it('exports include rotations', () => {
    const identity = Identity.generate('test-agent');
    identity.rotate();

    const exported = identity.export();
    assert.ok(exported.rotations, 'Export should include rotations');
    assert.strictEqual(exported.rotations.length, 1, 'Export should have 1 rotation');
    assert.ok(!exported.privkey, 'Export should not include private key');
  });

  it('getOriginalPubkey returns first pubkey', () => {
    const identity = Identity.generate('test-agent');
    const originalPubkey = identity.pubkey;

    identity.rotate();
    identity.rotate();

    assert.strictEqual(identity.getOriginalPubkey(), originalPubkey, 'Should return original pubkey');
  });

  it('getOriginalPubkey returns current pubkey if no rotations', () => {
    const identity = Identity.generate('test-agent');
    assert.strictEqual(identity.getOriginalPubkey(), identity.pubkey, 'Should return current pubkey');
  });

  it('requires private key to rotate', () => {
    const identity = Identity.generate('test-agent');
    const exported = identity.export();

    // Create identity without private key
    const publicOnly = new Identity(exported);

    assert.throws(() => {
      publicOnly.rotate();
    }, /Private key not available/);
  });

  it('chain verification passes with no rotations', () => {
    const identity = Identity.generate('test-agent');
    const result = identity.verifyRotationChain();
    assert.strictEqual(result.valid, true, 'No rotations should be valid');
  });
});
