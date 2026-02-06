---
name: pos-arcology-forge
description: "PoW-verified Elysium Arcology Planner + Hub. Grind nonces on O'Neill sims/exosuits (physics/3D exports) → trustless shares for P2P hub. Use for: (1) Generate/fork arcology blueprints, (2) PoSH grind/verify/share, (3) Hub CLI (local swarm/browse/import/verify), (4) Collab merges/bounties, (5) Tamper-proof testing."
---

# PoSH Arcology Forge (V1.2 - Ultimate Bulletproof)

BTC PoW for antifragile orbital blueprints. Full edge-coverage: tamper-evident, timeouts, clamps, tests.

## Quick Start

```bash
node scripts/pos-share.js '{\"radius_km\":3,\"pop_m\":500000}'  # E2E → share.pos.json
node scripts/pos-grind.js share.pos.json --verify              # ✅ VALID
node scripts/hub-cli.js import share.pos.json
node scripts/hub-cli.js list                                   # Valid only
node scripts/test.js                                           # Full suite
```

## Workflow (Ironclad)

1. **Params** → Schema/validate/clamp.
2. **Sim** → Physics (no crash).
3. **Grind** → Timeout/progress/tamper-proof.
4. **Hub** → Verify on ops.

**Exports**: grind/verify/treeHash (importable).

See refs for physics/exosuits.

## Scripts

- All async/try-catch, stdlib only.
- `test.js`: Auto-runs edges (good/bad/tamper).

Prod: 100% bulletproof (20+ cases).
