/**
 * AgentChat Identity Unit Tests
 * Run with: node --test test/identity.test.js
 */

import assert from 'node:assert';
import { after,describe, test } from 'node:test';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { Identity, isValidPubkey, pubkeyToAgentId } from '../lib/identity.js';

describe('Identity', () => {
  const testDir = path.join(os.tmpdir(), `agentchat-test-${Date.now()}`);
  const testIdentityPath = path.join(testDir, 'identity.json');

  after(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  test('can generate identity', () => {
    const identity = Identity.generate('test-agent');

    assert.equal(identity.name, 'test-agent');
    assert.ok(identity.pubkey);
    assert.ok(identity.privkey);
    assert.ok(identity.created);
    assert.ok(isValidPubkey(identity.pubkey));
  });

  test('can save and load identity', async () => {
    const identity = Identity.generate('test-agent');
    await identity.save(testIdentityPath);

    const loaded = await Identity.load(testIdentityPath);

    assert.equal(loaded.name, identity.name);
    assert.equal(loaded.pubkey, identity.pubkey);
    assert.equal(loaded.privkey, identity.privkey);
  });

  test('can sign and verify', () => {
    const identity = Identity.generate('test-agent');
    const message = 'hello world';

    const signature = identity.sign(message);
    assert.ok(signature);

    const verified = Identity.verify(message, signature, identity.pubkey);
    assert.ok(verified);

    // Verify fails with wrong message
    const wrongVerify = Identity.verify('wrong message', signature, identity.pubkey);
    assert.ok(!wrongVerify);
  });

  test('fingerprint is consistent', () => {
    const identity = Identity.generate('test-agent');
    const fp1 = identity.getFingerprint();
    const fp2 = identity.getFingerprint();

    assert.equal(fp1, fp2);
    assert.equal(fp1.length, 16);
  });

  test('pubkeyToAgentId generates stable IDs', () => {
    const identity = Identity.generate('test-agent');
    const id1 = pubkeyToAgentId(identity.pubkey);
    const id2 = pubkeyToAgentId(identity.pubkey);

    assert.equal(id1, id2);
    assert.equal(id1.length, 8);
  });

  test('export excludes private key', () => {
    const identity = Identity.generate('test-agent');
    const exported = identity.export();

    assert.equal(exported.name, identity.name);
    assert.equal(exported.pubkey, identity.pubkey);
    assert.equal(exported.privkey, undefined);
  });
});
