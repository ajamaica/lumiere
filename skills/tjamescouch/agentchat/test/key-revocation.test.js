/**
 * Key Revocation Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import fs from 'fs';
import os from 'os';
import path from 'path';

import { Identity } from '../lib/identity.js';

describe('Key Revocation', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentchat-revocation-test-'));
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('can generate a revocation notice', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    assert.strictEqual(notice.type, 'REVOCATION');
    assert.strictEqual(notice.pubkey, identity.pubkey);
    assert.strictEqual(notice.agent_id, identity.getAgentId());
    assert.strictEqual(notice.reason, 'compromised');
    assert.ok(notice.timestamp);
    assert.ok(notice.signature);
    assert.ok(notice.fingerprint);
  });

  it('uses default reason if not specified', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke();

    assert.strictEqual(notice.reason, 'revoked');
  });

  it('revocation notice is verifiable', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('retired');

    const isValid = Identity.verifyRevocation(notice);
    assert.strictEqual(isValid, true);
  });

  it('detects invalid revocation signature', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    // Tamper with signature
    notice.signature = 'invalid-signature';

    const isValid = Identity.verifyRevocation(notice);
    assert.strictEqual(isValid, false);
  });

  it('detects tampered revocation content', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    // Tamper with reason
    notice.reason = 'different-reason';

    const isValid = Identity.verifyRevocation(notice);
    assert.strictEqual(isValid, false);
  });

  it('detects tampered revocation timestamp', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    // Tamper with timestamp
    notice.timestamp = '1999-01-01T00:00:00.000Z';

    const isValid = Identity.verifyRevocation(notice);
    assert.strictEqual(isValid, false);
  });

  it('rejects non-revocation objects', () => {
    assert.strictEqual(Identity.verifyRevocation(null), false);
    assert.strictEqual(Identity.verifyRevocation({}), false);
    assert.strictEqual(Identity.verifyRevocation({ type: 'OTHER' }), false);
  });

  it('isRevoked checks if pubkey matches', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    assert.strictEqual(Identity.isRevoked(identity.pubkey, notice), true);
    assert.strictEqual(Identity.isRevoked('different-pubkey', notice), false);
  });

  it('isRevoked returns false for invalid notice', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');
    notice.signature = 'invalid';

    assert.strictEqual(Identity.isRevoked(identity.pubkey, notice), false);
  });

  it('includes rotation history in revocation notice', () => {
    const identity = Identity.generate('test-agent');
    identity.rotate();
    identity.rotate();

    const notice = identity.revoke('retired');

    assert.ok(notice.rotations);
    assert.strictEqual(notice.rotations.length, 2);
    assert.ok(notice.original_agent_id);
    assert.notStrictEqual(notice.original_agent_id, notice.agent_id);
  });

  it('omits rotation history if no rotations', () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('retired');

    assert.strictEqual(notice.rotations, undefined);
    assert.strictEqual(notice.original_agent_id, undefined);
  });

  it('requires private key to revoke', () => {
    const identity = Identity.generate('test-agent');
    const exported = identity.export();

    // Create identity without private key
    const publicOnly = new Identity(exported);

    assert.throws(() => {
      publicOnly.revoke('compromised');
    }, /Private key not available/);
  });

  it('revocation notice can be saved and loaded', async () => {
    const identity = Identity.generate('test-agent');
    const notice = identity.revoke('compromised');

    // Save notice to file
    const noticePath = path.join(tempDir, 'revocation.json');
    fs.writeFileSync(noticePath, JSON.stringify(notice, null, 2));

    // Load and verify
    const loaded = JSON.parse(fs.readFileSync(noticePath, 'utf-8'));
    const isValid = Identity.verifyRevocation(loaded);
    assert.strictEqual(isValid, true);
    assert.strictEqual(loaded.reason, 'compromised');
  });
});
