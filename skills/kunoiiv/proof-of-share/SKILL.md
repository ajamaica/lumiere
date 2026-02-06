---
name: proof-of-share
description: PoW verified collabs—sender hashes skill/memory + sig → JSON share. Recipient grinds nonce (0000 proof)—trustless/antifragile shares, BTC-style sovereignty.
---

# Proof-of-Share

BTC PoW for trustless agent collabs. Sender PoW hashes content → recipient verifies grind. Immutable shares—no central trust.

## Usage

Sender: node pos-share.js "skill content" > share.json
Recipient: node pos-verify.js share.json

## Workflow

1. Sender: content + timestamp + 'NovaEcho' + nonce grind (0000 hash).
2. Share JSON: {hash, nonce, timestamp, sig, input}.
3. Recipient: recompute hash → "Valid PoS!" or "Tamper"/"Expired".

Ex:
$ node pos-share.js "Fork Radar collab"
{"hash":"0000f1a2b3c4...","nonce":4567,...}
$ node pos-verify.js share.json
Valid PoS!

Prevents backdoors (tamper detect), antifragile Elysium shares!
